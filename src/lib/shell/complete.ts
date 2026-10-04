import { TABLES } from '@/lib/portfolioQuery';
import { ALL_TECHS, ROOT, TIERS, lookup, resolvePath, type FsDir } from './fs';
import { lastSegment, wordsOf } from './parse';

/* ==========================================================================
   COMPLETION

   What the word under the cursor could become, given everything before it:
   a command name first, then whatever that command takes (a path, a
   directory, a command for `man`, a theme, a flag and its value, or SQL
   once the query layer is open). Completes the last command of a pipe, so
   `ls | gr` offers `grep`.

   Pure: the prompt decides what to do with the candidates (ghost text, a
   menu, a common prefix), and the tests read this directly.
   ========================================================================== */

/** What a command's arguments are, for completion. */
export type ArgKind = 'path' | 'dir' | 'target' | 'command' | 'theme' | 'sql' | 'table' | 'none';

export interface FlagHint {
  /** As typed: `--stack`, `-l`. */
  name: string;
  /** Values offered after `=`. */
  values?: 'tech' | 'tier' | readonly string[];
  summary?: string;
}

export interface CompletionSpec {
  name: string;
  arg?: ArgKind;
  flags?: FlagHint[];
}

export interface CompletionContext {
  commands: CompletionSpec[];
  aliases?: Record<string, string>;
  cwd: string;
  themes: string[];
  sqlUnlocked: boolean;
  root?: FsDir;
}

export type CandidateKind = 'command' | 'dir' | 'file' | 'flag' | 'value' | 'sql';

export interface Candidate {
  /** Replaces the token under the cursor. */
  value: string;
  /** What the menu shows. */
  label: string;
  kind: CandidateKind;
}

export interface Completion {
  /** Where the token starts in the line. It runs to the end of the line. */
  start: number;
  token: string;
  candidates: Candidate[];
}

const SQL_VERB = /^(select|insert|update|delete|drop|create|alter|truncate)$/i;
const SQL_KEYWORDS = [
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'LIKE', 'IN', 'GROUP BY', 'ORDER BY', 'ASC', 'DESC',
  'LIMIT', 'OFFSET', 'COUNT(*)', 'AS',
];

const startsWith = (value: string, token: string) => value.toLowerCase().startsWith(token.toLowerCase());

/** The token under the cursor: the text after the last unquoted space. */
function currentToken(segment: string): string {
  let inQuote: string | null = null;
  let start = 0;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") inQuote = ch;
    else if (ch === ' ') start = i + 1;
  }
  return segment.slice(start);
}

function pathCandidates(token: string, cwd: string, root: FsDir, dirsOnly: boolean): Candidate[] {
  const slash = token.lastIndexOf('/');
  const dirPart = slash === -1 ? '' : token.slice(0, slash + 1);
  const namePart = slash === -1 ? token : token.slice(slash + 1);
  const base = lookup(resolvePath(cwd, dirPart || '.'), root);
  if (!base || base.type !== 'dir') return [];

  const out: Candidate[] = base.children
    .filter((child) => (!dirsOnly || child.type === 'dir') && startsWith(child.name, namePart))
    .map((child) => ({
      value: `${dirPart}${child.name}${child.type === 'dir' ? '/' : ''}`,
      label: `${child.name}${child.type === 'dir' ? '/' : ''}`,
      kind: child.type === 'dir' ? 'dir' : 'file',
    }));

  // `..` is a real place to go, offered once the dot is typed.
  if (namePart.startsWith('.') && '..'.startsWith(namePart) && base.path !== '/') {
    out.unshift({ value: `${dirPart}../`, label: '../', kind: 'dir' });
  }
  return out;
}

function sqlCandidates(segment: string, token: string, wordsBefore: string[]): Candidate[] {
  const lower = wordsBefore.map((w) => w.toLowerCase());
  const previous = lower[lower.length - 1];
  const lowerCase = token !== '' && token === token.toLowerCase();
  const kw = (k: string) => (lowerCase ? k.toLowerCase() : k);

  if (previous === 'from') {
    return TABLES.filter((t) => startsWith(t.name, token)).map((t) => ({ value: t.name, label: t.name, kind: 'sql' }));
  }

  const fromIndex = lower.lastIndexOf('from');
  const tableName = fromIndex !== -1 ? lower[fromIndex + 1] : /\bfrom\s+(\w+)/i.exec(segment)?.[1]?.toLowerCase();
  const table = TABLES.find((t) => t.name === tableName);
  const columns = table ? table.columns.map((c) => c.name) : [...new Set(TABLES.flatMap((t) => t.columns.map((c) => c.name)))];

  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const value of [...columns, ...SQL_KEYWORDS.map(kw)]) {
    if (seen.has(value) || !startsWith(value, token) || value === token) continue;
    seen.add(value);
    out.push({ value, label: value, kind: columns.includes(value) ? 'value' : 'sql' });
  }
  return out;
}

function flagValues(hint: FlagHint): readonly string[] {
  if (hint.values === 'tech') return ALL_TECHS;
  if (hint.values === 'tier') return TIERS;
  return hint.values ?? [];
}

export function complete(line: string, ctx: CompletionContext): Completion {
  const root = ctx.root ?? ROOT;
  const segment = lastSegment(line);
  const token = currentToken(segment.text);
  const start = line.length - token.length;
  const before = wordsOf(segment.text.slice(0, segment.text.length - token.length));
  const result = (candidates: Candidate[]): Completion => ({ start, token, candidates: candidates.slice(0, 60) });

  const visible = ctx.commands;

  // The command itself.
  if (!before.length) {
    if (token.startsWith('/') || token.startsWith('.') || token.startsWith('~')) return result([]);
    return result(
      visible
        .filter((c) => startsWith(c.name, token) && c.name !== token)
        .map((c) => ({ value: c.name, label: c.name, kind: 'command' as const }))
        .sort((a, b) => a.value.localeCompare(b.value))
    );
  }

  const first = before[0].toLowerCase();
  if (SQL_VERB.test(first)) return result(ctx.sqlUnlocked ? sqlCandidates(segment.text, token, before) : []);

  const name = ctx.aliases?.[first] ?? first;
  const spec = visible.find((c) => c.name === name);
  if (!spec) return result([]);

  // A flag, or a flag's value.
  if (token.startsWith('-') && spec.flags?.length) {
    const eq = token.indexOf('=');
    if (eq !== -1) {
      const flag = spec.flags.find((f) => f.name === token.slice(0, eq));
      if (!flag) return result([]);
      const value = token.slice(eq + 1);
      const comma = value.lastIndexOf(',');
      const head = `${token.slice(0, eq + 1)}${value.slice(0, comma + 1)}`;
      const partial = value.slice(comma + 1);
      return result(
        flagValues(flag)
          .filter((v) => startsWith(v, partial) && v !== partial)
          .map((v) => ({ value: `${head}${v}`, label: v, kind: 'value' as const }))
      );
    }
    return result(
      spec.flags
        .filter((f) => f.name.startsWith(token) && f.name !== token)
        .map((f) => ({ value: f.values ? `${f.name}=` : f.name, label: f.name, kind: 'flag' as const }))
    );
  }

  switch (spec.arg) {
    case 'path':
    case 'dir':
      return result(pathCandidates(token, ctx.cwd, root, spec.arg === 'dir'));
    case 'target': {
      // A path, or a project id from anywhere (`cat mmr-engine`, `open evanty`).
      const paths = pathCandidates(token, ctx.cwd, root, false);
      if (token.includes('/')) return result(paths);
      const projects = lookup('/projects', root);
      const ids =
        projects?.type === 'dir' && ctx.cwd !== '/projects'
          ? projects.children
              .filter((p) => startsWith(p.name, token) && !paths.some((c) => c.label.replace(/\/$/, '') === p.name))
              .map((p) => ({ value: p.name, label: p.name, kind: 'dir' as const }))
          : [];
      return result([...paths, ...ids]);
    }
    case 'command':
      return result(
        visible.filter((c) => startsWith(c.name, token) && c.name !== token).map((c) => ({ value: c.name, label: c.name, kind: 'command' as const }))
      );
    case 'theme':
      return result(ctx.themes.filter((t) => startsWith(t, token) && t !== token).map((t) => ({ value: t, label: t, kind: 'value' as const })));
    case 'table':
      return result(
        ctx.sqlUnlocked ? TABLES.filter((t) => startsWith(t.name, token) && t.name !== token).map((t) => ({ value: t.name, label: t.name, kind: 'sql' as const })) : []
      );
    case 'sql':
      return result(ctx.sqlUnlocked ? sqlCandidates(segment.text, token, before.slice(1)) : []);
    default:
      return result([]);
  }
}

/** The longest prefix every candidate shares, for Tab to extend to. */
export function commonPrefix(values: string[]): string {
  if (!values.length) return '';
  let prefix = values[0];
  for (const value of values.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < value.length && prefix[i].toLowerCase() === value[i].toLowerCase()) i++;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}
