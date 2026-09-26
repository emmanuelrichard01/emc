/* General starter questions, phrased the way a visitor would actually ask.

   Chosen against three constraints, not for variety:

     · Every one is answerable from the site's own data. A starter that leads
       to "I don't have that" teaches a visitor the feature is broken on their
       very first use of it.
     · Between them they exercise every tool — run_sql for counting and
       filtering, get_project for how-it-works, get_experience for roles,
       get_tradeoffs for the rejected alternatives.
     · They are the questions this site is actually for. The first is what a
       recruiter is really asking; the trade-off one is what a careful reader
       wants and most portfolios will not answer.

   Named by what they describe, never by internal id — "the reconciliation
   engine" reads to someone who has not scrolled to the projects yet.

   And weighted away from counting. The `queries` command answers a prepared
   set instantly and for free; how and why are what the model is for, how
   many is what SQL is for. */
export const AI_SUGGESTIONS = [
  'what has he actually shipped?',
  'how does the reconciliation engine work?',
  'how does the collaborative canvas stay in sync offline?',
  'what would he bring to a data platform team?',
  'what trade-offs did he make, and what did he reject?',
  'where has he worked, and for how long?',
] as const;
