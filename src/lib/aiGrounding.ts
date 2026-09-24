/* ==========================================================================
   AI GROUNDING

   Checks the answer's numbers against the data the answer was written from.

   The prompt tells the model never to state a figure it did not receive.
   A prompt is a request. This is the check: every figure in the finished
   answer — a percentage, a latency, a test count — must appear as a number
   somewhere in what the model was actually given (the site index, the tool
   results, the visitor's own question). One that does not is returned, and
   the transcript marks it where it stands in the sentence.

   What it can and cannot prove, stated plainly: it proves a figure *exists*
   in the evidence, not that it is attached to the right claim. "4,076 tests"
   passes if 4,076 appears anywhere in the evidence. That catches the failure
   that actually happens — a number invented or misremembered, "99.9%" where
   the data says 99.5% — and it is deterministic, free, and runs on every
   answer. Checking which claim a number belongs to would take a second model
   call, with its own error rate, on every question.
   ========================================================================== */

/* A number a reader would take as a fact: 4,076 · 99.5 · 200 (of <200ms) · 15.
   Not one fused to an identifier — "V3", "gemini-3.5", "S3", "sha256" — which
   is a name, not a claim: hence nothing alphanumeric, `-`, `.`, `_` or `/`
   immediately before it. */
const NUMBER = /(?<![A-Za-z0-9_.\-/])\d[\d,]*(?:\.\d+)?/g;

/* "1. first thing" — list numbering, not a claim. */
const LIST_MARKER = /^\s*\d+[.)]\s/gm;

function normalise(raw: string): string {
  return raw
    .replace(/,/g, '')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
    .replace(/^0+(?=\d)/, '');
}

function numbersIn(text: string): string[] {
  return [...text.matchAll(NUMBER)].map((m) => m[0].replace(/,+$/, ''));
}

/**
 * The figures in `answer` that appear nowhere in `evidence`, as they are
 * written in the answer (so the UI can find and mark them), each once.
 */
export function unverifiedFigures(answer: string, evidence: string[]): string[] {
  const known = new Set(evidence.flatMap(numbersIn).map(normalise));
  const unverified: string[] = [];

  for (const raw of numbersIn(answer.replace(LIST_MARKER, ''))) {
    if (!known.has(normalise(raw)) && !unverified.includes(raw)) unverified.push(raw);
  }
  return unverified;
}
