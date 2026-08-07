import { PROJECTS } from '@/data/projects';

/* ==========================================================================
   CURATED QUESTIONS

   Prepared queries against the portfolio's own tables, phrased as questions
   a visitor would actually ask.

   These are deliberately available to everyone, not gated behind clearance
   like raw `sql`. A recruiter is never going to type a SELECT statement, but
   "what's actually live right now?" is exactly what they came to find out —
   and hiding the answer behind a Konami code means almost nobody sees it.

   The gate still earns its keep: seeing real SQL run and produce a real
   answer is what makes discovering the raw query layer feel like a promotion
   rather than a novelty. The free tier advertises the locked one.

   Every entry carries a plain-language `answer` so the result reads for a
   non-technical visitor, while the SQL stays visible above it as proof the
   number was derived rather than typed.
   ========================================================================== */

export interface CuratedQuestion {
  question: string;
  sql: string;
  /** Plain-language summary of the result, given the matching row count. */
  answer: (count: number) => string;
}

/* Denominator counts built systems only.
   PROJECTS.length includes the two design-stage studies, so "7 of 12 systems
   run without containers" was counting blueprints that do not run at all.
   The design tier exists precisely so the page can never imply a blueprint is
   in production; the same rule has to apply to the numbers it quotes. */
const TOTAL = PROJECTS.filter((p) => p.tier !== 'design').length;

export const CURATED_QUESTIONS: CuratedQuestion[] = [
  {
    question: 'What is actually live right now?',
    sql: "SELECT title, category FROM projects WHERE status = 'LIVE'",
    answer: (n) => `${n} of ${TOTAL} are deployed and publicly reachable.`,
  },
  {
    question: 'Which systems are open source?',
    sql: "SELECT title, year FROM projects WHERE status = 'SOURCE OPEN'",
    answer: (n) => `${n} have public repositories you can read.`,
  },
  {
    question: 'Which systems use Python?',
    sql: "SELECT title, tier FROM projects WHERE stack LIKE '%Python%'",
    answer: (n) => `${n} of ${TOTAL} systems are built on Python.`,
  },
  {
    // The tier filter is the point, not noise: a design study has an empty
    // stack, so it satisfies NOT LIKE '%Docker%' vacuously and would be
    // counted as a system "running without containers" while running nowhere.
    question: 'What ships without Docker?',
    sql: "SELECT title, stack FROM projects WHERE tier != 'design' AND stack NOT LIKE '%Docker%'",
    answer: (n) => `${n} of ${TOTAL} built systems run without containers.`,
  },
  {
    question: 'Where does event streaming show up?',
    sql: "SELECT title, stack FROM projects WHERE stack LIKE '%Redpanda%'",
    answer: (n) => `${n} systems move events through Redpanda.`,
  },
  {
    question: 'Which systems sit on PostgreSQL?',
    sql: "SELECT title, tier FROM projects WHERE stack LIKE '%PostgreSQL%'",
    answer: (n) => `${n} of ${TOTAL} use PostgreSQL as the system of record.`,
  },
  {
    question: 'Which projects document their trade-offs?',
    sql: 'SELECT title, tradeoffs FROM projects WHERE tradeoffs > 0 ORDER BY tradeoffs DESC',
    answer: (n) => `${n} record decisions with the rejected alternative named, not just the choice made.`,
  },
  {
    question: 'Which have full case studies?',
    sql: 'SELECT title, tier FROM projects WHERE case_study = true',
    answer: (n) => `${n} of ${TOTAL} have long-form write-ups behind them.`,
  },
  {
    question: 'What is still only a design?',
    sql: "SELECT title, category FROM projects WHERE tier = 'design'",
    answer: (n) => `${n} are architecture studies — designed and specified, not built.`,
  },
  {
    question: 'Which roles were contract work?',
    sql: "SELECT company, role, period FROM experience WHERE type = 'Contract'",
    answer: (n) => `${n} of the recorded roles were contracts.`,
  },
];
