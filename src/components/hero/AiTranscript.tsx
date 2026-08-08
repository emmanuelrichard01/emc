import React, { useState } from 'react';
import { Sparkles, Terminal as TerminalIcon } from 'lucide-react';

import type { AiTurn } from './useAiSession';
import type { ToolResult } from '@/lib/aiTools';

/* ==========================================================================
   AI TRANSCRIPT

   The conversation, plus the evidence behind it.

   The evidence is the point. Every answer that used a tool can show the SQL
   it ran and the rows that came back, collapsed by default and one click
   away. A visitor who doubts a claim can check it against the same table the
   page renders from, in place — which is the only way an LLM belongs on a
   site whose whole argument is that its numbers are attributable.

   Answers are labelled as generated, always. Not a disclaimer in the corner:
   the label sits on the turn itself, because someone reading a single
   screenshot of one answer should still know what produced it.
   ========================================================================== */

/** Starter questions, phrased the way a visitor would actually ask. */
export const AI_SUGGESTIONS = [
  'what has he actually shipped?',
  'how does the reconciliation engine work?',
  'what would he bring to a data platform team?',
  'which projects use python and postgres?',
] as const;

const Evidence = ({ items }: { items: ToolResult[] }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors"
        aria-expanded={open}
      >
        {open ? '− hide' : '+ show'} evidence ({items.length})
      </button>

      {open && (
        <div className="mt-2 border-l border-primary/20 pl-3 space-y-3">
          {items.map((item) => (
            <div key={item.callId} className="font-mono text-[11px]">
              <div className="text-muted-foreground/40 uppercase tracking-widest text-[9px] mb-1">
                {item.name}
              </div>

              {item.sql && (
                <div className="text-primary/60 whitespace-pre-wrap break-words mb-1">{item.sql}</div>
              )}

              {item.table ? (
                <div className="overflow-x-auto">
                  <table className="text-muted-foreground border-collapse">
                    <thead>
                      <tr>
                        {item.table.columns.map((col) => (
                          <th
                            key={col}
                            className="text-left pr-5 pb-1 text-[9px] uppercase tracking-widest text-muted-foreground/40 font-normal"
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
                <div className="text-muted-foreground/70 whitespace-pre-wrap break-words">
                  {item.content.slice(0, 600)}
                  {item.content.length > 600 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface AiTranscriptProps {
  turns: AiTurn[];
  busy: boolean;
  /** Stops the in-flight question. Ctrl+C does the same, on devices that have one. */
  onCancel?: () => void;
}

export default function AiTranscript({ turns, busy, onCancel }: AiTranscriptProps) {
  return (
    <div
      className="font-mono text-[12px] md:text-[13px] leading-[1.9]"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="AI conversation"
    >
      {turns.map((turn) => {
        if (turn.role === 'user') {
          return (
            <div key={turn.id} className="mt-4 first:mt-0 text-foreground">
              <span className="text-primary/60 select-none">? </span>
              {turn.text}
            </div>
          );
        }

        if (turn.role === 'system') {
          return (
            <div key={turn.id} className="mt-1.5 text-amber-400/80 whitespace-pre-wrap">
              {turn.text}
            </div>
          );
        }

        return (
          <div key={turn.id} className="mt-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-primary/60 shrink-0" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
                {turn.local ? 'site data · no model' : `generated${turn.provider ? ` · ${turn.provider}` : ''}`}
              </span>
            </div>

            <div className="text-muted-foreground whitespace-pre-wrap break-words">{turn.text}</div>

            {turn.evidence?.length ? <Evidence items={turn.evidence} /> : null}
          </div>
        );
      })}

      {/* Tappable as well as Ctrl+C, for the same reason the shell's running
          command is: a phone has no Ctrl key, so a keyboard-only cancel leaves
          touch users watching a request they cannot stop. */}
      {busy && (
        <button
          type="button"
          onClick={onCancel}
          disabled={!onCancel}
          /* No aria-label, deliberately. This row is inserted into an
             aria-live log, so an override would announce "stop the current
             question" in place of the status a waiting user actually needs.
             The visible text already says both. */
          className="group mt-3 flex items-center gap-2 py-2 -my-2 text-left text-muted-foreground/50 enabled:hover:text-primary transition-colors"
        >
          <TerminalIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="font-mono text-[11px]">
            querying the site
            {/* Full strength while the rest of the row stays ambient: this
                half is an instruction, and at /40 it measured about 2:1. */}
            {onCancel && (
              <span className="text-muted-foreground group-hover:text-primary"> — tap or ^C to stop</span>
            )}
          </span>
          <span className="flex gap-0.5 shrink-0" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="ai-dot w-1 h-1 bg-primary rounded-full"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </span>
        </button>
      )}
    </div>
  );
}
