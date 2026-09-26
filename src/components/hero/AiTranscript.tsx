import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TransitionLink from '@/components/ui/TransitionLink';
import { AlertTriangle, ArrowUpRight, Check, Copy, CornerDownRight, Sparkles, Terminal as TerminalIcon } from 'lucide-react';

import type { AiTurn } from './useAiSession';
import type { ToolResult } from '@/lib/aiTools';
import { suggestFollowUps, type AiSource } from '@/lib/aiSources';
import { scrollToSection } from '@/lib/scrollToSection';
import { AI_SUGGESTIONS } from '@/lib/aiSuggestions';

/* ==========================================================================
   AI TRANSCRIPT

   The conversation, plus the evidence behind it.

   The evidence is the point. Every answer that used a tool shows the queries
   it ran *while they run*, then folds them into a drawer with the SQL and the
   rows that came back. The pages it relied on sit under it as links. A
   visitor who doubts a claim can check it against the same table the page
   renders from, in place — which is the only way an LLM belongs on a site
   whose whole argument is that its numbers are attributable.

   Answers are labelled as generated, always. Not a disclaimer in the corner:
   the label sits on the turn itself, because someone reading a single
   screenshot of one answer should still know what produced it.
   ========================================================================== */

/* The general starter set lives in lib/aiSuggestions.ts, where the app
   shell can reach it without pulling this component into the first
   download. Re-exported so existing imports keep working. */
export { AI_SUGGESTIONS };

/**
 * The answer, with every figure the grounding check could not find marked
 * where it stands. The mark is the claim "this number is not in the site's
 * data" made at the exact spot a reader would otherwise take it on trust.
 */
function AnswerText({ text, unverified }: { text: string; unverified?: string[] }) {
  if (!unverified?.length) return <>{text}</>;
  const escaped = unverified.map((figure) => figure.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Not inside a longer number: "99" must not mark the start of "99.5".
  const pattern = new RegExp(`(?<![\\d.,])(${escaped.join('|')})(?![\\d])`, 'g');
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(last, match.index));
    parts.push(
      <mark
        key={match.index}
        className="bg-transparent text-amber-300 underline decoration-dotted decoration-amber-400/80 underline-offset-4"
        title="not found in the site's data"
      >
        {match[0]}
      </mark>
    );
    last = match.index! + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** One line per tool call: what ran, and what it found. */
function stepSummary(item: ToolResult): { label: string; detail: string; outcome: string; failed: boolean } {
  const failed = item.content.startsWith('error');
  const outcome = failed
    ? 'error, adjusting'
    : item.table
      ? `${item.table.rows.length} row${item.table.rows.length === 1 ? '' : 's'}`
      : 'read';

  if (item.sql) return { label: 'sql', detail: item.sql, outcome, failed };
  const firstLine = item.content.split('\n')[0] ?? '';
  const subject = firstLine.startsWith('id: ') ? firstLine.slice(4) : item.name.replace(/^get_/, '');
  return { label: item.name.replace(/^get_/, ''), detail: subject, outcome, failed };
}

/**
 * The work, shown while it happens.
 *
 * A question used to sit behind "querying the site" for as long as every
 * round took, and the evidence only existed afterwards, folded shut. Now each
 * query appears the moment it runs, with what it returned — so the wait is
 * the demonstration. Watching `status = 'LIVE' → 4 rows` resolve into a
 * sentence is the claim this feature makes, made in front of the reader.
 */
const StepTrace = ({ items }: { items: ToolResult[] }) => (
  <ol className="mb-2 space-y-0.5" aria-label="data the answer is being built from">
    {items.map((item) => {
      const step = stepSummary(item);
      return (
        <li key={item.callId} className="ai-step flex items-baseline gap-2 text-[11px] leading-[1.7] min-w-0">
          <span className="text-primary/70 shrink-0 select-none" aria-hidden="true">›</span>
          <span className="uppercase tracking-widest text-[10px] text-muted-foreground shrink-0">{step.label}</span>
          <span className="text-muted-foreground/80 truncate min-w-0">{step.detail}</span>
          <span className={`shrink-0 tabular-nums ${step.failed ? 'text-amber-400/80' : 'text-primary/80'}`}>
            → {step.outcome}
          </span>
        </li>
      );
    })}
  </ol>
);

const Evidence = ({ items }: { items: ToolResult[] }) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* The one control that makes the whole feature checkable: full token
          strength and a real hit area. Quiet is done with size and tracking
          here, not with alpha. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-2 -my-1.5 pr-2 -mr-2"
        aria-expanded={open}
      >
        {open ? '− hide' : '+ show'} evidence ({items.length})
      </button>

      {open && (
        <div className="mt-2 border-l border-primary/20 pl-3 space-y-3">
          {items.map((item) => (
            <div key={item.callId} className="font-mono text-[11px]">
              <div className="text-muted-foreground uppercase tracking-widest text-[10px] mb-1">{item.name}</div>

              {item.sql && <div className="text-primary/70 whitespace-pre-wrap break-words mb-1">{item.sql}</div>}

              {item.table ? (
                <div className="overflow-x-auto">
                  <table className="text-muted-foreground border-collapse">
                    <thead>
                      <tr>
                        {item.table.columns.map((col) => (
                          <th
                            key={col}
                            className="text-left pr-5 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-normal"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {item.table.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="pr-5 align-top whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted-foreground/80 whitespace-pre-wrap break-words">
                  {item.content}
                  {item.content.length >= 600 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * The pages an answer leans on, as links.
 *
 * The evidence drawer proves a number; this is where to read the rest. A
 * project opens its case study. A role scrolls to the experience ledger on
 * this page — a route change would throw the conversation away.
 */
const Sources = ({ sources }: { sources: AiSource[] }) => {
  const navigate = useNavigate();
  const className =
    'inline-flex items-center gap-0.5 text-[11px] text-foreground/85 underline decoration-primary/40 underline-offset-4 hover:text-primary hover:decoration-primary transition-colors py-1 -my-1';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">sources</span>
      {sources.map((source) =>
        source.kind === 'project' ? (
          <TransitionLink key={`${source.kind}:${source.id}`} to={source.href} className={className}>
            {source.title}
            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
          </TransitionLink>
        ) : (
          <button
            key={`${source.kind}:${source.id}`}
            type="button"
            // On the home page the ledger is here; on a case study it is not,
            // and the link goes to it instead of doing nothing.
            onClick={() => {
              if (!scrollToSection('experience')) navigate('/#experience');
            }}
            className={className}
          >
            {source.title}
            <CornerDownRight className="w-3 h-3" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  );
};

/** Copies an answer with its source links: the unit people paste into a hiring doc. */
const CopyAnswer = ({ turn }: { turn: AiTurn }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const links = (turn.sources ?? []).map((s) => `${s.title}: ${window.location.origin}${s.href}`);
    try {
      await navigator.clipboard.writeText([turn.text, ...(links.length ? ['', ...links] : [])].join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard refused — nothing useful to say about it here */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-2 -my-1.5"
    >
      {copied ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
      {copied ? 'copied' : 'copy'}
    </button>
  );
};

interface AiTranscriptProps {
  turns: AiTurn[];
  busy: boolean;
  /** Stops the in-flight question. Ctrl+C does the same, on devices that have one. */
  onCancel?: () => void;
  /** Re-asks the last question. Rendered only on the newest failed turn. */
  onRetry?: () => void;
  /** Whether that offer currently stands — see `canRetry` in useAiSession. */
  canRetry?: boolean;
  /** Asks a follow-up offered under the newest answer. */
  onAsk?: (question: string) => void;
  /** Questions to fall back on for follow-ups; the page's own starters. */
  suggestions?: readonly string[];
}

export default function AiTranscript({
  turns,
  busy,
  onCancel,
  onRetry,
  canRetry,
  onAsk,
  suggestions = AI_SUGGESTIONS,
}: AiTranscriptProps) {
  const asked = turns.filter((turn) => turn.role === 'user').map((turn) => turn.text);
  const live = turns.find((turn) => turn.streaming);
  // Said in the status row, because "querying the site" for the whole wait
  // described one phase of three.
  const phase = !live ? 'querying the site' : live.text ? 'writing' : live.evidence?.length ? 'reading site data' : 'thinking';

  return (
    <div
      className="font-mono text-[12px] md:text-[13px] leading-[1.9]"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="AI conversation"
    >
      {turns.map((turn, index) => {
        const isNewest = index === turns.length - 1;

        if (turn.role === 'user') {
          return (
            /* data-anchor marks where the scroll region should park this
               exchange: an answer taller than the viewport should open at its
               beginning, not scrolled past its own first line. */
            <div key={turn.id} data-anchor className="mt-4 first:mt-0 text-foreground">
              <span className="text-primary/60 select-none">? </span>
              {turn.text}
            </div>
          );
        }

        if (turn.role === 'system') {
          return (
            <div key={turn.id} className="mt-1.5 text-amber-400/80 whitespace-pre-wrap">
              {turn.text}
              {isNewest && turn.retryable && canRetry && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors py-2 -my-1 px-1 -mx-1"
                >
                  retry
                </button>
              )}
            </div>
          );
        }

        const followUps =
          isNewest && !busy && !turn.local && onAsk ? suggestFollowUps(turn.sources ?? [], asked, suggestions) : [];

        return (
          <div key={turn.id} className="mt-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-primary/60 shrink-0" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {turn.local
                  ? 'site data · no model'
                  : turn.degraded
                    ? 'site search · model unavailable'
                  : turn.streaming
                    ? 'generating'
                    : `generated${turn.provider ? ` · ${turn.provider}` : ''}${turn.cached ? ' · cached' : ''}${turn.stopped ? ' · stopped' : ''}`}
              </span>
            </div>

            {/* Live while streaming; folded into the drawer once the answer lands. */}
            {turn.streaming && turn.evidence?.length ? <StepTrace items={turn.evidence} /> : null}

            {(turn.text || turn.streaming) && (
              <div className="text-muted-foreground whitespace-pre-wrap break-words">
                <AnswerText text={turn.text} unverified={turn.streaming ? undefined : turn.unverified} />
                {turn.streaming && (
                  <span
                    className="terminal-caret inline-block w-[0.55em] h-[1.05em] -mb-[0.2em] ml-px bg-primary/80"
                    aria-hidden="true"
                  />
                )}
              </div>
            )}

            {/* Said once, under the answer, in words — the marks above say
                where; this says what they mean. */}
            {!turn.streaming && turn.unverified?.length ? (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-300/90">
                <AlertTriangle className="w-3 h-3 mt-[3px] shrink-0" aria-hidden="true" />
                <span>
                  {turn.unverified.length === 1 ? '1 figure' : `${turn.unverified.length} figures`} in this answer could
                  not be found in the site&rsquo;s data ({turn.unverified.join(', ')}). check it against the case study
                  before relying on it.
                </span>
              </p>
            ) : null}

            {!turn.streaming && (turn.sources?.length || turn.evidence?.length || (!turn.local && turn.text)) ? (
              <div className="mt-2 space-y-1.5">
                {turn.sources?.length ? <Sources sources={turn.sources} /> : null}
                <div className="flex items-center gap-4">
                  {turn.evidence?.length ? <Evidence items={turn.evidence} /> : null}
                  {!turn.local && turn.text ? <CopyAnswer turn={turn} /> : null}
                </div>
              </div>
            ) : null}

            {isNewest && turn.degraded && canRetry && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors py-2 -my-1"
              >
                ask a model again
              </button>
            ) : null}

            {/* The obvious next question, one tap away, built from what this
                answer cited — never a billed guess at what to ask. */}
            {followUps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="suggested follow-up questions">
                {followUps.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk?.(question)}
                    className="font-mono text-[11px] border border-border px-2.5 py-1.5 text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Tappable as well as Ctrl+C: a phone has no Ctrl key. */}
      {busy && (
        <button
          type="button"
          onClick={onCancel}
          disabled={!onCancel}
          /* No aria-label, deliberately. This row is inserted into an
             aria-live log, so an override would announce "stop the current
             question" in place of the status a waiting user actually needs. */
          className="group mt-3 flex items-center gap-2 py-2 -my-2 text-left text-muted-foreground/60 enabled:hover:text-primary transition-colors"
        >
          <TerminalIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="font-mono text-[11px]">
            {phase}
            {onCancel && <span className="text-muted-foreground group-hover:text-primary"> — tap or ^C to stop</span>}
          </span>
          <span className="flex gap-0.5 shrink-0" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="ai-dot w-1 h-1 bg-primary rounded-full" style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
          </span>
        </button>
      )}
    </div>
  );
}
