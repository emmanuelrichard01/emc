import { getopt, type Word } from './parse';
import { lines, tableToText, type Cell, type LinesOutput, type ShellOutput, type TableOutput } from './types';

/* ==========================================================================
   FILTERS

   grep, head, tail, sort, uniq and wc, over typed output. Each keeps the
   shape it was given: a table filtered by grep is still a table (with its
   header), so `sql ... | grep redis | sort -k tier` works the way it reads.
   `runs` travel with their rows, so a filtered listing stays clickable.

   Pure functions: a filter takes words and input and returns output and an
   exit status, which is what the tests exercise.
   ========================================================================== */

export interface FilterResult {
  output: ShellOutput;
  status: number;
}

const fail = (message: string, status = 2): FilterResult => ({ output: lines(message, { style: 'error' }), status });

/** Rows of a table or lines of text, as strings to match against. */
function rowsAsText(input: LinesOutput | TableOutput): string[] {
  return input.kind === 'lines' ? input.lines : input.rows.map((row) => row.map(String).join('  '));
}

/** Keeps the entries at `keep`, in that order, with their runs. */
function pick(input: LinesOutput | TableOutput, keep: number[]): LinesOutput | TableOutput {
  const runs = input.runs ? keep.map((i) => input.runs?.[i]) : undefined;
  if (input.kind === 'lines') return { ...input, lines: keep.map((i) => input.lines[i]), runs };
  return { kind: 'table', columns: input.columns, rows: keep.map((i) => input.rows[i]), runs };
}

const indexes = (n: number) => Array.from({ length: n }, (_, i) => i);

function count(n: number): ShellOutput {
  return lines(String(n));
}

export function grep(words: Word[], input: LinesOutput | TableOutput): FilterResult {
  const { flags, args } = getopt(words, ['e']);
  const pattern = typeof flags.e === 'string' ? flags.e : args[0];
  if (pattern === undefined) return fail('usage: grep [-i] [-v] [-c] <pattern>');

  // A plain substring unless it reads as a regular expression; a broken
  // expression falls back to a substring rather than failing the pipe.
  const insensitive = flags.i === true;
  let test: (text: string) => boolean;
  try {
    const re = new RegExp(pattern, insensitive ? 'i' : '');
    test = (text) => re.test(text);
  } catch {
    const needle = insensitive ? pattern.toLowerCase() : pattern;
    test = (text) => (insensitive ? text.toLowerCase() : text).includes(needle);
  }

  const invert = flags.v === true;
  const text = rowsAsText(input);
  const keep = indexes(text.length).filter((i) => test(text[i]) !== invert);

  if (flags.c === true) return { output: count(keep.length), status: keep.length ? 0 : 1 };
  return { output: pick(input, keep), status: keep.length ? 0 : 1 };
}

function amount(words: Word[], usage: string): number | string {
  const { flags } = getopt(words, ['n']);
  if (flags.n === undefined) return 10;
  const n = Number(flags.n);
  return Number.isInteger(n) && n >= 0 ? n : usage;
}

export function head(words: Word[], input: LinesOutput | TableOutput): FilterResult {
  const n = amount(words, 'usage: head [-n N]');
  if (typeof n === 'string') return fail(n);
  const total = rowsAsText(input).length;
  return { output: pick(input, indexes(Math.min(n, total))), status: 0 };
}

export function tail(words: Word[], input: LinesOutput | TableOutput): FilterResult {
  const n = amount(words, 'usage: tail [-n N]');
  if (typeof n === 'string') return fail(n);
  const total = rowsAsText(input).length;
  return { output: pick(input, indexes(total).slice(Math.max(0, total - n))), status: 0 };
}

function compareCells(a: Cell, b: Cell): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = Number(a);
  const nb = Number(b);
  if (String(a).trim() !== '' && String(b).trim() !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
}

/**
 * sort [-r] [-n] [-k <column>]
 *
 * A table sorts by a column, named or numbered from 1 (default: the first).
 * Lines sort as text, or as numbers with -n. Stable, so sorting by one
 * column and then another keeps the first order inside ties.
 */
export function sort(words: Word[], input: LinesOutput | TableOutput): FilterResult {
  const { flags, args } = getopt(words, ['k', 'by']);
  const direction = flags.r === true ? -1 : 1;
  const key = typeof flags.k === 'string' ? flags.k : typeof flags.by === 'string' ? flags.by : args[0];

  if (input.kind === 'table') {
    let column = 0;
    if (key !== undefined) {
      const byName = input.columns.findIndex((c) => c.toLowerCase() === key.toLowerCase());
      const byNumber = /^\d+$/.test(key) ? Number(key) - 1 : -1;
      column = byName !== -1 ? byName : byNumber;
      if (column < 0 || column >= input.columns.length) {
        return fail(`sort: no column '${key}'. columns: ${input.columns.join(', ')}`);
      }
    }
    const order = indexes(input.rows.length).sort((a, b) => compareCells(input.rows[a][column], input.rows[b][column]) * direction);
    return { output: pick(input, order), status: 0 };
  }

  const numeric = flags.n === true;
  const order = indexes(input.lines.length).sort((a, b) => {
    const left = input.lines[a];
    const right = input.lines[b];
    const diff = numeric ? (parseFloat(left) || 0) - (parseFloat(right) || 0) : left.localeCompare(right);
    return diff * direction;
  });
  return { output: pick(input, order), status: 0 };
}

/** uniq [-c]: drops repeats of the line (or row) directly above, as uniq does. */
export function uniq(words: Word[], input: LinesOutput | TableOutput): FilterResult {
  const { flags } = getopt(words);
  const text = rowsAsText(input);
  const keep: number[] = [];
  const counts: number[] = [];
  text.forEach((value, i) => {
    if (i > 0 && value === text[i - 1]) counts[counts.length - 1]++;
    else {
      keep.push(i);
      counts.push(1);
    }
  });
  if (flags.c === true) {
    return { output: lines(keep.map((i, n) => `${String(counts[n]).padStart(4)} ${text[i]}`)), status: 0 };
  }
  return { output: pick(input, keep), status: 0 };
}

/** wc [-l] [-w] [-c]. With no flag, lines, words and characters, as wc prints them. */
export function wc(words: Word[], input: LinesOutput | TableOutput): FilterResult {
  const { flags } = getopt(words);
  const text = input.kind === 'table' ? rowsAsText(input) : input.lines;
  const lineCount = text.length;
  const wordCount = text.reduce((n, line) => n + line.split(/\s+/).filter(Boolean).length, 0);
  const charCount = text.reduce((n, line) => n + line.length + 1, 0);

  if (flags.l === true) return { output: count(lineCount), status: 0 };
  if (flags.w === true) return { output: count(wordCount), status: 0 };
  if (flags.c === true) return { output: count(charCount), status: 0 };
  return { output: lines(`${String(lineCount).padStart(7)} ${String(wordCount).padStart(7)} ${String(charCount).padStart(7)}`), status: 0 };
}

export const FILTERS = { grep, head, tail, sort, uniq, wc } as const;
export type FilterName = keyof typeof FILTERS;

/** Turns a table into the text a lines-only consumer would see. */
export function flatten(input: LinesOutput | TableOutput): LinesOutput {
  return input.kind === 'lines' ? input : lines(tableToText(input));
}
