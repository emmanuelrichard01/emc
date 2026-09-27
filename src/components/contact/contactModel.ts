/* ==========================================================================
   CONTACT MODEL

   The parts of the contact section that are decisions rather than markup,
   kept pure so they are tested (contactModel.test.ts):

     intents     what the message is about — shapes the prompt the visitor
                 writes against, and the subject line the message arrives
                 under, so it can be triaged before it is opened
     suggestEmail  "gmial.com" caught before it becomes a reply that bounces
     mailtoHref  the way out when the form cannot send: the same message,
                 handed to the visitor's own mail app
   ========================================================================== */

export interface Intent {
  id: 'role' | 'project' | 'collab' | 'other';
  label: string;
  /** What the placeholder asks for — the details that make a first reply useful. */
  prompt: string;
}

export const INTENTS: readonly Intent[] = [
  { id: 'role', label: 'A role', prompt: 'The team, what the role would own, and where it sits. A link to the posting helps.' },
  { id: 'project', label: 'A project', prompt: 'What you are building, where it stands today, and the timeline you have in mind.' },
  { id: 'collab', label: 'Collaboration', prompt: 'What you have in mind, and what each side would bring to it.' },
  { id: 'other', label: 'Something else', prompt: 'Whatever it is — a question about a case study is welcome too.' },
];

/** The subject a message arrives under: sortable before it is opened. */
export function subjectFor(intent: Intent, name: string): string {
  const who = name.trim();
  return `Portfolio · ${intent.label}${who ? ` · ${who}` : ''}`;
}

/* ── Email typos ────────────────────────────────────────────────────────── */

const PROVIDERS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com', 'hotmail.com', 'hotmail.co.uk',
  'live.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'aol.com', 'msn.com',
  // Real providers one edit from a bigger one: listed so they are never
  // "corrected" — mail.com is not a typo of gmail.com.
  'mail.com', 'email.com', 'ymail.com', 'gmx.com', 'zoho.com', 'fastmail.com', 'yandex.com', 'rocketmail.com',
];

/** Misspellings of `.com` that are not themselves real top-level domains. */
const COM_TYPOS = new Set(['con', 'cmo', 'ocm', 'comm', 'vom', 'xom', 'coom', 'cim']);

/** Optimal-string-alignment distance: a transposition ("gmial") costs one edit. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * A likely correction for a mistyped address, or null. Conservative on
 * purpose: only a near miss of a major provider, or a `.com` typo, is
 * suggested — a company's own domain is never "corrected" into Gmail.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || PROVIDERS.includes(domain)) return null;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const provider of PROVIDERS) {
    const d = editDistance(domain, provider);
    if (d < bestDistance) {
      bestDistance = d;
      best = provider;
    }
  }
  // Two edits on a short domain is a different domain, not a typo.
  const allowed = domain.length >= 9 ? 2 : 1;
  if (best && bestDistance > 0 && bestDistance <= allowed) return `${local}@${best}`;

  const dot = domain.lastIndexOf('.');
  if (dot > 0 && COM_TYPOS.has(domain.slice(dot + 1))) return `${local}@${domain.slice(0, dot)}.com`;
  return null;
}

/* ── Fallback ───────────────────────────────────────────────────────────── */

export function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
