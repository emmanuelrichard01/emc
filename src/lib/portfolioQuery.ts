import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { STATUS_LABEL, projectStatus } from '@/lib/project';

/* ==========================================================================
   PORTFOLIO QUERY ENGINE

   A bounded SQL subset evaluated against the same arrays that render the
   site. Not a mock, not a canned response list: `SELECT` runs over live
   `PROJECTS` and `EXPERIENCE`, so a result can never disagree with the page.

   Supported:
     SELECT <cols|*> FROM <table>
       [WHERE <col> <op> <value> [AND ...]]
       [ORDER BY <col> [ASC|DESC]]
       [LIMIT <n>]

     ops: =  !=  <>  >  <  >=  <=  LIKE  NOT LIKE  IN (a, b)  NOT IN (a, b)

   Not supported, deliberately: JOIN, GROUP BY, OR, subqueries, functions.
   The point is a small surface implemented correctly rather than a large one
   implemented approximately — an engine that silently mis-evaluates a query
   is worse than one that says it cannot.
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
    { name: 'id', type: 'string', note: 'slug — the same one open/cat take' },
    { name: 'title', type: 'string', note: 'display name' },
    { name: 'tier', type: 'string', note: 'flagship | production | system | design' },
    { name: 'category', type: 'string', note: 'domain label' },
    { name: 'year', type: 'string', note: 'timeline, as written' },
    { name: 'status', type: 'string', note: 'derived from the links that exist' },
    { name: 'stack', type: 'string', note: 'comma-joined — search it with LIKE' },
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
    { name: 'stack', type: 'string', note: 'comma-joined — search it with LIKE' },
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

export const TABLES: TableSpec[] = [projectsTable, experienceTable];

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

function parseValue(raw: string): Cell | Cell[] {
  const value = raw.trim();
  if (value.startsWith('(') && value.endsWith(')')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((part) => parseScalar(part));
  }
  return parseScalar(value);
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

/* The negated forms must precede the bare ones — regex alternation is
   first-match, so `\blike\b` placed earlier would match the LIKE inside
   `NOT LIKE` and silently invert the meaning of the condition. */
const CONDITION =
  /^\s*(\w+)\s*(>=|<=|!=|<>|=|>|<|\bnot\s+like\b|\bnot\s+in\b|\blike\b|\bin\b)\s*([\s\S]+?)\s*$/i;

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

  const whereM = locate(masked, 'where');
  const orderM = locate(masked, 'order\\s+by');
  const limitM = locate(masked, 'limit');

  const clauses = [
    { key: 'where', match: whereM },
    { key: 'order', match: orderM },
    { key: 'limit', match: limitM },
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
  const selectPart = sql.slice('select'.length, from.start).trim();
  if (!selectPart) return { error: 'no columns selected' };

  let columns: string[];
  if (selectPart === '*') {
    columns = table.columns.map((c) => c.name);
  } else {
    columns = selectPart.split(',').map((c) => c.trim().toLowerCase());
    const unknown = columns.find((c) => !table.columns.some((tc) => tc.name === c));
    if (unknown) {
      return { error: `unknown column: ${unknown}. run 'schema' to see ${table.name}` };
    }
  }

  // Filter
  let rows = table.rows;
  const wherePart = sliceOf('where');

  if (wherePart) {
    // Split on AND using the mask, so a literal containing " and " stays intact.
    const maskedWhere = maskLiterals(wherePart);
    const boundaries: [number, number][] = [];
    const andRe = /\s+and\s+/g;
    let andMatch: RegExpExecArray | null;
    while ((andMatch = andRe.exec(maskedWhere)) !== null) {
      boundaries.push([andMatch.index, andMatch.index + andMatch[0].length]);
    }

    const conditions: string[] = [];
    let cursor = 0;
    for (const [start, end] of boundaries) {
      conditions.push(wherePart.slice(cursor, start));
      cursor = end;
    }
    conditions.push(wherePart.slice(cursor));

    for (const raw of conditions) {
      const parsed = CONDITION.exec(raw);
      if (!parsed) return { error: `could not parse condition: ${raw.trim()}` };

      const [, column, op, valueRaw] = parsed;
      const key = column.toLowerCase();
      if (!table.columns.some((tc) => tc.name === key)) {
        return { error: `unknown column: ${key}. run 'schema' to see ${table.name}` };
      }

      const value = parseValue(valueRaw);
      rows = rows.filter((row) => compare(row[key], op, value));
    }
  }

  // Sort
  const orderPart = sliceOf('order');
  if (orderPart) {
    const [rawColumn, rawDir = 'asc'] = orderPart.split(/\s+/);
    const key = rawColumn.toLowerCase();
    if (!table.columns.some((tc) => tc.name === key)) {
      return { error: `cannot order by unknown column: ${key}` };
    }

    const direction = rawDir.toLowerCase() === 'desc' ? -1 : 1;
    // Copied before sorting — `rows` may still be the table's own array when
    // no WHERE clause narrowed it, and sorting in place would permanently
    // reorder the source data behind the rendered page.
    rows = [...rows].sort((a, b) => {
      const left = a[key];
      const right = b[key];
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
      return String(left).localeCompare(String(right)) * direction;
    });
  }

  // Limit
  const limitPart = sliceOf('limit');
  if (limitPart) {
    if (!/^\d+$/.test(limitPart)) return { error: `LIMIT expects a whole number, got: ${limitPart}` };
    rows = rows.slice(0, Number(limitPart));
  }

  return {
    columns,
    rows: rows.map((row) => columns.map((c) => row[c])),
    rowCount: rows.length,
  };
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
