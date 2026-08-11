import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { isQueryError, runQuery } from '@/lib/portfolioQuery';
import { CURATED_QUESTIONS } from '@/lib/portfolioQuestions';
import { QUERY_EXAMPLES } from '@/components/hero/useConsoleCommands';

/* ==========================================================================
   CURATED QUESTIONS

   These are the SQL statements the `queries` command runs on a visitor's behalf,
   and the examples printed by `help` / `man sql` as things to try. Both are
   hand-written strings executed against live data, so a data edit — renaming
   a tier, dropping a column — can break them with nothing failing at compile
   time. The visitor is the one who finds out.
   ========================================================================== */

describe('prepared questions', () => {
  it.each(CURATED_QUESTIONS.map((q, i) => [i + 1, q.question, q.sql] as const))(
    'question %i (%s) executes',
    (_index, _question, sql) => {
      const result = runQuery(sql);
      if (isQueryError(result)) throw new Error(`${sql}\n  -> ${result.error}`);
    }
  );

  it('produces a plain-language answer for every question', () => {
    for (const entry of CURATED_QUESTIONS) {
      const result = runQuery(entry.sql);
      if (isQueryError(result)) throw new Error(entry.sql);
      expect(entry.answer(result.rowCount).trim()).not.toBe('');
    }
  });

  it('never advertises a question that matches nothing', () => {
    // A prepared question returning 0 rows reads as a broken feature, not as
    // an interesting answer — it means the data moved out from under it.
    for (const entry of CURATED_QUESTIONS) {
      const result = runQuery(entry.sql);
      if (isQueryError(result)) throw new Error(entry.sql);
      expect(result.rowCount, `"${entry.question}" matched nothing`).toBeGreaterThan(0);
    }
  });

  /* The denominator quoted in the answers counts built systems only. Design
     studies were never built, so counting them as "systems" that do or do not
     use a technology overstates the portfolio — the same rule the design tier
     exists to enforce everywhere else. */
  it('quotes a denominator that excludes design-stage work', () => {
    const built = PROJECTS.filter((p) => p.tier !== 'design').length;

    // Scoped to questions over the projects table that actually quote a
    // total. The experience question reads "N of the recorded roles", which
    // is prose rather than a project count.
    const withTotal = CURATED_QUESTIONS.filter(
      (q) => /from\s+projects/i.test(q.sql) && /\bof \d+\b/.test(q.answer(0))
    );

    expect(withTotal.length).toBeGreaterThan(0);
    for (const entry of withTotal) {
      expect(entry.answer(0), entry.question).toContain(`of ${built}`);
      expect(entry.answer(0), entry.question).not.toContain(`of ${PROJECTS.length}`);
    }
  });

  it('excludes design studies from stack-based questions', () => {
    // A design study has an empty stack, so it satisfies NOT LIKE '%X%'
    // vacuously and would be counted as a system running without that tech.
    const designIds = new Set(PROJECTS.filter((p) => p.tier === 'design').map((p) => p.id));

    for (const entry of CURATED_QUESTIONS.filter((q) => q.sql.includes('NOT LIKE'))) {
      const result = runQuery(entry.sql.replace(/SELECT .*? FROM/i, 'SELECT id FROM'));
      if (isQueryError(result)) throw new Error(entry.sql);
      for (const row of result.rows) {
        expect(designIds.has(String(row[0])), `${entry.question} included a design study`).toBe(false);
      }
    }
  });
});

describe('documented sql examples', () => {
  it.each(QUERY_EXAMPLES)('example executes: %s', (sql) => {
    const result = runQuery(sql);
    if (isQueryError(result)) throw new Error(`${sql}\n  -> ${result.error}`);
  });
});
