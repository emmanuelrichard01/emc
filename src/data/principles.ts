/* ==========================================================================
   PRINCIPLES — how the work is done, each one with its receipt

   A portfolio's "how I work" section is usually four adjectives in a grid:
   reliable, scalable, clean, collaborative. Unfalsifiable, so unreadable.

   Each principle here is paired with one piece of evidence *quoted verbatim*
   from a case study on this site, and links to the section of that case
   study where it is shown. principles.test.ts asserts every quote still
   appears in its project's data — edit the case study and the claim has to
   be edited with it, or the build fails. The claim can never outlive its
   receipt.
   ========================================================================== */

export interface Principle {
  id: string;
  title: string;
  /** One line: what it means in practice. */
  gist: string;
  /** The project whose case study shows it. */
  projectId: string;
  /** The case-study section the evidence sits in (an anchor on that page). */
  section: 'problem' | 'approach' | 'outcome' | 'tradeoffs' | 'field-notes';
  /** A verbatim excerpt from that project's data. */
  evidence: string;
}

export const PRINCIPLES: Principle[] = [
  {
    id: 'failure-path',
    title: 'Prove the failure path',
    gist: 'The happy path demos itself. The race, the outage and the retry are what get tested.',
    projectId: 'global-rate-limiter',
    section: 'outcome',
    evidence:
      '8 independent limiter instances fire 300 concurrent requests at one 50-capacity bucket, and exactly 50 are admitted, every run',
  },
  {
    id: 'measure',
    title: 'Measure before choosing',
    gist: 'A number in the config is a claim. It gets re-derived from data, not argued about.',
    projectId: 'ultra-news',
    section: 'outcome',
    evidence: 'The clustering threshold is 0.80 because it was measured, not chosen',
  },
  {
    id: 'enforce',
    title: 'Enforce it in the system',
    gist: 'A rule that lives in a convention gets broken by the next person in a hurry.',
    projectId: 'mmr-engine',
    section: 'outcome',
    evidence: 'PII masking enforced by the database itself via CHECK (has_pii_masked = TRUE), not by application convention',
  },
  {
    id: 'evidence',
    title: 'Debug from evidence',
    gist: 'The first explanation is usually wrong. The shape of the bug says which one is.',
    projectId: 'vega-canva',
    section: 'field-notes',
    evidence: 'Symmetric geometry cannot produce an asymmetric error.',
  },
];
