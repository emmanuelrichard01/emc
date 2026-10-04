/* ==========================================================================
   SHELL PARSER

   A command line is a sequence of pipelines joined by `&&`; a pipeline is
   commands joined by `|`. Words split on spaces, except inside single or
   double quotes. A backslash escapes the next character when that character
   means something to the shell (space, quote, backslash, `|`, `&`), and is
   kept as itself otherwise, so `\d` reaches the command as `\d`.

   Each command keeps the exact text it was typed with (`text`, and `raw`
   for everything after the name), because `sql` needs its string literals
   untouched: quotes are SQL's business there, not the shell's.

   Flags are not decided here. Which flags take a value is the command's
   knowledge, so `getopt` is a helper each command calls with its own list.
   ========================================================================== */

export interface Word {
  value: string;
  /** Any part was quoted. A quoted `-x` is an argument, never a flag. */
  quoted: boolean;
  start: number;
  end: number;
}

export interface ParsedCommand {
  /** Lowercased first word. */
  name: string;
  /** Words after the name, quotes removed. */
  words: Word[];
  /** Text after the name, exactly as typed (trimmed). */
  raw: string;
  /** The whole command, exactly as typed (trimmed). */
  text: string;
}

export interface Pipeline {
  commands: ParsedCommand[];
}

export type ParseResult = { ok: true; pipelines: Pipeline[] } | { ok: false; error: string };

const ESCAPABLE = new Set([' ', '"', "'", '\\', '|', '&']);

type Token = { type: 'word'; word: Word } | { type: 'pipe'; at: number } | { type: 'and'; at: number };

export function tokenize(line: string): { ok: true; tokens: Token[] } | { ok: false; error: string } {
  const tokens: Token[] = [];
  let i = 0;
  let current: Word | null = null;

  const flush = () => {
    if (current) tokens.push({ type: 'word', word: current });
    current = null;
  };
  const open = (at: number): Word => (current ??= { value: '', quoted: false, start: at, end: at });

  while (i < line.length) {
    const ch = line[i];

    if (ch === ' ' || ch === '\t') {
      flush();
      i++;
      continue;
    }
    if (ch === '|') {
      flush();
      if (line[i + 1] === '|') return { ok: false, error: "'||' is not supported. use '&&' to run one command after another" };
      tokens.push({ type: 'pipe', at: i });
      i++;
      continue;
    }
    if (ch === '&') {
      flush();
      if (line[i + 1] !== '&') return { ok: false, error: "a single '&' is not supported. use '&&' to run one command after another" };
      tokens.push({ type: 'and', at: i });
      i += 2;
      continue;
    }
    if (ch === '\\') {
      const next = line[i + 1];
      const word = open(i);
      if (next !== undefined && ESCAPABLE.has(next)) {
        word.value += next;
        i += 2;
      } else {
        word.value += ch;
        i++;
      }
      word.end = i;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const word = open(i);
      let j = i + 1;
      let closed = false;
      while (j < line.length) {
        const c = line[j];
        if (c === ch) {
          closed = true;
          break;
        }
        // Inside double quotes a backslash still escapes a double quote or a backslash.
        if (ch === '"' && c === '\\' && (line[j + 1] === '"' || line[j + 1] === '\\')) {
          word.value += line[j + 1];
          j += 2;
          continue;
        }
        word.value += c;
        j++;
      }
      if (!closed) return { ok: false, error: `unterminated ${ch === '"' ? 'double' : 'single'} quote` };
      word.quoted = true;
      i = j + 1;
      word.end = i;
      continue;
    }
    const word = open(i);
    word.value += ch;
    i++;
    word.end = i;
  }
  flush();
  return { ok: true, tokens };
}

export function parseLine(line: string): ParseResult {
  const lexed = tokenize(line);
  if (!lexed.ok) return lexed;

  const pipelines: Pipeline[] = [];
  let commands: ParsedCommand[] = [];
  let words: Word[] = [];

  const endCommand = (op: string): string | null => {
    if (!words.length) return `missing command ${op === 'end' ? 'at the end' : `before '${op}'`}`;
    const [first, ...rest] = words;
    const segStart = first.start;
    const segEnd = words[words.length - 1].end;
    commands.push({
      name: first.value.toLowerCase(),
      words: rest,
      raw: rest.length ? line.slice(rest[0].start, segEnd).trim() : '',
      text: line.slice(segStart, segEnd).trim(),
    });
    words = [];
    return null;
  };

  for (const token of lexed.tokens) {
    if (token.type === 'word') {
      words.push(token.word);
      continue;
    }
    const error = endCommand(token.type === 'pipe' ? '|' : '&&');
    if (error) return { ok: false, error };
    if (token.type === 'and') {
      pipelines.push({ commands });
      commands = [];
    }
  }

  if (!words.length && !commands.length && !pipelines.length) return { ok: true, pipelines: [] };
  const error = endCommand('end');
  if (error) return { ok: false, error };
  pipelines.push({ commands });
  return { ok: true, pipelines };
}

/* ── Flags ──────────────────────────────────────────────────────────────── */

export interface Options {
  flags: Record<string, string | true>;
  args: string[];
}

/**
 * Reads flags out of a command's words.
 *
 *   --flag          flags.flag = true
 *   --key=value     flags.key = 'value'
 *   --key value     flags.key = 'value'   (only for names in `valued`)
 *   -abc            flags.a = flags.b = flags.c = true
 *   -n 5, -n5       flags.n = '5'         (only for names in `valued`)
 *   -5              flags.n = '5'         (head -5, tail -5)
 *   --              everything after is an argument
 *
 * A quoted word is always an argument, so `grep "-v"` searches for "-v".
 */
export function getopt(words: Word[], valued: string[] = []): Options {
  const flags: Record<string, string | true> = {};
  const args: string[] = [];
  let rest = false;

  for (let i = 0; i < words.length; i++) {
    const { value, quoted } = words[i];
    if (rest || quoted || value === '-' || !value.startsWith('-')) {
      args.push(value);
      continue;
    }
    if (value === '--') {
      rest = true;
      continue;
    }
    if (value.startsWith('--')) {
      const eq = value.indexOf('=');
      if (eq !== -1) {
        flags[value.slice(2, eq)] = value.slice(eq + 1);
        continue;
      }
      const name = value.slice(2);
      if (valued.includes(name) && i + 1 < words.length) {
        flags[name] = words[++i].value;
        continue;
      }
      flags[name] = true;
      continue;
    }
    if (/^-\d+$/.test(value)) {
      flags.n = value.slice(1);
      continue;
    }
    const letters = value.slice(1);
    for (let j = 0; j < letters.length; j++) {
      const letter = letters[j];
      if (valued.includes(letter)) {
        const attached = letters.slice(j + 1);
        if (attached) flags[letter] = attached;
        else if (i + 1 < words.length) flags[letter] = words[++i].value;
        else flags[letter] = true;
        break;
      }
      flags[letter] = true;
    }
  }
  return { flags, args };
}

/** Splits text into the words a command would see, for completion and hints. */
export function wordsOf(line: string): string[] {
  const lexed = tokenize(line);
  if (!lexed.ok) return line.trim().split(/\s+/).filter(Boolean);
  return lexed.tokens.flatMap((t) => (t.type === 'word' ? [t.word.value] : []));
}

/**
 * The text of the last command on a line: what follows the last unquoted `|`
 * or `&&`. Completion works on this, so `ls | gr` completes `grep`.
 */
export function lastSegment(line: string): { text: string; offset: number } {
  let inQuote: string | null = null;
  let cut = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (inQuote === '"' && ch === '\\') i++;
      else if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") inQuote = ch;
    else if (ch === '|') cut = i + 1;
    else if (ch === '&' && line[i + 1] === '&') {
      cut = i + 2;
      i++;
    }
  }
  const raw = line.slice(cut);
  const lead = raw.length - raw.trimStart().length;
  return { text: raw.trimStart(), offset: cut + lead };
}
