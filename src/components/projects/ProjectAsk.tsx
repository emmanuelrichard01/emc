import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, PanelRight, RotateCcw, Sparkles, Square } from 'lucide-react';

import AiTranscript from '@/components/hero/AiTranscript';
import { useAsk } from '@/components/ai/AskProvider';
import { MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { projectStarters } from '@/lib/aiStarters';
import SuggestionMarquee from '@/components/ai/SuggestionMarquee';
import type { Project } from '@/types';

/* ==========================================================================
   ASK ABOUT THIS PROJECT

   The assistant, where the questions actually occur to people.

   On the home page it lives in the terminal, which is the right place to
   explore a whole body of work. But the moment someone thinks "how does
   this handle offline edits?" they are halfway down a case study, and the
   terminal is a page away. This puts the same assistant at the end of the
   write-up, told which project is on screen — so "this" means something, the
   project's full detail is in its prompt from the first round, and the
   opening questions are about this project rather than about everything.

   Same session, same transcript, same evidence, same grounding marks: the
   conversation here is the one the dock and the terminal hold (AskProvider),
   so a question asked on the home page is still above this one.
   ========================================================================== */

export default function ProjectAsk({ project }: { project: Project }) {
  const { session: ai, ask: send, openAsk } = useAsk();
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const starters = useMemo(() => projectStarters(project), [project]);

  const ask = (text: string) => {
    if (!text.trim() || ai.busy) return;
    setQuestion('');
    send(text);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter asks; Shift+Enter is a new line, as in every chat box.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(question);
    }
    if (e.key === 'Escape' && ai.busy) ai.cancel();
  };

  return (
    <div className="border border-border bg-card/40">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 md:px-5 py-3">
        <span className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="font-mono text-[12px] text-foreground truncate">ask about {project.title.toLowerCase()}</span>
        </span>
        <span className="flex items-center gap-4 shrink-0">
          {/* The same conversation, in a panel that stays open while the
              visitor scrolls back up to the part they were asking about. */}
          <button
            type="button"
            onClick={() => openAsk()}
            className="hidden md:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-1"
          >
            <PanelRight className="w-3 h-3" aria-hidden="true" />
            keep open
          </button>
          {ai.turns.length > 0 && (
            <button
              type="button"
              onClick={ai.reset}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              new
            </button>
          )}
        </span>
      </div>

      <div className="px-4 md:px-5 py-4">
        {ai.turns.length === 0 ? (
          <>
            <p className="font-mono text-[12px] text-muted-foreground leading-relaxed mb-4 max-w-[60ch]">
              answers come from this page and the rest of the site. every figure is checked against the site&rsquo;s
              data, and the queries behind an answer open under it.
            </p>
            <SuggestionMarquee items={starters} onPick={ask} disabled={ai.busy} className="-mx-1" />
          </>
        ) : (
          <AiTranscript
            turns={ai.turns}
            busy={ai.busy}
            onCancel={ai.cancel}
            onRetry={ai.retry}
            canRetry={ai.canRetry}
            onAsk={ask}
            suggestions={starters}
          />
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border px-4 md:px-5 py-3">
        <label htmlFor={`ask-${project.id}`} className="sr-only">
          Ask a question about {project.title}
        </label>
        <textarea
          id={`ask-${project.id}`}
          ref={inputRef}
          rows={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_QUESTION_CHARS + 50}
          placeholder="ask anything about this project…"
          // 16px on phones: anything smaller makes iOS zoom the page on focus.
          className="flex-1 resize-none bg-transparent font-mono text-[16px] md:text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none py-1.5 max-h-32"
        />
        {ai.busy ? (
          <button
            type="button"
            onClick={ai.cancel}
            aria-label="Stop answering"
            className="shrink-0 flex items-center justify-center w-9 h-9 border border-border text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
          >
            <Square className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Ask"
            className="shrink-0 flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground disabled:bg-transparent disabled:text-muted-foreground disabled:border disabled:border-border transition-colors"
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </form>
    </div>
  );
}
