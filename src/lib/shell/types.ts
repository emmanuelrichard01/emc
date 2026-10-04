import type { ReactNode } from 'react';

/* ==========================================================================
   SHELL OUTPUT

   What a command prints, typed, so the next command in a pipe can read it.

     lines   text, one entry per line (prose, code and listings are lines too)
     table   columns and rows, which `sort` can order by column
     node    a rendered card (whoami, a chart). Shown, never piped: there is
             no honest way to grep a picture, so piping one says so instead.

   `runs` is parallel to lines or rows: the command a row runs when it is
   tapped. Filters keep it aligned, so `ls | grep redis` stays clickable.
   ========================================================================== */

export type Cell = string | number | boolean;

export type LineStyle = 'plain' | 'prose' | 'muted' | 'error';

export interface LinesOutput {
  kind: 'lines';
  lines: string[];
  runs?: (string | undefined)[];
  style?: LineStyle;
  /** Set for source code, so the renderer highlights it (python | ts | sql). */
  lang?: string;
}

export interface TableOutput {
  kind: 'table';
  columns: string[];
  rows: Cell[][];
  runs?: (string | undefined)[];
  /** A closing line. Dropped by filters, which print a row count instead. */
  footer?: string;
}

export interface NodeOutput {
  kind: 'node';
  node: ReactNode;
  /** Plain text for Copy and for Ask about this. Never piped. */
  text?: string;
}

export type ShellOutput = LinesOutput | TableOutput | NodeOutput;

export const lines = (text: string | string[], extra: Omit<LinesOutput, 'kind' | 'lines'> = {}): LinesOutput => ({
  kind: 'lines',
  lines: Array.isArray(text) ? text : text.split('\n'),
  ...extra,
});

export const errorLines = (text: string): LinesOutput => lines(text, { style: 'error' });

/** Pads a table into aligned text, the way the query layer has always printed it. */
export function tableToText(table: TableOutput, withCount = true): string[] {
  if (!table.rows.length) return ['0 rows'];
  const cells = table.rows.map((row) => row.map((c) => String(c)));
  const widths = table.columns.map((column, i) => Math.max(column.length, ...cells.map((row) => (row[i] ?? '').length)));
  const line = (values: string[]) => values.map((v, i) => (v ?? '').padEnd(widths[i])).join('  ').trimEnd();
  const out = [line(table.columns.map((c) => c.toUpperCase())), widths.map((w) => '─'.repeat(w)).join('  '), ...cells.map(line)];
  if (table.footer) out.push('', table.footer);
  else if (withCount) out.push('', `${table.rows.length} row${table.rows.length === 1 ? '' : 's'}`);
  return out;
}

/** Plain text for copying, asking about, or (for lines and tables) piping. */
export function outputToText(output: ShellOutput): string {
  if (output.kind === 'lines') return output.lines.join('\n');
  if (output.kind === 'table') return tableToText(output).join('\n');
  return output.text ?? '';
}

export const CELL_SEPARATOR = '  ';
