/* ==========================================================================
   TECHNOLOGY FAMILIES

   A stack lists the specific tools a project was built on: "PostgreSQL",
   "dbt", "DuckDB". Nobody writes "SQL" beside them, because it goes without
   saying, and so a literal count of "SQL" found it in 4 places when it was
   written in far more. This says what goes without saying.

   Only implications that are always true belong here: you cannot use
   PostgreSQL or build dbt models without writing SQL. An ORM (Prisma) is
   left out on purpose, because it can be used without writing any.

   One helper, used by every place that asks "did this use X?" (the About
   stack count, the Work filter, Experience's project links), so the number
   on the card and the list a click filters to can never disagree.
   ========================================================================== */

/** Technology → the stack entries that mean it was used, besides its own name. */
export const IMPLIED_BY: Readonly<Record<string, readonly string[]>> = {
  SQL: ['PostgreSQL', 'MySQL', 'DuckDB', 'dbt', 'TimescaleDB', 'pgvector', 'Supabase'],
};

/** True when `stack` used `tech`, by name or through a tool that implies it. */
export function usesTech(stack: readonly string[], tech: string): boolean {
  if (stack.includes(tech)) return true;
  const via = IMPLIED_BY[tech];
  return via ? stack.some((t) => via.includes(t)) : false;
}

/** The tools in `stack` that imply `tech`, for saying how a count was reached. */
export function impliedVia(stack: readonly string[], tech: string): string[] {
  const via = IMPLIED_BY[tech];
  return via ? stack.filter((t) => via.includes(t)) : [];
}
