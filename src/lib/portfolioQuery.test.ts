import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { describeSchema, describeTable, isQueryError, listTables, runQuery, TABLES } from '@/lib/portfolioQuery';
import type { QueryResult } from '@/lib/portfolioQuery';

/* ==========================================================================
   QUERY ENGINE

   This is the site's most distinctive feature and its only real parser, and
   it is reachable by any visitor who finds the clearance. A parser that
   silently mis-evaluates a query is worse than one that refuses: the reader
   gets a confident, wrong answer about the work, with no way to tell.

   The literal-masking cases below are the ones that actually broke during
   development — a WHERE value containing the word "and" split the condition
   in the wrong place — so they are regressions, not hypotheticals.
   ========================================================================== */

/** Unwraps a result that must have succeeded, failing loudly with the error. */
function ok(sql: string): QueryResult {
  const result = runQuery(sql);
  if (isQueryError(result)) throw new Error(`expected success for "${sql}", got: ${result.error}`);
  return result;
}

/** Unwraps an expected failure. */
function err(sql: string): string {
  const result = runQuery(sql);
  if (!isQueryError(result)) throw new Error(`expected an error for "${sql}", got ${result.rowCount} rows`);
  return result.error;
}

const ids = (result: QueryResult) => result.rows.map((row) => String(row[0]));

describe('projection', () => {
  it('expands * to the full column list', () => {
    const result = ok('SELECT * FROM projects');
    expect(result.columns).toEqual(TABLES[0].columns.map((c) => c.name));
    expect(result.rowCount).toBe(PROJECTS.length);
  });

  it('selects named columns in the order given', () => {
    expect(ok('SELECT tier, id FROM projects').columns).toEqual(['tier', 'id']);
  });

  it('is case-insensitive on table and column names', () => {
    expect(ok('select ID from PROJECTS').rowCount).toBe(PROJECTS.length);
  });

  it('tolerates a trailing semicolon', () => {
    expect(ok('SELECT id FROM projects;').rowCount).toBe(PROJECTS.length);
  });
});

describe('filtering', () => {
  it('matches on equality', () => {
    expect(ids(ok("SELECT id FROM projects WHERE tier = 'design'"))).toEqual([
      'cbn-data-residency',
      'smart-meter-telemetry',
    ]);
  });

  it('does not require whitespace around the operator', () => {
    expect(ok("SELECT id FROM projects WHERE tier='design'").rowCount).toBe(2);
  });

  it('combines conditions with AND', () => {
    const both = ok("SELECT id FROM projects WHERE tier = 'system' AND case_study = true");
    const tierOnly = ok("SELECT id FROM projects WHERE tier = 'system'");
    expect(both.rowCount).toBeGreaterThan(0);
    expect(both.rowCount).toBeLessThan(tierOnly.rowCount);
  });

  /* Asserted as disjoint sets, not as counts that sum.
     `stack LIKE '%Python%'` happens to match exactly half the projects, so a
     regression that parsed NOT LIKE as LIKE would still produce two counts
     summing to the total — the arithmetic check passed on a coincidence. */
  it('treats LIKE and NOT LIKE as true complements', () => {
    const withPython = ids(ok("SELECT id FROM projects WHERE stack LIKE '%Python%'"));
    const withoutPython = ids(ok("SELECT id FROM projects WHERE stack NOT LIKE '%Python%'"));

    expect(withPython.length).toBeGreaterThan(0);
    expect(withoutPython.length).toBeGreaterThan(0);
    expect(withPython.filter((id) => withoutPython.includes(id))).toEqual([]);
    expect([...withPython, ...withoutPython].sort()).toEqual(PROJECTS.map((p) => p.id).sort());
  });

  it('treats IN and NOT IN as true complements', () => {
    const inList = ids(ok("SELECT id FROM projects WHERE tier IN ('design', 'system')"));
    const notInList = ids(ok("SELECT id FROM projects WHERE tier NOT IN ('design', 'system')"));

    expect(inList.filter((id) => notInList.includes(id))).toEqual([]);
    expect([...inList, ...notInList].sort()).toEqual(PROJECTS.map((p) => p.id).sort());
  });

  it('treats _ as a single-character wildcard', () => {
    expect(ok("SELECT id FROM projects WHERE tier LIKE 'desig_'").rowCount).toBe(2);
  });

  it('supports IN and NOT IN as complements', () => {
    const inList = ok("SELECT id FROM projects WHERE tier IN ('design', 'system')").rowCount;
    const notInList = ok("SELECT id FROM projects WHERE tier NOT IN ('design', 'system')").rowCount;
    expect(inList + notInList).toBe(PROJECTS.length);
  });

  it('compares numbers numerically rather than as strings', () => {
    // A string comparison would rank "10" below "9"; this asserts the numeric path.
    const result = ok('SELECT id, decisions FROM projects WHERE decisions > 1');
    expect(result.rowCount).toBeGreaterThan(0);
    for (const row of result.rows) expect(Number(row[1])).toBeGreaterThan(1);
  });

  it('handles booleans', () => {
    const withStudy = ok('SELECT id FROM projects WHERE case_study = true').rowCount;
    const withoutStudy = ok('SELECT id FROM projects WHERE case_study = false').rowCount;
    expect(withStudy + withoutStudy).toBe(PROJECTS.length);
  });
});

describe('literal masking', () => {
  /* Clause detection runs over a masked copy of the query so a keyword inside
     a string literal cannot be mistaken for the clause itself. Each of these
     would previously have been parsed as structure. */
  it.each(['from', 'where', 'and', 'limit', 'order by', 'select'])(
    'does not treat %s inside a literal as a clause',
    (keyword) => {
      const result = runQuery(`SELECT id FROM projects WHERE title LIKE '%${keyword}%'`);
      expect(isQueryError(result)).toBe(false);
    }
  );

  it('splits on a real AND, not one inside a value', () => {
    // Regression: blanking literals to spaces let the greedy \s+and\s+ pattern
    // match inside the blanked literal and split at the wrong offset.
    const result = ok("SELECT id FROM projects WHERE title LIKE '%a and b%' AND tier = 'design'");
    expect(result.rowCount).toBe(0);
  });
});

describe('ordering and limiting', () => {
  it('sorts ascending by default and descending on request', () => {
    const asc = ids(ok('SELECT id FROM projects ORDER BY id'));
    const desc = ids(ok('SELECT id FROM projects ORDER BY id DESC'));
    expect(asc).toEqual([...asc].sort());
    expect(desc).toEqual([...asc].reverse());
  });

  it('orders numeric columns by value', () => {
    const values = ok('SELECT tradeoffs FROM projects ORDER BY tradeoffs DESC').rows.map((r) =>
      Number(r[0])
    );
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it('applies LIMIT', () => {
    expect(ok('SELECT id FROM projects LIMIT 3').rowCount).toBe(3);
  });

  it('applies WHERE, ORDER BY and LIMIT together', () => {
    const result = ok(
      "SELECT id, decisions FROM projects WHERE tier != 'design' ORDER BY decisions DESC LIMIT 2"
    );
    expect(result.rowCount).toBe(2);
    expect(Number(result.rows[0][1])).toBeGreaterThanOrEqual(Number(result.rows[1][1]));
  });

  /* ORDER BY must not mutate the table it read from.

     When no WHERE narrows the set, `rows` is still the table's own array, so
     `rows.sort()` would reorder the engine's stored rows permanently — every
     later unordered query would then return them in whatever order the last
     ORDER BY happened to leave behind.

     Asserting on PROJECTS alone does NOT catch this: the table rows are built
     with PROJECTS.map(), so they are a separate array and PROJECTS survives an
     in-place sort untouched. The observable damage is to the next query, which
     is what this checks. */
  it('does not corrupt table order for subsequent queries', () => {
    const baseline = ids(ok('SELECT id FROM projects'));

    runQuery('SELECT id FROM projects ORDER BY id DESC');

    expect(ids(ok('SELECT id FROM projects'))).toEqual(baseline);
  });

  it('leaves the underlying data array untouched', () => {
    const before = PROJECTS.map((p) => p.id).join(',');
    runQuery('SELECT id FROM projects ORDER BY id DESC');
    expect(PROJECTS.map((p) => p.id).join(',')).toBe(before);
  });

  it('returns rows in declaration order when no ORDER BY is given', () => {
    expect(ids(ok('SELECT id FROM projects'))).toEqual(PROJECTS.map((p) => p.id));
  });
});

describe('errors', () => {
  it('rejects non-SELECT verbs by name', () => {
    expect(err('DROP TABLE projects')).toMatch(/only SELECT/i);
  });

  it('reports an unknown table with the available ones', () => {
    const message = err('SELECT * FROM users');
    expect(message).toMatch(/unknown table/i);
    expect(message).toContain('projects');
  });

  it('reports an unknown column in both projection and filter', () => {
    expect(err('SELECT nope FROM projects')).toMatch(/unknown column/i);
    expect(err('SELECT id FROM projects WHERE nope = 1')).toMatch(/unknown column/i);
  });

  it('rejects a non-numeric LIMIT rather than coercing it', () => {
    expect(err('SELECT id FROM projects LIMIT abc')).toMatch(/whole number/i);
  });

  it('requires a FROM clause', () => {
    expect(err('SELECT *')).toMatch(/FROM/i);
  });

  it('rejects an empty query', () => {
    expect(err('   ')).toMatch(/empty/i);
  });

  /* Double quotes are identifiers in standard SQL, so this used to compare
     against the literal characters and return a confident "0 rows" — the
     worst outcome, since it is indistinguishable from a correct empty result. */
  it('explains double-quoted strings instead of silently matching nothing', () => {
    expect(err('SELECT id FROM projects WHERE tier = "design"')).toMatch(/single quotes/i);
  });
});

describe('schema', () => {
  it('reports both tables with their real row counts', () => {
    const dump = describeSchema();
    expect(dump).toContain(`projects  (${PROJECTS.length} rows)`);
    expect(dump).toContain('experience');
  });

  it('exposes every declared column as selectable', () => {
    for (const table of TABLES) {
      const result = ok(`SELECT ${table.columns.map((c) => c.name).join(', ')} FROM ${table.name}`);
      expect(result.columns).toHaveLength(table.columns.length);
    }
  });
});

/* ── Additions: counts, groups, OR, DISTINCT, multi-column order, OFFSET ──
   Each is checked against the data computed directly, so a test cannot pass
   on a coincidence of counts. */

describe('counting and grouping', () => {
  it('counts every row with COUNT(*)', () => {
    const result = ok('SELECT COUNT(*) FROM projects');
    expect(result.columns).toEqual(['count(*)']);
    expect(result.rows).toEqual([[PROJECTS.length]]);
  });

  it('counts filtered rows, and returns 0 rather than no row when nothing matches', () => {
    expect(ok("SELECT COUNT(*) FROM projects WHERE tier = 'design'").rows).toEqual([[2]]);
    expect(ok("SELECT COUNT(*) FROM projects WHERE tier = 'nope'").rows).toEqual([[0]]);
  });

  it('counts non-empty values with COUNT(col) and honours AS', () => {
    const result = ok('SELECT COUNT(id) AS n FROM projects');
    expect(result.columns).toEqual(['n']);
    expect(result.rows[0][0]).toBe(PROJECTS.length);
  });

  it('groups by one column, one row per value, counts summing to the table', () => {
    const result = ok('SELECT tier, COUNT(*) FROM projects GROUP BY tier');
    const tiers = [...new Set(PROJECTS.map((p) => p.tier))];
    expect(result.rowCount).toBe(tiers.length);
    for (const [tier, n] of result.rows) {
      expect(n).toBe(PROJECTS.filter((p) => p.tier === tier).length);
    }
  });

  it('orders groups by their count', () => {
    const counts = ok('SELECT tier, COUNT(*) AS n FROM projects GROUP BY tier ORDER BY n DESC').rows.map((r) => Number(r[1]));
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('refuses a plain column beside a count without GROUP BY, rather than guessing', () => {
    expect(err('SELECT tier, COUNT(*) FROM projects')).toMatch(/GROUP BY/);
    expect(err('SELECT title, COUNT(*) FROM projects GROUP BY tier')).toMatch(/GROUP BY/);
  });

  it('names the functions it does not have', () => {
    expect(err('SELECT SUM(decisions) FROM projects')).toMatch(/only COUNT/i);
    expect(err('SELECT tier FROM projects GROUP BY tier HAVING COUNT(*) > 1')).toMatch(/HAVING/);
  });
});

describe('OR and parentheses', () => {
  it('unions with OR', () => {
    const either = ids(ok("SELECT id FROM projects WHERE tier = 'design' OR tier = 'flagship'")).sort();
    const expected = PROJECTS.filter((p) => p.tier === 'design' || p.tier === 'flagship').map((p) => p.id).sort();
    expect(either).toEqual(expected);
  });

  it('binds AND tighter than OR', () => {
    // a OR (b AND c), not (a OR b) AND c.
    const result = ids(ok("SELECT id FROM projects WHERE tier = 'design' OR tier = 'system' AND case_study = true")).sort();
    const expected = PROJECTS.filter((p) => p.tier === 'design' || (p.tier === 'system' && Boolean(p.caseStudy)))
      .map((p) => p.id)
      .sort();
    expect(result).toEqual(expected);
  });

  it('lets parentheses override precedence', () => {
    const result = ids(ok("SELECT id FROM projects WHERE (tier = 'design' OR tier = 'system') AND case_study = true")).sort();
    const expected = PROJECTS.filter((p) => (p.tier === 'design' || p.tier === 'system') && Boolean(p.caseStudy))
      .map((p) => p.id)
      .sort();
    expect(result).toEqual(expected);
  });

  it('keeps OR inside a literal as text', () => {
    expect(isQueryError(runQuery("SELECT id FROM projects WHERE title LIKE '%this or that%'"))).toBe(false);
  });

  it('reports an unbalanced parenthesis', () => {
    expect(err("SELECT id FROM projects WHERE (tier = 'design'")).toMatch(/parenthesis/);
  });
});

describe('DISTINCT, ordering by several columns, OFFSET', () => {
  it('drops repeated rows with DISTINCT', () => {
    const tiers = ok('SELECT DISTINCT tier FROM projects').rows.map((r) => r[0]);
    expect(tiers).toEqual([...new Set(PROJECTS.map((p) => p.tier))]);
  });

  it('orders by a second column inside ties of the first', () => {
    const rows = ok('SELECT tier, id FROM projects ORDER BY tier ASC, id DESC').rows.map((r) => [String(r[0]), String(r[1])]);
    for (let i = 1; i < rows.length; i++) {
      const [prevTier, prevId] = rows[i - 1];
      const [tier, id] = rows[i];
      expect(prevTier.localeCompare(tier)).toBeLessThanOrEqual(0);
      if (prevTier === tier) expect(prevId.localeCompare(id)).toBeGreaterThanOrEqual(0);
    }
  });

  it('pages with LIMIT and OFFSET', () => {
    const all = ids(ok('SELECT id FROM projects'));
    expect(ids(ok('SELECT id FROM projects LIMIT 3 OFFSET 2'))).toEqual(all.slice(2, 5));
    expect(err('SELECT id FROM projects OFFSET x')).toMatch(/whole number/);
  });
});

describe('table descriptions', () => {
  it('describes one table and lists all of them', () => {
    expect(describeTable('projects')).toContain('Table "projects"');
    expect(describeTable('nope')).toBeNull();
    for (const table of TABLES) expect(listTables()).toContain(table.name);
  });
});
