import { Sparkles, Terminal as TerminalIcon } from 'lucide-react';

import type { AiTurn } from './useAiSession';
import { suggestFollowUps } from '@/lib/aiSources';
import { AI_SUGGESTIONS } from '@/lib/aiSuggestions';
import { useAsk } from '@/components/ai/AskProvider';
import { AnswerBody } from '@/components/ai/answer/AnswerBody';
import { AnswerFooter } from '@/components/ai/answer/AnswerFooter';
import { StepTrace } from '@/components/ai/answer/Evidence';
import { unverifiedMarks } from '@/components/ai/answer/answerModel';
import type { Register } from '@/components/ai/answer/Citation';

/* ==========================================================================
   AI TRANSCRIPT

   The conversation, plus the evidence behind it, in one of two registers:

     terminal   the hero's AI mode: monospaced, compact, citations as [1]
     reading    the dock and the case-study panel: the site's reading type,
                citation chips, cards for blocks

   Both draw the same answer markup with the same parts (components/ai/
   answer/), so an answer is the same kind of thing wherever it was asked:
   the same citations, the same checks, the same evidence drawer.

   Answers are labelled as generated, always. Not a disclaimer in a corner:
   the label sits on the turn itself, because someone reading a screenshot
   of one answer should still know what produced it.
   ========================================================================== */

/* The general starter set lives in lib/aiSuggestions.ts, where the app
   shell can reach it without pulling this component into the first
   download. Re-exported so existing imports keep working. */
export { AI_SUGGESTIONS };

interface AiTranscriptProps {
  turns: AiTurn[];
  busy: boolean;
  /** Stops the in-flight question. Ctrl+C does the same, on devices that have one. */
  onCancel?: () => void;
  /** Re-asks the last question. Rendered only on the newest failed turn. */
  onRetry?: () => void;
  /** Whether that offer currently stands (see `canRetry` in useAiSession). */
  canRetry?: boolean;
  /** Asks a follow-up offered under the newest answer. */
  onAsk?: (question: string) => void;
  /** Questions to fall back on for follow-ups; the page's own starters. */
  suggestions?: readonly string[];
  /** Terminal (the hero) or reading (the dock, the case-study panel). */
  register?: Register;
}

/** Said while waiting, from the server's own progress line when it sends one. */
function phaseOf(live: AiTurn | undefined): string {
  if (live?.status) return live.status;
  if (!live) return 'Looking through the site';
  if (live.text) return 'Writing';
  if (live.evidence?.length) return 'Reading the site’s data';
  return 'Thinking';
}

export default function AiTranscript({
  turns,
  busy,
  onCancel,
  onRetry,
  canRetry,
  onAsk,
  suggestions = AI_SUGGESTIONS,
  register = 'terminal',
}: AiTranscriptProps) {
  const { audience, closeAsk } = useAsk();
  const reading = register === 'reading';
  const asked = turns.filter((turn) => turn.role === 'user').map((turn) => turn.text);
  const live = turns.find((turn) => turn.streaming);
  const phase = phaseOf(live);

  return (
    <div
      className={reading ? 'font-sans' : 'font-mono text-[12px] md:text-[13px] leading-[1.9]'}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation with the assistant"
    >
      {turns.map((turn, index) => {
        const isNewest = index === turns.length - 1;

        if (turn.role === 'user') {
          return (
            /* data-anchor marks where the scroll region should park this
               exchange: a tall answer should open at its beginning. */
            <div
              key={turn.id}
              data-anchor
              className={
                reading
                  ? 'mt-8 first:mt-0 text-[15px] leading-snug text-foreground font-medium'
                  : 'mt-4 first:mt-0 text-foreground'
              }
            >
              {reading ? null : <span className="text-primary/80 select-none">? </span>}
              {turn.text}
            </div>
          );
        }

        if (turn.role === 'system') {
          return (
            <div key={turn.id} className={`mt-2 text-status-warn whitespace-pre-wrap ${reading ? 'text-[13.5px] leading-relaxed' : ''}`}>
              {turn.text}
              {isNewest && turn.retryable && canRetry && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`ml-2 tap text-muted-foreground hover:text-foreground transition-colors py-2 -my-1 px-1 -mx-1 ${
                    reading ? 'text-[13px] underline underline-offset-4 decoration-rule-strong' : 'text-[11px]'
                  }`}
                >
                  Try again
                </button>
              )}
            </div>
          );
        }

        const followUps =
          isNewest && !busy && !turn.local && onAsk ? suggestFollowUps(turn.sources ?? [], asked, suggestions) : [];
        const question = [...turns.slice(0, index)].reverse().find((t) => t.role === 'user')?.text;
        const marks = turn.streaming ? [] : unverifiedMarks(turn.checks, turn.unverified);

        const label = turn.local
          ? 'Site data, no model'
          : turn.degraded
            ? 'Site search, the models are unavailable'
            : turn.streaming
              ? 'Writing'
              : `Written by AI${turn.provider ? `, ${turn.provider}` : ''}${turn.cached ? ', from the answer cache' : ''}${turn.stopped ? ', stopped' : ''}`;

        return (
          <div key={turn.id} className={reading ? 'mt-3' : 'mt-1.5'}>
            <div className={`flex items-center gap-1.5 ${reading ? 'mb-2' : 'mb-1'}`}>
              <Sparkles className="w-3 h-3 text-primary/80 shrink-0" aria-hidden="true" />
              <span className={reading ? 'text-[11.5px] text-muted-quiet' : 'font-mono text-[10.5px] text-muted-quiet'}>{label}</span>
            </div>

            {/* Live while streaming; folded into the evidence drawer once the answer lands. */}
            {turn.streaming && turn.evidence?.length ? <StepTrace items={turn.evidence} register={register} /> : null}

            {(turn.text || turn.streaming) && (
              <AnswerBody
                text={turn.text}
                streaming={turn.streaming}
                marks={marks}
                register={register}
                tail={
                  turn.streaming ? (
                    <span
                      className={`terminal-caret inline-block ml-px align-[-0.15em] bg-primary/80 ${reading ? 'w-[2px] h-[1.05em]' : 'w-[0.55em] h-[1.05em]'}`}
                      aria-hidden="true"
                    />
                  ) : null
                }
              />
            )}

            {!turn.streaming && (turn.text || turn.evidence?.length) ? (
              <AnswerFooter
                turn={turn}
                turns={turns}
                question={question}
                register={register}
                audience={audience}
                onSent={reading ? closeAsk : undefined}
              />
            ) : null}

            {isNewest && turn.degraded && canRetry && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className={`mt-2 tap text-muted-foreground hover:text-foreground transition-colors py-2 -my-1 ${reading ? 'text-[13px]' : 'text-[11px]'}`}
              >
                Ask a model again
              </button>
            ) : null}

            {/* The obvious next question, one tap away, built from what this
                answer cited: never a billed guess at what to ask. */}
            {followUps.length > 0 && (
              <div className={`mt-4 flex flex-wrap ${reading ? 'gap-2' : 'gap-2'}`} role="group" aria-label="Suggested follow-up questions">
                {followUps.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onAsk?.(q)}
                    className={
                      reading
                        ? 'tap text-left text-[13px] leading-snug px-3 py-1.5 text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:text-foreground hover:shadow-[inset_0_0_0_1px_hsl(var(--rule-strong))] transition-[color,box-shadow]'
                        : 'font-mono text-[11px] border border-border px-2.5 py-1.5 text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors'
                    }
                  >
                    {q}
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
          /* No aria-label, deliberately: this row is inserted into an aria-live
             log, so an override would announce "stop" in place of the status. */
          className={`group mt-4 flex items-center gap-2 py-2 -my-2 text-left text-muted-quiet enabled:hover:text-foreground transition-colors ${
            reading ? 'text-[12.5px]' : ''
          }`}
        >
          <TerminalIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className={`ai-status ${reading ? '' : 'font-mono text-[11px]'}`} key={phase}>
            {phase}
            {onCancel && <span className="text-muted-foreground group-hover:text-foreground">, tap or press {reading ? 'Esc' : '^C'} to stop</span>}
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
