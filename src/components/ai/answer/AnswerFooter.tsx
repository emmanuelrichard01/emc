import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpRight, Check, Copy, CornerDownRight, Link2, Send } from 'lucide-react';
import { toast } from 'sonner';

import TransitionLink from '@/components/ui/TransitionLink';
import type { AiTurn } from '@/components/hero/useAiSession';
import { requestIntent } from '@/components/contact/contactModel';
import { answerToPlainText } from '@/lib/aiAnswer';
import { runAction } from '@/lib/aiActions';
import { conversationDraft, titleFor } from '@/lib/aiConversation';
import type { AiAction } from '@/lib/aiProtocol';
import type { AiSource } from '@/lib/aiSources';
import { permalinkFor, type Audience } from '@/lib/aiStarters';
import { checksLine, readAnswer } from './answerModel';
import type { Register } from './Citation';
import { Evidence } from './Evidence';

/* ==========================================================================
   ANSWER FOOTER

   Under every finished answer, in order of what a reader wants next:

     the checks      "4 figures and 3 names checked against the site", or
                     what was not found, said once in words
     the offers      what the assistant suggested doing on the page, as
                     buttons ("Take me there"): nothing moves until pressed
     the sources     the pages it leans on
     the actions     Copy · Share · Send to Emmanuel · Evidence
   ========================================================================== */

/** Hands the conversation to the contact form, on the home page, with a draft attached. */
async function sendConversation(
  turns: readonly AiTurn[],
  audience: Audience,
  navigate: ReturnType<typeof useNavigate>
): Promise<void> {
  const draft = conversationDraft(turns);
  await runAction({ kind: 'go-to', label: 'Contact', section: 'contact' }, navigate);
  // The form scrolls itself into view and focuses the message once it has the draft.
  window.setTimeout(() => requestIntent(audience === 'hiring' ? 'role' : 'other', draft || undefined), 450);
}

function ChecksNote({ turn, register }: { turn: AiTurn; register: Register }) {
  const line = checksLine(turn.checks, turn.unverified);
  if (line.tone === 'none' || !line.text) return null;
  const reading = register === 'reading';
  if (line.tone === 'ok') {
    return (
      <p className={`flex items-center gap-1.5 text-muted-quiet ${reading ? 'font-sans text-[12px]' : 'text-[11px]'}`}>
        <Check className="w-3.5 h-3.5 text-status-ok shrink-0" aria-hidden="true" />
        {line.text}
      </p>
    );
  }
  const marks = [...(turn.checks?.unverified ?? turn.unverified ?? []), ...(turn.checks?.unverifiedNames ?? [])];
  return (
    <p className={`flex items-start gap-1.5 leading-relaxed text-status-warn ${reading ? 'font-sans text-[12.5px]' : 'text-[11px]'}`}>
      <AlertTriangle className="w-3.5 h-3.5 mt-[3px] shrink-0" aria-hidden="true" />
      <span>
        {line.text}
        {marks.length ? ` (${marks.join(', ')})` : ''}. Check it against the case study before relying on it.
      </span>
    </p>
  );
}

export function OfferedActions({ actions, register }: { actions: AiAction[]; register: Register }) {
  const navigate = useNavigate();
  if (!actions.length) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Places the assistant can take you">
      {actions.map((action, i) =>
        register === 'terminal' ? (
          <button
            key={i}
            type="button"
            onClick={() => void runAction(action, navigate)}
            className="text-primary/80 hover:text-primary transition-colors py-1"
          >
            → {action.label}
          </button>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => void runAction(action, navigate)}
            className="tap group inline-flex items-center gap-2 px-3 py-1.5 text-[13px] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--rule-strong))] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary))] transition-shadow"
          >
            {action.label}
            <ArrowRight className="nudge w-3.5 h-3.5 text-primary" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  );
}

function Sources({ sources, register }: { sources: AiSource[]; register: Register }) {
  const navigate = useNavigate();
  const reading = register === 'reading';
  const cls = reading
    ? 'inline-flex items-center gap-1 text-[12.5px] text-foreground/85 hover:text-foreground transition-colors py-1'
    : 'inline-flex items-center gap-0.5 text-[11px] text-foreground/85 underline decoration-primary/40 underline-offset-4 hover:text-primary hover:decoration-primary transition-colors py-1';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={reading ? 'font-sans text-[12px] text-muted-quiet' : 'text-[10.5px] text-muted-quiet'}>Sources</span>
      {sources.map((source) =>
        source.kind === 'project' ? (
          <TransitionLink key={`${source.kind}:${source.id}`} to={source.href} className={`group ${cls}`}>
            <span className={reading ? 'link-draw' : ''}>{source.title}</span>
            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
          </TransitionLink>
        ) : (
          <button
            key={`${source.kind}:${source.id}`}
            type="button"
            onClick={() => void runAction({ kind: 'open-role', label: source.title, id: source.id }, navigate)}
            className={`group ${cls}`}
          >
            <span className={reading ? 'link-draw' : ''}>{source.title}</span>
            <CornerDownRight className="w-3 h-3" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  );
}

interface AnswerFooterProps {
  turn: AiTurn;
  turns: readonly AiTurn[];
  /** The question this turn answers, for the share link. */
  question?: string;
  register: Register;
  audience: Audience;
  /** Called after the conversation is handed to the contact form (the dock closes). */
  onSent?: () => void;
}

export function AnswerFooter({ turn, turns, question, register, audience, onSent }: AnswerFooterProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const reading = register === 'reading';
  const actionCls = reading
    ? 'tap inline-flex items-center gap-1.5 py-1.5 font-sans text-[12.5px] text-muted-foreground hover:text-foreground transition-colors'
    : 'inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors py-2 -my-1.5';

  const copy = async () => {
    const plain = answerToPlainText(readAnswer(turn.text), titleFor);
    const links = (turn.sources ?? []).map((s) => `${s.title}: ${window.location.origin}${s.href}`);
    try {
      await navigator.clipboard.writeText([plain, ...(links.length ? ['', ...links] : [])].join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard refused: nothing useful to say here */
    }
  };

  const share = async () => {
    if (!question) return;
    try {
      await navigator.clipboard.writeText(permalinkFor(window.location.origin, window.location.pathname, question));
      toast.success('Link copied', { description: 'Anyone who opens it gets a fresh answer to the same question.' });
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const send = async () => {
    onSent?.();
    await sendConversation(turns, audience, navigate);
  };

  return (
    <div className="mt-3 space-y-2.5">
      <ChecksNote turn={turn} register={register} />
      {turn.actions?.length ? <OfferedActions actions={turn.actions} register={register} /> : null}
      {turn.sources?.length ? <Sources sources={turn.sources} register={register} /> : null}
      <div className={`flex flex-wrap items-center ${reading ? 'gap-x-4 gap-y-1' : 'gap-x-4'}`}>
        {!turn.local && turn.text ? (
          <button type="button" onClick={copy} className={actionCls}>
            {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        ) : null}
        {question && !turn.local ? (
          <button type="button" onClick={share} className={actionCls} aria-label="Copy a link that asks this question">
            <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            Share
          </button>
        ) : null}
        {!turn.local ? (
          <button type="button" onClick={send} className={actionCls}>
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            Send to Emmanuel
          </button>
        ) : null}
        {turn.evidence?.length ? <Evidence items={turn.evidence} register={register} /> : null}
      </div>
    </div>
  );
}
