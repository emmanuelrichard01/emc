// Relative imports only: api/ code bundles this module (see aiTools.ts).
import type { ToolResult } from './aiTools.js';
import type { AiSource } from './aiSources.js';

/* ==========================================================================
   AI PROTOCOL

   The contract between the answering endpoints (api/ask.ts, api/fit.ts,
   api/brief.ts) and every client that renders them (the dock, the hero
   terminal, the case-study panel, the fit and brief modes, the tour).

   One wire format for all three endpoints: NDJSON, one event per line.
   Each event below is a line; a client switches on `type`. Unknown types are
   ignored, so an older client survives a newer server.

   Answer TEXT is not plain prose. It is the small markup defined in
   aiAnswer.ts (paragraphs, bullets, bold, inline citations and block
   directives), parsed and validated on both sides, so the server can audit
   what the client will render and the client never renders anything the
   server could not check.
   ========================================================================== */

/* ── Actions ───────────────────────────────────────────────────────────────
   Things the assistant can offer to do on the page. Never performed on its
   own: each arrives as an event and is rendered as a button ("Take me
   there"); the visitor's click runs it (lib/aiActions.ts). The guided tour
   runs them in sequence, but only after the visitor starts it. */

export type SiteSection = 'about' | 'projects' | 'experience' | 'contact';

export type CaseSectionId = 'problem' | 'approach' | 'outcome' | 'tradeoffs' | 'decisions' | 'field-notes' | 'overview';

export type AiAction =
  /** Filter the Work index. Any field may be omitted; all given must hold. */
  | { kind: 'show-work'; label: string; stack?: string[]; tier?: 'flagship' | 'production' | 'system' | 'design'; query?: string }
  /** Open a case study, optionally at a section, optionally highlighting a passage there. */
  | { kind: 'open-case'; label: string; id: string; section?: CaseSectionId; quote?: string }
  /** Scroll the home page to a section. */
  | { kind: 'go-to'; label: string; section: SiteSection }
  /** Scroll to one role in the career list (opening an older role if it is folded). */
  | { kind: 'open-role'; label: string; id: string };

/* ── Checks ───────────────────────────────────────────────────────────────── */

export interface AnswerChecks {
  /** Figures in the answer that were found in the evidence. */
  figures: number;
  /** Named projects, companies and technologies found in the evidence. */
  names: number;
  /** Figures NOT found in the evidence (also marked in the text). */
  unverified: string[];
  /** Names NOT found in the evidence: technologies or employers the data never mentions. */
  unverifiedNames: string[];
  /** Citations or blocks that pointed at something that does not exist, and were dropped. */
  droppedRefs: number;
}

/* ── Role fit ─────────────────────────────────────────────────────────────── */

export type FitVerdict = 'strong' | 'partial' | 'not-shown';

export interface FitEvidence {
  kind: 'project' | 'role';
  id: string;
  /** Case-study section the evidence is in, for a project. */
  section?: CaseSectionId;
  /** A short passage copied verbatim from the site's data. The server rejects any it cannot find. */
  quote: string;
}

export interface FitRequirement {
  /** The requirement, in the job description's own words, shortened. */
  requirement: string;
  verdict: FitVerdict;
  /** One plain sentence explaining the verdict. */
  note: string;
  evidence: FitEvidence[];
}

export interface FitResult {
  /** The role, as the description names it, if it does. */
  role?: string;
  /** Two or three sentences, honest about gaps. */
  summary: string;
  requirements: FitRequirement[];
  /** Evidence the server rejected because the quote is not in the data (kept for transparency). */
  rejectedEvidence: number;
}

/* ── Project brief ────────────────────────────────────────────────────────── */

export interface BriefResult {
  title: string;
  /** What the visitor is trying to achieve, in their words, tidied. */
  goal: string;
  /** What exists today. */
  currentState: string;
  /** What success looks like. */
  outcomes: string[];
  constraints: string[];
  timeline?: string;
  /** Past systems on this site that are relevant, each with a reason. Server-validated ids. */
  relevantWork: { id: string; why: string }[];
  /** Questions still open, for the first call. */
  openQuestions: string[];
}

/* ── Stream events ────────────────────────────────────────────────────────── */

export type StreamEvent =
  /** A tool ran; its query and rows, live. */
  | { type: 'step'; result: ToolResult }
  /** Plain-language progress for the visitor: "Reading MMR Engine's trade-offs". */
  | { type: 'status'; text: string }
  /** Answer text (aiAnswer markup) as it is generated. */
  | { type: 'delta'; text: string }
  /** Discard streamed text (it became a tool round, or a provider failed mid-answer). */
  | { type: 'reset' }
  /** Something the visitor can choose to have done on the page. */
  | { type: 'action'; action: AiAction }
  /** The answer is complete. */
  | {
      type: 'done';
      provider: string;
      sources: AiSource[];
      /** Kept for older clients; same as checks.unverified. */
      unverified: string[];
      checks?: AnswerChecks;
      /** The final answer text, validated server-side, when it differs from what streamed (optional). */
      text?: string;
      cached: boolean;
      degraded?: boolean;
    }
  /** Role fit finished. */
  | { type: 'fit'; result: FitResult }
  /** The brief conversation produced a brief. */
  | { type: 'brief'; brief: BriefResult }
  | { type: 'error'; error: string; retryable?: boolean };
