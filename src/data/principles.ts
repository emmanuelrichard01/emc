/* ==========================================================================
   PRINCIPLES — how the work is done, each with an example from a project

   A portfolio's "how I work" section is usually four adjectives in a grid:
   reliable, scalable, clean, collaborative. Unfalsifiable, so unreadable.

   Each principle here is said plainly, in the first person, and followed by
   one concrete example from a case study on this site, linked to the section
   of that case study where it is shown.

   The example is written in everyday words rather than quoted, so it reads
   for anyone. What keeps it honest is `anchor`: the specific fact the example
   rests on (a figure, a measurement), which principles.test.ts checks still
   appears in that project's data. Edit the case study so the fact changes,
   and the example has to be edited with it, or the build fails.
   ========================================================================== */

export interface Principle {
  id: string;
  /** Plain enough for a non-engineer. */
  title: string;
  /** One or two sentences, first person: what it means in practice. */
  gist: string;
  /** A concrete example from one project, in everyday words. */
  example: string;
  /** The project whose case study shows it. */
  projectId: string;
  /** The case-study section the example sits in (an anchor on that page). */
  section: 'problem' | 'approach' | 'outcome' | 'tradeoffs' | 'field-notes';
  /** The fact the example rests on, verbatim from that project's data. */
  anchor: string;
}

export const PRINCIPLES: Principle[] = [
  {
    id: 'failure-path',
    title: "I plan for things going wrong",
    gist: "Before I ship, I test what happens when a service goes down, a message arrives twice, or two requests hit at the same moment.",
    example:
      "In the Global Rate Limiter, eight copies of the service send 300 requests at once against a limit of 50, and every run lets exactly 50 through.",
    projectId: 'global-rate-limiter',
    section: 'outcome',
    anchor: 'exactly 50',
  },
  {
    id: 'measure',
    title: "I measure before I decide",
    gist: "Settings and thresholds come from real data and benchmarks, not guesses.",
    example:
      "In ULTRA-NEWS, the similarity score that groups articles into one story was set to 0.80 by testing against hand-labelled pairs, after a guess of 0.68 had lumped 112 unrelated articles together.",
    projectId: 'ultra-news',
    section: 'outcome',
    anchor: '0.80',
  },
  {
    id: 'enforce',
    title: "I make the system enforce the rules",
    gist: "Important rules live in the database or in automated checks, so nobody can skip them by mistake.",
    example:
      "In MMR Engine, the database itself makes sure a payment is matched at most once, even when two matching runs happen together, so money is never counted twice.",
    projectId: 'mmr-engine',
    section: 'outcome',
    anchor: 'matched at most once',
  },
  {
    id: 'evidence',
    title: "I fix the cause, not the symptom",
    gist: "When something breaks, I find out why, write it down, and add a test so it cannot come back.",
    example:
      "In Vega Studio, a toolbar that sat too close to objects turned out to be exactly 28px off because of a missing ruler offset, so I fixed the coordinate maths and covered it with 27 tests.",
    projectId: 'vega-canva',
    section: 'field-notes',
    anchor: '28px',
  },
];
