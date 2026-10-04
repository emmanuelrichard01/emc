import { PROJECTS } from '../data/projects.js';
import { EXPERIENCE } from '../data/experience.js';
import { STATUS_LABEL, projectStatus } from './project.js';

/* ==========================================================================
   PORTFOLIO QUERY ENGINE

   A bounded SQL subset evaluated against the same arrays that render the
   site. Not a mock, not a canned response list: `SELECT` runs over live
   `PROJECTS` and `EXPERIENCE`, so a result can never disagree with the page.

   Supported:
     SELECT [DISTINCT] <cols|*|COUNT(*)|COUNT(col) [AS name]> FROM <table>
       [WHERE <condition> [AND|OR ...], with ( ) for grouping]
       [GROUP BY <col>]
       [ORDER BY <col> [ASC|DESC] [, <col> ...]]
       [LIMIT <n>] [OFFSET <n>]

     ops: =  !=  <>  >  <  >=  <=  LIKE  NOT LIKE  IN (a, b)  NOT IN (a, b)
     AND binds tighter than OR, as in standard SQL.

   Not supported, deliberately: JOIN, HAVING, subqueries, functions other
   than COUNT. The point is a small surface implemented correctly rather
   than a large one implemented approximately: an engine that silently
   mis-evaluates a query is worse than one that says it cannot.
   ========================================================================== */

export type Cell = string | number | boolean;

export interface ColumnSpec {
  name: string;
  type: 'string' | 'number' | 'boolean';
  note: string;
}

export interface TableSpec {
  name: string;
  columns: ColumnSpec[];
  rows: Record<string, Cell>[];
}

export interface QueryResult {
  columns: string[];
  rows: Cell[][];
  rowCount: number;
}

export interface QueryError {
  error: string;
}

export function isQueryError(value: QueryResult | QueryError): value is QueryError {
  return 'error' in value;
}

/* ── Schema ─────────────────────────────────────────────────────────────── */

const projectsTable: TableSpec = {
  name: 'projects',
  columns: [
    { name: 'id', type: 'string', note: 'short id, the same one open and cat use' },
    { name: 'title', type: 'string', note: 'display name' },
    { name: 'tier', type: 'string', note: 'flagship | production | system | design' },
    { name: 'category', type: 'string', note: 'domain label' },
    { name: 'year', type: 'string', note: 'timeline, as written' },
    { name: 'status', type: 'string', note: 'derived from the links that exist' },
    { name: 'stack', type: 'string', note: 'tools joined by commas, search it with LIKE' },
    { name: 'decisions', type: 'number', note: 'documented architecture decisions' },
    { name: 'tradeoffs', type: 'number', note: 'decisions with a named rejected option' },
    { name: 'case_study', type: 'boolean', note: 'has a long-form write-up' },
  ],
  rows: PROJECTS.map((p) => ({
    id: p.id,
    title: p.title,
    tier: p.tier,
    category: p.category,
    year: p.timeline,
    status: STATUS_LABEL[projectStatus(p)],
    stack: p.stack.join(', '),
    decisions: p.decisions.length,
    tradeoffs: p.caseStudy?.tradeoffs?.length ?? 0,
    case_study: Boolean(p.caseStudy),
  })),
};

const experienceTable: TableSpec = {
  name: 'experience',
  columns: [
    { name: 'id', type: 'string', note: 'slug' },
    { name: 'company', type: 'string', note: 'employer' },
    { name: 'role', type: 'string', note: 'title held' },
    { name: 'type', type: 'string', note: 'Contract | Full-time | Part-time | Freelance' },
    { name: 'period', type: 'string', note: 'dates, as written' },
    { name: 'stack', type: 'string', note: 'tools joined by commas, search it with LIKE' },
    { name: 'highlights', type: 'number', note: 'recorded highlights' },
  ],
  rows: EXPERIENCE.map((e) => ({
    id: e.id,
    company: e.company,
    role: e.role,
    type: e.type,
    period: e.period,
    stack: e.stack.join(', '),
    highlights: e.highlights.length,
  })),
};

const tradeoffsTable: TableSpec = {
  name: 'tradeoffs',
  columns: [
    { name: 'project_id', type: 'string', note: 'project slug' },
    { name: 'project', type: 'string', note: 'project title' },
    { name: 'decision', type: 'string', note: 'architectural decision' },
    { name: 'chose', type: 'string', note: 'selected option' },
    { name: 'rejected', type: 'string', note: 'rejected alternative' },
    { name: 'why', type: 'string', note: 'engineering rationale' },
  ],
  rows: PROJECTS.filter((p) => p.caseStudy?.tradeoffs?.length).flatMap((p) =>
    (p.caseStudy?.tradeoffs ?? []).map((t) => ({
      project_id: p.id,
      project: p.title,
      decision: t.decision,
      chose: t.chose,
      rejected: t.rejected,
      why: t.why,
    }))
  ),
};

export const TABLES: TableSpec[] = [projectsTable, experienceTable, tradeoffsTable];

/* ── Lexing helpers ─────────────────────────────────────────────────────── */

/**
 * Lowercases the query and replaces anything inside single quotes with a
 * filler character, keeping the string exactly the same length.
 *
 * Clause and AND detection run against this mask, so a literal like
 * `WHERE title LIKE '%from%'` cannot be mistaken for a FROM clause — while
 * offsets still map one-to-one back onto the original text.
 *
 * The filler is deliberately *not* whitespace. Blanking literals to spaces
 * made `WHERE tier = 'system' AND case_study = true` fail: the separator
 * pattern `\s+and\s+` is greedy, so it started matching inside the blanked
 * literal and split the condition at `tier =` instead of at the AND. A
 * non-space filler cannot be absorbed into a whitespace run, and no run of
 * it can accidentally spell a keyword.
 */
const MASK_CHAR = 'x';

function maskLiterals(sql: string): string {
  let out = '';
  let inQuote = false;

  for (const ch of sql) {
    if (ch === "'") {
      inQuote = !inQuote;
      out += MASK_CHAR;
      continue;
    }
    out += inQuote ? MASK_CHAR : ch.toLowerCase();
  }
  return out;
}

interface Match {
  start: number;
  end: number;
}

function locate(masked: string, pattern: string): Match | null {
  const match = new RegExp(`\\s${pattern}\\s`).exec(masked);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/* ── Value parsing ──────────────────────────────────────────────────────── */

/**
 * Thrown for input the engine can describe better than it can guess at.
 *
 * Returned as an error rather than silently producing 0 rows: a query that
 * quietly matches nothing is indistinguishable from a query that correctly
 * matched nothing, and the visitor has no way to tell which they got.
 */
class QueryInputError extends Error {}

function parseScalar(raw: string): Cell {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);

  /* Double quotes are identifiers in standard SQL, not strings — but nobody
     typing into a terminal on a portfolio means that. Untreated, `tier =
     "design"` compared against the literal characters `"design"`, matched
     nothing, and reported a confident "0 rows". */
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    throw new QueryInputError(
      `use single quotes for text: '${value.slice(1, -1)}' rather than ${value}`
    );
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  return value;
}

function likeToRegExp(pattern: string): RegExp {
  // Escape regex metacharacters first, then translate the SQL wildcards.
  // Neither % nor _ is in the escaped set, so the order is safe.
  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i');
}

function compare(cell: Cell, op: string, value: Cell | Cell[]): boolean {
  // `NOT LIKE` can arrive with any internal spacing, so collapse it first.
  const operator = op.toLowerCase().replace(/\s+/g, ' ');

  if (operator === 'like' || operator === 'not like') {
    const hit = likeToRegExp(String(value)).test(String(cell));
    return operator === 'like' ? hit : !hit;
  }

  if (operator === 'in' || operator === 'not in') {
    const list = Array.isArray(value) ? value : [value];
    const hit = list.some(
      (candidate) => String(candidate).toLowerCase() === String(cell).toLowerCase()
    );
    return operator === 'in' ? hit : !hit;
  }

  const numeric = typeof cell === 'number' && typeof value === 'number';
  const left: string | number = numeric ? cell : String(cell).toLowerCase();
  const right: string | number = numeric ? (value as number) : String(value).toLowerCase();

  switch (operator) {
    case '=':
      return left === right;
    case '!=':
    case '<>':
      return left !== right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    default:
      return false;
  }
}

/* ── WHERE ──────────────────────────────────────────────────────────────────
   Read with a tokenizer and a small recursive descent rather than by
   splitting on AND, so OR, parentheses and precedence come out right:
   AND binds tighter than OR, exactly as in SQL, and parentheses override
   both. `a OR b AND c` is `a OR (b AND c)`. */

type WhereToken =
  | { t: 'lp' | 'rp' | 'comma'; start: number; end: number }
  | { t: 'op' | 'str' | 'dq' | 'word'; v: string; start: number; end: number };

function lexWhere(text: string): WhereToken[] {
  const tokens: WhereToken[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(' || ch === ')' || ch === ',') {
      tokens.push({ t: ch === '(' ? 'lp' : ch === ')' ? 'rp' : 'comma', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      let value = '';
      while (j < text.length) {
        // SQL escapes a quote inside a literal by doubling it: 'it''s'.
        if (text[j] === ch && text[j + 1] === ch) {
          value += ch;
          j += 2;
          continue;
        }
        if (text[j] === ch) break;
        value += text[j++];
      }
      if (j >= text.length) throw new QueryInputError(`unterminated quote in: ${text.slice(i).trim()}`);
      tokens.push({ t: ch === "'" ? 'str' : 'dq', v: value, start: i, end: j + 1 });
      i = j + 1;
      continue;
    }
    const op = /^(>=|<=|!=|<>|=|>|<)/.exec(text.slice(i));
    if (op) {
      tokens.push({ t: 'op', v: op[0], start: i, end: i + op[0].length });
      i += op[0].length;
      continue;
    }
    const word = /^[^\s(),'"=<>!]+/.exec(text.slice(i));
    if (!word) throw new QueryInputError(`could not parse condition: ${text.slice(i).trim()}`);
    tokens.push({ t: 'word', v: word[0], start: i, end: i + word[0].length });
    i += word[0].length;
  }
  return tokens;
}

type WhereNode =
  | { type: 'and' | 'or'; left: WhereNode; right: WhereNode }
  | { type: 'cond'; column: string; op: string; value: Cell | Cell[] };

function parseWhere(text: string, table: TableSpec): WhereNode {
  const tokens = lexWhere(text);
  let pos = 0;

  const isWord = (offset: number, ...words: string[]) => {
    const token = tokens[pos + offset];
    return token?.t === 'word' && words.includes(token.v.toLowerCase());
  };
  const conditionText = (from: number) => {
    // Up to the next AND/OR at this level, for an error that quotes what was typed.
    let to = from;
    while (to < tokens.length && !(tokens[to].t === 'word' && /^(and|or)$/i.test((tokens[to] as { v: string }).v))) to++;
    const last = tokens[Math.max(from, to - 1)];
    return last ? text.slice(tokens[from]?.start ?? 0, last.end).trim() : text.trim();
  };
  const unable = (from: number) => new QueryInputError(`could not parse condition: ${conditionText(from)}`);

  const scalarOf = (token: WhereToken): Cell => {
    if (token.t === 'str') return token.v;
    if (token.t === 'dq') return parseScalar(`"${token.v}"`);
    if (token.t === 'word') return parseScalar(token.v);
    throw unable(pos);
  };

  const condition = (): WhereNode => {
    const from = pos;
    const column = tokens[pos];
    if (column?.t !== 'word' || !/^\w+$/.test(column.v)) throw unable(from);
    const key = column.v.toLowerCase();
    if (!table.columns.some((c) => c.name === key)) {
      throw new QueryInputError(`unknown column: ${key}. run 'schema' to see ${table.name}`);
    }
    pos++;

    let op: string;
    const next = tokens[pos];
    if (next?.t === 'op') {
      op = next.v;
      pos++;
    } else if (isWord(0, 'not') && isWord(1, 'like', 'in')) {
      op = `not ${(tokens[pos + 1] as { v: string }).v.toLowerCase()}`;
      pos += 2;
    } else if (isWord(0, 'like', 'in')) {
      op = (next as { v: string }).v.toLowerCase();
      pos++;
    } else {
      throw unable(from);
    }

    if (op === 'in' || op === 'not in') {
      if (tokens[pos]?.t !== 'lp') {
        // A single bare value is accepted: `tier IN design`.
        if (!tokens[pos]) throw unable(from);
        return { type: 'cond', column: key, op, value: [scalarOf(tokens[pos++])] };
      }
      pos++;
      const list: Cell[] = [];
      while (tokens[pos] && tokens[pos].t !== 'rp') {
        // Bare words inside a list may run together: `IN (Data Engineering, design)`.
        if (tokens[pos].t === 'comma') {
          pos++;
          continue;
        }
        const parts: WhereToken[] = [];
        while (tokens[pos] && tokens[pos].t !== 'comma' && tokens[pos].t !== 'rp') parts.push(tokens[pos++]);
        list.push(
          parts.length === 1 ? scalarOf(parts[0]) : parseScalar(text.slice(parts[0].start, parts[parts.length - 1].end))
        );
      }
      if (tokens[pos]?.t !== 'rp') throw unable(from);
      pos++;
      return { type: 'cond', column: key, op, value: list };
    }

    const first = tokens[pos];
    if (!first) throw unable(from);
    if (first.t === 'str' || first.t === 'dq') {
      pos++;
      return { type: 'cond', column: key, op, value: scalarOf(first) };
    }
    // An unquoted value may be several words: `category = Data Engineering`.
    const startAt = pos;
    while (tokens[pos]?.t === 'word' && !isWord(0, 'and', 'or')) pos++;
    if (pos === startAt) throw unable(from);
    return { type: 'cond', column: key, op, value: parseScalar(text.slice(tokens[startAt].start, tokens[pos - 1].end)) };
  };

  const primary = (): WhereNode => {
    if (tokens[pos]?.t === 'lp') {
      pos++;
      const inner = or();
      if (tokens[pos]?.t !== 'rp') throw new QueryInputError('a parenthesis in WHERE is never closed');
      pos++;
      return inner;
    }
    return condition();
  };
  const and = (): WhereNode => {
    let node = primary();
    while (isWord(0, 'and')) {
      pos++;
      node = { type: 'and', left: node, right: primary() };
    }
    return node;
  };
  const or = (): WhereNode => {
    let node = and();
    while (isWord(0, 'or')) {
      pos++;
      node = { type: 'or', left: node, right: and() };
    }
    return node;
  };

  const tree = or();
  if (pos < tokens.length) {
    if (tokens[pos].t === 'rp') throw new QueryInputError('a closing parenthesis in WHERE has no opening one');
    throw unable(pos);
  }
  return tree;
}

function matches(node: WhereNode, row: Record<string, Cell>): boolean {
  if (node.type === 'cond') return compare(row[node.column], node.op, node.value);
  if (node.type === 'and') return matches(node.left, row) && matches(node.right, row);
  return matches(node.left, row) || matches(node.right, row);
}

/* ── Projection ─────────────────────────────────────────────────────────── */

type SelectItem =
  | { kind: 'column'; column: string; label: string }
  | { kind: 'count'; column: string | null; label: string };

/** Splits on commas that are not inside parentheses, so COUNT(x) stays whole. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim());
}

function parseSelect(text: string, table: TableSpec): SelectItem[] {
  if (text === '*') return table.columns.map((c) => ({ kind: 'column', column: c.name, label: c.name }));

  return splitTopLevel(text).map((raw) => {
    const known = (name: string) => {
      if (!table.columns.some((c) => c.name === name)) {
        throw new QueryInputError(`unknown column: ${name}. run 'schema' to see ${table.name}`);
      }
    };
    const count = /^count\s*\(\s*(\*|\w+)\s*\)(?:\s+as\s+(\w+))?$/i.exec(raw);
    if (count) {
      const column = count[1] === '*' ? null : count[1].toLowerCase();
      if (column) known(column);
      return { kind: 'count', column, label: count[2]?.toLowerCase() ?? `count(${column ?? '*'})` };
    }
    const plain = /^(\w+)(?:\s+as\s+(\w+))?$/i.exec(raw);
    if (!plain) {
      if (raw === '*') throw new QueryInputError('* cannot be mixed with other columns');
      if (/^\w+\s*\(/.test(raw)) throw new QueryInputError(`only COUNT is supported, not ${raw.split('(')[0].toUpperCase()}`);
      throw new QueryInputError(`could not read column: ${raw}`);
    }
    const column = plain[1].toLowerCase();
    known(column);
    return { kind: 'column', column, label: plain[2]?.toLowerCase() ?? column };
  });
}

function parseOrder(text: string): { key: string; direction: 1 | -1 }[] {
  return splitTopLevel(text).map((part) => {
    const match = /^([\w]+(?:\s*\(\s*(?:\*|\w+)\s*\))?)(?:\s+(asc|desc))?$/i.exec(part);
    if (!match) throw new QueryInputError(`could not read ORDER BY: ${part}`);
    return { key: match[1].replace(/\s+/g, '').toLowerCase(), direction: match[2]?.toLowerCase() === 'desc' ? -1 : 1 };
  });
}

function compareValues(left: Cell, right: Cell): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function wholeNumber(text: string, clause: string): number {
  if (!/^\d+$/.test(text)) throw new QueryInputError(`${clause} expects a whole number, got: ${text}`);
  return Number(text);
}

/* ── Query ──────────────────────────────────────────────────────────────── */

export function runQuery(input: string): QueryResult | QueryError {
  try {
    return evaluate(input);
  } catch (error) {
    // Only the engine's own input errors are turned into messages; anything
    // else is a genuine bug and should not be dressed up as user error.
    if (error instanceof QueryInputError) return { error: error.message };
    throw error;
  }
}

function evaluate(input: string): QueryResult | QueryError {
  const sql = input.trim().replace(/;+$/, '').trim();
  if (!sql) return { error: 'empty query' };

  const masked = maskLiterals(sql);
  if (!masked.startsWith('select ')) {
    return { error: 'only SELECT is supported. try: SELECT * FROM projects' };
  }

  const from = locate(masked, 'from');
  if (!from) return { error: 'missing FROM clause' };

  if (locate(masked, 'join')) return { error: 'JOIN is not supported: each query reads one table' };
  if (locate(masked, 'having')) return { error: 'HAVING is not supported. filter with WHERE, or sort the counts with ORDER BY' };

  const clauses = [
    { key: 'where', match: locate(masked, 'where') },
    { key: 'group', match: locate(masked, 'group\\s+by') },
    { key: 'order', match: locate(masked, 'order\\s+by') },
    { key: 'limit', match: locate(masked, 'limit') },
    { key: 'offset', match: locate(masked, 'offset') },
  ]
    .filter((c): c is { key: string; match: Match } => c.match !== null)
    .sort((a, b) => a.match.start - b.match.start);

  const sliceOf = (key: string): string => {
    const index = clauses.findIndex((c) => c.key === key);
    if (index === -1) return '';
    const start = clauses[index].match.end;
    const end = index + 1 < clauses.length ? clauses[index + 1].match.start : sql.length;
    return sql.slice(start, end).trim();
  };

  const tableEnd = clauses.length ? clauses[0].match.start : sql.length;
  const tableName = sql.slice(from.end, tableEnd).trim().toLowerCase();

  const table = TABLES.find((t) => t.name === tableName);
  if (!table) {
    return { error: `unknown table: ${tableName || '(none)'}. available: ${TABLES.map((t) => t.name).join(', ')}` };
  }

  // Projection
  let selectPart = sql.slice('select'.length, from.start).trim();
  const distinct = /^distinct\s+/i.test(selectPart);
  if (distinct) selectPart = selectPart.replace(/^distinct\s+/i, '');
  if (!selectPart) return { error: 'no columns selected' };
  const items = parseSelect(selectPart, table);
  const labels = items.map((item) => item.label);

  // Filter
  let rows = table.rows;
  const wherePart = sliceOf('where');
  if (wherePart) {
    const tree = parseWhere(wherePart, table);
    rows = rows.filter((row) => matches(tree, row));
  }

  const orderPart = sliceOf('order');
  const order = orderPart ? parseOrder(orderPart) : [];

  const groupPart = sliceOf('group').toLowerCase();
  const aggregate = items.some((item) => item.kind === 'count');
  let out: Cell[][];

  if (groupPart || aggregate) {
    // Grouped or counted: one output row per group (one in all, with no GROUP BY).
    if (groupPart && !/^\w+$/.test(groupPart)) return { error: 'GROUP BY takes one column' };
    if (groupPart && !table.columns.some((c) => c.name === groupPart)) {
      return { error: `unknown column: ${groupPart}. run 'schema' to see ${table.name}` };
    }
    for (const item of items) {
      if (item.kind === 'column' && item.column !== groupPart) {
        return {
          error: groupPart
            ? `${item.column} must be the GROUP BY column, or counted with COUNT(${item.column})`
            : `${item.column} needs GROUP BY ${item.column} to sit beside a count`,
        };
      }
    }

    const groups = new Map<string, Record<string, Cell>[]>();
    if (!groupPart) groups.set('', rows);
    for (const row of groupPart ? rows : []) {
      const key = String(row[groupPart]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    out = [...groups.values()].map((members) =>
      items.map((item) =>
        item.kind === 'column'
          ? members[0][item.column]
          : item.column === null
            ? members.length
            : members.filter((m) => String(m[item.column as string]) !== '').length
      )
    );

    // Ordered by what the result shows: a label, an alias or the grouped column.
    const keys = order.map(({ key, direction }) => {
      const index = labels.findIndex((label, i) => label === key || (items[i].kind === 'column' && (items[i] as { column: string }).column === key));
      if (index === -1) throw new QueryInputError(`cannot order by unknown column: ${key}`);
      return { index, direction };
    });
    if (keys.length) {
      out = [...out].sort((a, b) => {
        for (const { index, direction } of keys) {
          const diff = compareValues(a[index], b[index]);
          if (diff) return diff * direction;
        }
        return 0;
      });
    }
  } else {
    // Sorted on the full rows, so a query can order by a column it does not show.
    const keys = order.map(({ key, direction }) => {
      const alias = items.find((item) => item.label === key);
      const column = alias && alias.kind === 'column' ? alias.column : key;
      if (!table.columns.some((tc) => tc.name === column)) {
        throw new QueryInputError(`cannot order by unknown column: ${key}`);
      }
      return { column, direction };
    });
    if (keys.length) {
      // Copied before sorting: `rows` may still be the table's own array when
      // no WHERE clause narrowed it, and sorting in place would permanently
      // reorder the source data behind the rendered page.
      rows = [...rows].sort((a, b) => {
        for (const { column, direction } of keys) {
          const diff = compareValues(a[column], b[column]);
          if (diff) return diff * direction;
        }
        return 0;
      });
    }
    out = rows.map((row) => items.map((item) => row[(item as { column: string }).column]));
  }

  if (distinct) {
    const seen = new Set<string>();
    out = out.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Offset, then limit
  const offsetPart = sliceOf('offset');
  if (offsetPart) out = out.slice(wholeNumber(offsetPart, 'OFFSET'));
  const limitPart = sliceOf('limit');
  if (limitPart) out = out.slice(0, wholeNumber(limitPart, 'LIMIT'));

  return { columns: labels, rows: out, rowCount: out.length };
}

/** Human-readable schema dump for the `schema` command. */
export function describeSchema(): string {
  return TABLES.map((table) => {
    const width = Math.max(...table.columns.map((c) => c.name.length)) + 2;
    const typeWidth = 8;
    const header = `${table.name}  (${table.rows.length} rows)`;
    const body = table.columns.map(
      (c) => `  ${c.name.padEnd(width)}${c.type.padEnd(typeWidth)}${c.note}`
    );
    return [header, ...body].join('\n');
  }).join('\n\n');
}

/** One table's columns, for `\d projects`. Null when there is no such table. */
export function describeTable(name: string): string | null {
  const table = TABLES.find((t) => t.name === name.trim().toLowerCase());
  if (!table) return null;
  const width = Math.max(...table.columns.map((c) => c.name.length)) + 2;
  return [
    `Table "${table.name}"  (${table.rows.length} rows)`,
    '',
    `  ${'Column'.padEnd(width)}${'Type'.padEnd(9)}Note`,
    ...table.columns.map((c) => `  ${c.name.padEnd(width)}${c.type.padEnd(9)}${c.note}`),
  ].join('\n');
}

/** The table list, for a bare `\d`. */
export function listTables(): string {
  const width = Math.max(...TABLES.map((t) => t.name.length)) + 2;
  return [
    `  ${'Name'.padEnd(width)}${'Rows'.padEnd(7)}Columns`,
    ...TABLES.map((t) => `  ${t.name.padEnd(width)}${String(t.rows.length).padEnd(7)}${t.columns.length}`),
  ].join('\n');
}
