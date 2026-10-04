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
     overlap     how much of a working day the visitor shares with Abuja,
                 worked out from real time zones so daylight saving holds
     vCard       "Save contact": the address book entry, built here
   ========================================================================== */

import type { Topic } from './contactSchema';

export interface Intent {
  id: 'role' | 'project' | 'collab' | 'other';
  label: string;
  /** What the placeholder asks for — the details that make a first reply useful. */
  prompt: string;
}

export const INTENTS: readonly Intent[] = [
  { id: 'role', label: 'A role', prompt: 'Tell me about the team, what the role would own, and where it sits. A link to the job post helps.' },
  { id: 'project', label: 'A project', prompt: 'What are you building, where does it stand today, and what timeline do you have in mind?' },
  { id: 'collab', label: 'Collaboration', prompt: 'What do you have in mind, and what would each of us bring to it?' },
  { id: 'other', label: 'Something else', prompt: 'Anything at all. Questions about a case study are welcome too.' },
];

/* The section's two doors ("Hiring for a role?", "Have a project in mind?")
   live outside the form but choose what it is about. A window event rather
   than lifted state, so the form keeps owning its own draft and the doors
   need nothing but an id. */
export const INTENT_EVENT = 'emc:contact-intent';

export interface IntentRequest {
  id: Intent['id'];
  /** Something the assistant drafted: a role-fit summary, a project brief, a conversation. Attached as a card, never pasted into what was typed. */
  draft?: string;
}

/** Picks what the message is about; the form brings itself into view and focuses the message. */
export function requestIntent(id: Intent['id'], draft?: string): void {
  window.dispatchEvent(new CustomEvent<IntentRequest>(INTENT_EVENT, { detail: { id, ...(draft ? { draft } : {}) } }));
}

/** The form has three doors; a collaboration is "something else". */
export function topicFor(id: Intent['id']): Topic {
  return id === 'collab' ? 'other' : id;
}

/** What an attached draft is, named from how each of the assistant's builders starts its text. */
export function attachmentLabel(draft: string): string {
  const head = draft.trimStart();
  if (head.startsWith('Project brief')) return 'Project brief';
  if (head.startsWith('From my conversation with the assistant')) return 'Conversation with the assistant';
  if (/^I checked a role\b/.test(head) || /^Role fit\b/i.test(head)) return 'Role fit summary';
  return 'From the assistant';
}

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

/* ── Availability and working hours ─────────────────────────────────────── */

export { AVAILABILITY } from '@/data/availability';

/** Abuja is on Africa/Lagos time: UTC+1 all year. */
export const HOME_ZONE = 'Africa/Lagos';
/** A working day, 09:00 to 17:00, on each side. */
const DAY_START_MIN = 9 * 60;
const DAY_END_MIN = 17 * 60;

/**
 * A zone's offset east of UTC, in minutes, at a given moment: the wall
 * clock there (as Intl reads it) minus the wall clock in UTC. Daylight
 * saving is whatever that zone's rules say on that date.
 */
export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  const utc = Math.floor(at.getTime() / 60_000) * 60_000;
  return Math.round((wall - utc) / 60_000);
}

/**
 * Minutes of a 09:00 to 17:00 day two zones share, given each one's offset
 * east of UTC. A day on one side can line up with the previous or next day
 * on the other, so all three alignments are tried.
 */
export function workdayOverlapMinutes(visitorOffsetMin: number, homeOffsetMin = 60): number {
  const homeStart = DAY_START_MIN - homeOffsetMin;
  const homeEnd = DAY_END_MIN - homeOffsetMin;
  let best = 0;
  for (const shift of [-1440, 0, 1440]) {
    const start = DAY_START_MIN - visitorOffsetMin + shift;
    const end = DAY_END_MIN - visitorOffsetMin + shift;
    best = Math.max(best, Math.min(homeEnd, end) - Math.max(homeStart, start));
  }
  return best;
}

/** One plain sentence about the shared part of the working day. */
export function overlapSentence(overlapMin: number): string {
  if (overlapMin >= DAY_END_MIN - DAY_START_MIN) return 'We share the whole working day.';
  if (overlapMin <= 0) return 'Our working days don’t overlap, so I’ll reply in your morning.';
  if (overlapMin < 60) return `Our working days overlap by ${overlapMin} minutes.`;
  const hours = Math.round(overlapMin / 30) / 2;
  return `Our working days overlap by ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
}

/* ── Save contact ───────────────────────────────────────────────────────── */

export interface Card {
  name: string;
  family: string;
  given: string;
  title: string;
  email: string;
  url: string;
  city: string;
  country: string;
  links: string[];
}

/** RFC 6350 escaping for a text value: backslash, newline, comma, semicolon. */
function vText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/** A vCard 3.0 entry (the version every address book reads), lines ending CRLF. */
export function buildVCard(card: Card): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vText(card.family)};${vText(card.given)};;;`,
    `FN:${vText(card.name)}`,
    `TITLE:${vText(card.title)}`,
    `EMAIL;TYPE=INTERNET:${card.email}`,
    `URL:${card.url}`,
    `ADR;TYPE=WORK:;;;${vText(card.city)};;;${vText(card.country)}`,
    ...card.links.map((link) => `X-SOCIALPROFILE:${link}`),
    'END:VCARD',
  ];
  return `${lines.join('\r\n')}\r\n`;
}
