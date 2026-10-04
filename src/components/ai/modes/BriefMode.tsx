import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUp, Check, Copy, Pencil, RotateCcw } from 'lucide-react';

import { requestIntent } from '@/components/contact/contactModel';
import { runAction } from '@/lib/aiActions';
import { briefDraft, briefText } from '@/lib/aiBrief';
import { titleFor } from '@/lib/aiConversation';
import type { BriefResult } from '@/lib/aiProtocol';
import type { ModeProps } from './index';
import { AnswerBody } from '@/components/ai/answer/AnswerBody';
import { createStore, useStore } from './store';
import { postStream } from './stream';

/* ==========================================================================
   PROJECT BRIEF

   For someone with something to build. They describe it in their own words;
   the assistant asks a couple of questions a first call would ask (where it
   stands today, what success looks like, constraints, timing), then drafts
   a brief: the goal, the current state, outcomes, constraints, and the past
   systems on this site that are relevant, each with a reason. The visitor
   can edit any of it, then send it to Emmanuel, which puts it in the
   contact form under "A project" so the first reply can start from it.
   ========================================================================== */

const MAX_TURNS = 5;
const MAX_INPUT = 1200;

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

interface BriefState {
  turns: Turn[];
  input: string;
  phase: 'idle' | 'running' | 'error';
  status: string;
  brief: BriefResult | null;
  error: string | null;
  retryable: boolean;
}

const INITIAL: BriefState = { turns: [], input: '', phase: 'idle', status: '', brief: null, error: null, retryable: false };
const store = createStore<BriefState>(INITIAL);
let controller: AbortController | null = null;

async function send(text?: string) {
  const state = store.get();
  const message = (text ?? state.input).trim().slice(0, MAX_INPUT);
  // A retry resends the conversation as it stands; a new message adds to it.
  const turns: Turn[] = message ? [...state.turns.filter((t) => !t.streaming), { role: 'user', text: message }] : state.turns.filter((t) => !t.streaming);
  if (!turns.length || turns[turns.length - 1].role !== 'user') return;

  controller?.abort();
  controller = new AbortController();
  store.set({ turns: [...turns, { role: 'assistant', text: '', streaming: true }], input: '', phase: 'running', status: 'Thinking', error: null });

  let answer = '';
  const update = (patch: Partial<Turn>) =>
    store.set((s) => ({ turns: s.turns.map((t, i) => (i === s.turns.length - 1 && t.streaming ? { ...t, ...patch } : t)) }));

  const failure = await postStream(
    '/api/brief',
    { messages: turns.map((t) => ({ role: t.role, content: t.text })) },
    (event) => {
      if (event.type === 'status') store.set({ status: event.text });
      else if (event.type === 'delta') {
        answer += event.text;
        update({ text: answer });
      } else if (event.type === 'reset') {
        answer = '';
        update({ text: '' });
      } else if (event.type === 'brief') store.set({ brief: event.brief });
    },
    controller.signal
  );
  if (controller.signal.aborted) return;

  store.set((s) => ({
    // An empty streamed turn (the reply was the brief itself) leaves no bubble behind.
    turns: s.turns
      .map((t) => (t.streaming ? { ...t, text: answer.trim(), streaming: false } : t))
      .filter((t) => t.role === 'user' || t.text),
    phase: failure ? 'error' : 'idle',
    error: failure?.error ?? null,
    retryable: failure?.retryable ?? false,
    status: '',
  }));
}

function reset() {
  controller?.abort();
  store.set(INITIAL);
}

/* ── The brief, as a document the visitor can edit ─────────────────────── */

const lines = (list: string[]) => list.join('\n');
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-4 border-t border-border grid gap-1.5 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <p className="t-caption">{label}</p>
      <div className="min-w-0 text-[15px] leading-[1.6] text-foreground">{children}</div>
    </div>
  );
}

function EditableText({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const id = useId();
  const common =
    'w-full bg-transparent border-b border-rule-strong focus:border-foreground outline-none focus-visible:outline-none py-1 text-[15px] leading-[1.6] text-foreground';
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} value={value} rows={Math.max(2, value.split('\n').length)} onChange={(e) => onChange(e.target.value)} className={`${common} resize-y`} />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={common} />
      )}
    </>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">None noted</span>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[0.875rem_1fr] gap-x-2">
          <span aria-hidden="true" className="text-muted-ghost">
            –
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function BriefCard({ brief, onClose }: { brief: BriefResult; onClose: () => void }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<BriefResult>) => store.set({ brief: { ...brief, ...patch } });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(briefText(brief));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <article className="mt-8" aria-label="Project brief">
      <div className="flex items-baseline justify-between gap-4">
        <p className="t-caption">Project brief</p>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
          className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {editing ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Pencil className="w-3.5 h-3.5" aria-hidden="true" />}
          {editing ? 'Done editing' : 'Edit'}
        </button>
      </div>
      <h3 className="mt-1 t-heading text-foreground">
        {editing ? <EditableText label="Title" value={brief.title} onChange={(title) => set({ title })} /> : brief.title}
      </h3>

      <div className="mt-5 border-b border-border">
        <Field label="Goal">
          {editing ? <EditableText label="Goal" multiline value={brief.goal} onChange={(goal) => set({ goal })} /> : brief.goal}
        </Field>
        <Field label="Where it stands today">
          {editing ? (
            <EditableText label="Where it stands today" multiline value={brief.currentState} onChange={(currentState) => set({ currentState })} />
          ) : (
            brief.currentState
          )}
        </Field>
        <Field label="What success looks like">
          {editing ? (
            <EditableText label="What success looks like, one per line" multiline value={lines(brief.outcomes)} onChange={(v) => set({ outcomes: fromLines(v) })} />
          ) : (
            <List items={brief.outcomes} />
          )}
        </Field>
        <Field label="Constraints">
          {editing ? (
            <EditableText label="Constraints, one per line" multiline value={lines(brief.constraints)} onChange={(v) => set({ constraints: fromLines(v) })} />
          ) : (
            <List items={brief.constraints} />
          )}
        </Field>
        <Field label="Timeline">
          {editing ? (
            <EditableText label="Timeline" value={brief.timeline ?? ''} onChange={(timeline) => set({ timeline })} />
          ) : (
            brief.timeline || <span className="text-muted-foreground">Not set yet</span>
          )}
        </Field>
        {brief.relevantWork.length > 0 && (
          <Field label="Relevant past work">
            <ul className="space-y-2">
              {brief.relevantWork.map((work) => (
                <li key={work.id}>
                  <button
                    type="button"
                    onClick={() => void runAction({ kind: 'open-case', id: work.id, label: titleFor({ kind: 'project', id: work.id }) }, navigate)}
                    className="group inline-flex items-center gap-1.5 text-foreground"
                  >
                    <span className="link-draw">{titleFor({ kind: 'project', id: work.id })}</span>
                    <ArrowRight className="nudge w-3.5 h-3.5 opacity-70" aria-hidden="true" />
                  </button>
                  <p className="t-caption mt-0.5">{work.why}</p>
                </li>
              ))}
            </ul>
          </Field>
        )}
        <Field label="Open questions">
          {editing ? (
            <EditableText label="Open questions, one per line" multiline value={lines(brief.openQuestions)} onChange={(v) => set({ openQuestions: fromLines(v) })} />
          ) : (
            <List items={brief.openQuestions} />
          )}
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={() => {
            requestIntent('project', briefDraft(brief));
            onClose();
          }}
          className="btn-ink tap group"
        >
          Send to Emmanuel
          <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void copy()} className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-status-ok" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" onClick={reset} className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Start over
        </button>
      </div>
      <p className="mt-3 text-[12px] text-muted-quiet">Sending puts the brief in the contact form, where you can add anything before it goes.</p>
    </article>
  );
}

/* ── The mode ──────────────────────────────────────────────────────────── */

export default function BriefMode({ onClose }: ModeProps) {
  const state = useStore(store);
  const inputId = useId();
  const endRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);
  const userTurns = state.turns.filter((t) => t.role === 'user').length;
  const running = state.phase === 'running';
  const atLimit = userTurns >= MAX_TURNS && !state.brief;
  const last = state.turns[state.turns.length - 1];

  // Follow the conversation as it grows; a finished brief is read from its title.
  useEffect(() => {
    if (state.brief) briefRef.current?.scrollIntoView({ block: 'start' });
    else endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [state.turns.length, last?.text, state.brief]);

  return (
    <div className="h-full overflow-y-auto px-5 md:px-7 py-6" data-lenis-prevent>
      <h3 className="t-subhead text-foreground">Draft a project brief</h3>
      <p className="mt-2 t-caption max-w-[50ch]">
        Describe what you want to build. I&rsquo;ll ask a couple of questions, then draft a brief you can send to Emmanuel.
      </p>

      {state.turns.length > 0 && (
        <ol className="mt-6 space-y-5" aria-live="polite" aria-relevant="additions text">
          {state.turns.map((turn, i) =>
            turn.role === 'user' ? (
              <li key={i} className="pl-4 border-l border-rule-strong text-[15px] leading-[1.6] text-foreground whitespace-pre-wrap">
                {turn.text}
              </li>
            ) : (
              <li key={i}>
                {turn.text ? (
                  <AnswerBody text={turn.text} streaming={turn.streaming} register="reading" />
                ) : (
                  <p className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground" role="status">
                    <span className="w-1.5 h-1.5 bg-primary status-live" aria-hidden="true" />
                    {state.status || 'Thinking'}
                  </p>
                )}
              </li>
            )
          )}
        </ol>
      )}

      {state.phase === 'error' && state.error && (
        <div role="alert" className="mt-5 border-t border-border pt-4">
          <p className="text-[14px] text-foreground">{state.error}</p>
          {state.retryable && (
            <button type="button" onClick={() => void send('')} className="tap mt-2 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      )}

      {state.brief ? (
        <div ref={briefRef} className="scroll-mt-6">
          <BriefCard brief={state.brief} onClose={onClose} />
        </div>
      ) : (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!running && state.input.trim() && !atLimit) void send();
          }}
        >
          <label htmlFor={inputId} className="t-caption text-foreground">
            {state.turns.length ? 'Your answer' : 'What do you want to build?'}
          </label>
          <div className="mt-2 flex items-end gap-2 border-b border-border focus-within:border-rule-strong transition-colors">
            <textarea
              id={inputId}
              value={state.input}
              maxLength={MAX_INPUT}
              disabled={running || atLimit}
              rows={state.turns.length ? 2 : 4}
              onChange={(e) => store.set({ input: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !running && state.input.trim()) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={state.turns.length ? '' : 'A payments dashboard for our marketplace. Today we reconcile by hand…'}
              className="flex-1 resize-none bg-transparent outline-none focus-visible:outline-none py-2 text-[15px] leading-[1.6] text-foreground placeholder:text-muted-quiet disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={running || !state.input.trim() || atLimit}
              aria-label="Send"
              className="tap shrink-0 mb-1.5 w-9 h-9 flex items-center justify-center bg-foreground text-background disabled:opacity-35 transition-opacity"
            >
              <ArrowUp className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-[12px] text-muted-quiet">
            {atLimit
              ? 'That is plenty to go on. If no brief appeared, start over and describe it in one message.'
              : 'Enter sends, Shift and Enter adds a line. What you write is sent to the AI provider and not stored.'}
          </p>
          {state.turns.length > 0 && (
            <button type="button" onClick={reset} className="tap mt-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Start over
            </button>
          )}
        </form>
      )}
      <div ref={endRef} />
    </div>
  );
}
