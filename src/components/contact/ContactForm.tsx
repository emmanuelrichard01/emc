import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { track } from '@vercel/analytics';
import { AlertCircle, ArrowRight, Check, ChevronDown, CloudOff, CornerDownLeft, FileText, Mail, Plus, RotateCcw, X } from 'lucide-react';

import { INTENT_EVENT, INTENTS, attachmentLabel, mailtoHref, suggestEmail, topicFor, type Intent, type IntentRequest } from './contactModel';
import {
  DETAIL_FIELDS,
  MAX_ATTACHMENT_LENGTH,
  MAX_MESSAGE_LENGTH,
  MIN_FILL_TIME_MS,
  composePlainText,
  normaliseUrl,
  subjectLine,
  topicLabel,
  type ContactAttachment,
  type ContactDetails,
  type ContactSubmission,
  type DetailKey,
  type Topic,
} from './contactSchema';
import { clearOutbox, newRequestId, readOutbox, saveOutbox, sendContact, type FailReason, type Outgoing } from './contactSend';
import { CVDownloadButton } from '@/components/ui/CVDownloadButton';
import { PROJECTS } from '@/data/projects';
import { scrollToSection } from '@/lib/scrollToSection';
import { scrollToY } from '@/lib/smoothScroll';
import { readCaseVisits } from '@/lib/visits';

/* ==========================================================================
   CONTACT FORM — doors, the form behind each, and what happens after

   Three doors: a role, a project, and a quieter "something else". Choosing
   one opens its form in place, with a prompt that asks for what makes a
   first reply useful, and optional details behind "Add details" so a
   recruiter can say which company and a founder can say what stage, without
   anyone having to fill in a form to say hello.

   Built around what goes wrong when someone writes to a stranger:

     · they are not sure what to say: the door shapes the prompt
     · they mistype their address: "did you mean gmail.com?"
     · they lose what they wrote: a draft per door, kept on this device
     · the assistant drafted something for them: it arrives as a card they
       can read or remove, not pasted over their own words
     · they are offline: the message waits and goes when they are back
     · the send fails: the same message, handed to their own mail app
     · it succeeds: a receipt that says where the reply will go, and when

   Sending is contactSend.ts: our endpoint, then Formspree. A honeypot and a
   minimum fill time drop bots without telling them.
   ========================================================================== */

const DRAFT_KEY = 'emc-contact-draft';
/** A draft older than this is not a draft any more; it is someone else's afternoon. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type FieldName = 'name' | 'email' | 'message' | DetailKey;
type Errors = Partial<Record<FieldName, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'queued';

const TOPIC_IDS: readonly Topic[] = ['role', 'project', 'other'];
const blankMessages = (): Record<Topic, string> => ({ role: '', project: '', other: '' });
const blankDetails = (): Record<Topic, ContactDetails> => ({ role: {}, project: {}, other: {} });

interface Draft {
  v: 2;
  variant: Intent['id'] | null;
  name: string;
  email: string;
  messages: Record<Topic, string>;
  details: Record<Topic, ContactDetails>;
  attachment: ContactAttachment | null;
  savedAt: number;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft> & { intent?: Intent['id']; message?: string };
    if (!d.savedAt || Date.now() - d.savedAt > DRAFT_TTL_MS) return null;
    // The first version kept one message and one intent: carried over.
    const draft: Draft =
      d.v === 2
        ? { ...blankDraft(), ...d, messages: { ...blankMessages(), ...d.messages }, details: { ...blankDetails(), ...d.details } } as Draft
        : {
            ...blankDraft(),
            variant: d.intent ?? null,
            name: d.name ?? '',
            email: d.email ?? '',
            messages: { ...blankMessages(), [topicFor(d.intent ?? 'other')]: d.message ?? '' },
            savedAt: d.savedAt,
          };
    return hasContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

function blankDraft(): Draft {
  return { v: 2, variant: null, name: '', email: '', messages: blankMessages(), details: blankDetails(), attachment: null, savedAt: 0 };
}

function hasContent(d: Pick<Draft, 'name' | 'email' | 'messages' | 'details' | 'attachment'>): boolean {
  return Boolean(
    d.name.trim() ||
      d.email.trim() ||
      d.attachment ||
      TOPIC_IDS.some((t) => d.messages[t].trim() || Object.values(d.details[t]).some((v) => v?.trim())),
  );
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable: nothing was saved, so nothing to clear.
  }
}

/** Analytics with nothing personal in it: which door, whether it sent, why not. */
function event(name: string, props?: Record<string, string | boolean>) {
  try {
    track(name, props);
  } catch {
    // Analytics is never allowed to break the form.
  }
}

const projectTitle = (id: string) => PROJECTS.find((p) => p.id === id)?.title ?? null;

/** ⌘ on Apple platforms, Ctrl everywhere else, for the send shortcut's label. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

interface Door {
  id: Topic;
  title: string;
  body: string;
  closed: string;
  open: string;
}

const DOORS: readonly Door[] = [
  {
    id: 'role',
    title: 'Hiring for a role?',
    body: 'Full-time or contract. Tell me about the team and what the role would own.',
    closed: 'Write about a role',
    open: 'Writing about a role',
  },
  {
    id: 'project',
    title: 'Have a project in mind?',
    body: 'Data pipelines, payment reconciliation, analytics platforms and the backends behind them.',
    closed: 'Describe your project',
    open: 'Describing your project',
  },
];

const NEXT_STEPS: Record<Topic | 'none', readonly string[]> = {
  none: ['I reply within 1 working day', 'A 20-minute call at a time that suits you', 'Then your interview process, or a short written proposal'],
  role: ['I reply within 1 working day', 'A 20-minute call at a time that suits you', 'Then your interview process'],
  project: ['I reply within 1 working day', 'A 20-minute call at a time that suits you', 'Then a short written proposal'],
  other: ['I reply within 1 working day', 'If a call would help, a time that suits you'],
};

const FAILURES: Record<FailReason, string> = {
  rate: 'That is a lot of messages in one hour, so this one did not send. It is still here.',
  invalid: 'Something in the message could not be sent as it is. It is still here.',
  server: 'Your message didn’t send, but it’s still here.',
  network: 'Your message didn’t send, but it’s still here.',
};

interface Receipt {
  topic: Topic;
  name: string;
  email: string;
  message: string;
  attachment: string | null;
  mentions: string[];
  at: Date;
  confirmation: boolean;
}

export default function ContactForm({ email: to }: { email: string }) {
  const prefersReduced = useReducedMotion();
  const [restored] = useState(readDraft);
  const [queuedOnLoad] = useState(readOutbox);

  const [variant, setVariant] = useState<Intent['id'] | null>(
    () => (queuedOnLoad ? queuedOnLoad.submission.topic : restored?.variant) ?? null,
  );
  const topic: Topic | null = variant ? topicFor(variant) : null;
  const [name, setName] = useState(() => queuedOnLoad?.submission.name ?? restored?.name ?? '');
  const [email, setEmail] = useState(() => queuedOnLoad?.submission.email ?? restored?.email ?? '');
  const [messages, setMessages] = useState<Record<Topic, string>>(() => {
    const m = restored?.messages ?? blankMessages();
    return queuedOnLoad ? { ...m, [queuedOnLoad.submission.topic]: queuedOnLoad.submission.message } : m;
  });
  const [details, setDetails] = useState<Record<Topic, ContactDetails>>(() => {
    const d = restored?.details ?? blankDetails();
    return queuedOnLoad ? { ...d, [queuedOnLoad.submission.topic]: queuedOnLoad.submission.details } : d;
  });
  const [attachment, setAttachment] = useState<ContactAttachment | null>(
    () => queuedOnLoad?.submission.attachment ?? restored?.attachment ?? null,
  );
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [visits, setVisits] = useState<string[]>(() => readCaseVisits().filter((id) => projectTitle(id)));
  const [mentions, setMentions] = useState<string[]>(() => queuedOnLoad?.submission.mentions ?? []);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showRestored, setShowRestored] = useState(Boolean(restored) && !queuedOnLoad);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<Status>(queuedOnLoad ? 'queued' : 'idle');
  const [failure, setFailure] = useState<{ reason: FailReason; error?: string } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const mountedAt = useRef<number>(0);
  const started = useRef(new Set<Topic>());
  const outbox = useRef<Outgoing | null>(queuedOnLoad);
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const doorRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const detailRefs = useRef<Partial<Record<DetailKey, HTMLInputElement | null>>>({});
  const pendingFocus = useRef<FieldName | null>(null);

  const message = topic ? messages[topic] : '';
  const topicDetails = useMemo(() => (topic ? details[topic] : {}), [details, topic]);
  const fields = useMemo(() => (topic ? DETAIL_FIELDS[topic] : []), [topic]);
  const filledDetails = fields.filter((f) => topicDetails[f.key]?.trim()).length;
  const intent = INTENTS.find((i) => i.id === variant) ?? INTENTS[3];

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  /* Opens a door. From a click, the door keeps focus (it is a radio). From
     elsewhere on the site (the assistant, a button in another section), the
     form is brought into view and the cursor put where the writing happens,
     once the scroll has landed so the page does not jump to the field first. */
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const open = useCallback((next: Intent['id'], from: 'door' | 'elsewhere') => {
    const was = variantRef.current;
    if (was === null || topicFor(was) !== topicFor(next)) event('door_open', { topic: topicFor(next) });
    setVariant(next);
    setVisits(readCaseVisits().filter((id) => projectTitle(id)));
    setStatus((s) => (s === 'sent' ? 'idle' : s));
    setErrors({});
    setTouched({});
    if (from === 'elsewhere') {
      const el = rootRef.current;
      if (el) scrollToY(Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96));
      pendingFocus.current = 'message';
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onIntent = (e: Event) => {
      // An id (a door elsewhere), or { id, draft } (the assistant attaching its work).
      const detail = (e as CustomEvent<Intent['id'] | IntentRequest>).detail;
      const request: IntentRequest = typeof detail === 'string' ? { id: detail } : detail;
      if (!request || !INTENTS.some((i) => i.id === request.id)) return;
      if (request.draft?.trim()) {
        setAttachment({ label: attachmentLabel(request.draft), text: request.draft.trim().slice(0, MAX_ATTACHMENT_LENGTH) });
        setAttachmentOpen(false);
      }
      open(request.id, 'elsewhere');
      clearTimeout(timer);
      timer = setTimeout(() => {
        pendingFocus.current = null;
        messageRef.current?.focus({ preventScroll: true });
      }, 700);
    };
    window.addEventListener(INTENT_EVENT, onIntent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(INTENT_EVENT, onIntent);
    };
  }, [open]);

  /* A field asked for focus before it existed (a detail field inside the
     panel that was closed): focus it once it renders. */
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key || key === 'message') return;
    pendingFocus.current = null;
    const el = key === 'name' ? nameRef.current : key === 'email' ? emailRef.current : detailRefs.current[key as DetailKey];
    el?.focus();
  });

  /* The draft, kept as it is typed: one per door, so switching doors never
     loses what was written behind the other. Debounced. */
  useEffect(() => {
    if (status === 'sent' || status === 'queued') return;
    const id = setTimeout(() => {
      try {
        const draft: Draft = { v: 2, variant, name, email, messages, details, attachment, savedAt: Date.now() };
        if (hasContent(draft)) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        else localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Storage unavailable (private mode): the form still works, it just forgets.
      }
    }, 400);
    return () => clearTimeout(id);
  }, [variant, name, email, messages, details, attachment, status]);

  /* The message box grows with what is written, to a limit. */
  useLayoutEffect(() => {
    const el = messageRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 380)}px`;
  }, [message, topic]);

  const validate = useCallback(
    (v: { name: string; email: string; message: string; details: ContactDetails }): Errors => {
      const e: Errors = {};
      if (!v.name.trim()) e.name = 'Please add your name.';
      if (!v.email.trim()) e.email = 'Please add your email, so I can reply.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'That doesn’t look like a full email address yet.';
      if (!v.message.trim()) e.message = 'Please write a line or two.';
      for (const f of fields) {
        const value = v.details[f.key]?.trim();
        if (f.kind === 'url' && value && !normaliseUrl(value)) e[f.key] = 'That doesn’t look like a link.';
      }
      return e;
    },
    [fields],
  );

  const current = { name, email, message, details: topicDetails };

  const noteStart = () => {
    if (topic && !started.current.has(topic)) {
      started.current.add(topic);
      event('form_start', { topic });
    }
  };

  const change = (field: FieldName, value: string) => {
    noteStart();
    const next = { ...current, details: { ...topicDetails } };
    if (field === 'name') setName((next.name = value));
    else if (field === 'email') setEmail((next.email = value));
    else if (field === 'message') {
      next.message = value;
      if (topic) setMessages((m) => ({ ...m, [topic]: value }));
    } else {
      next.details[field] = value;
      if (topic) setDetails((d) => ({ ...d, [topic]: { ...d[topic], [field]: value } }));
    }
    // Once a field has been judged, it is re-judged as it is fixed, so an
    // error disappears the moment it is no longer true.
    if (touched[field]) setErrors((e) => ({ ...e, [field]: validate(next)[field] }));
    if (status === 'failed') setFailure((f) => (f?.reason === 'invalid' ? null : f));
  };

  const blur = (field: FieldName) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validate(current)[field] }));
  };

  const suggestion = email.includes('@') ? suggestEmail(email.trim()) : null;

  const submission = (): ContactSubmission | null =>
    topic
      ? {
          topic,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          details: Object.fromEntries(
            Object.entries(topicDetails)
              .map(([k, v]) => [k, (DETAIL_FIELDS[topic].find((f) => f.key === k)?.kind === 'url' ? normaliseUrl(v ?? '') : v?.trim()) ?? ''])
              .filter(([, v]) => v),
          ) as ContactDetails,
          attachment: attachment ?? undefined,
          mentions: mentions.filter((id) => projectTitle(id)),
        }
      : null;

  const finish = useCallback(
    (out: Outgoing, confirmation: boolean) => {
      const sub = out.submission;
      setReceipt({
        topic: sub.topic,
        name: sub.name,
        email: sub.email,
        message: sub.message,
        attachment: sub.attachment?.label ?? null,
        mentions: out.mentionTitles,
        at: new Date(),
        confirmation,
      });
      setStatus('sent');
      setFailure(null);
      setMessages((m) => ({ ...m, [sub.topic]: '' }));
      setDetails((d) => ({ ...d, [sub.topic]: {} }));
      setAttachment(null);
      setMentions([]);
      setTouched({});
      setErrors({});
      setShowRestored(false);
      setDetailsOpen(false);
      clearDraft();
      clearOutbox();
      outbox.current = null;
      event('form_sent', { topic: sub.topic, hasAttachment: Boolean(sub.attachment), hasMentions: sub.mentions.length > 0 });
    },
    [],
  );

  const deliver = useCallback(
    async (out: Outgoing) => {
      setStatus('sending');
      const result = await sendContact(out);
      if (result.kind === 'sent') return finish(out, result.confirmation);
      if (result.kind === 'offline') {
        outbox.current = out;
        saveOutbox(out);
        setStatus('queued');
        event('form_failed', { reason: 'offline' });
        return;
      }
      setFailure({ reason: result.reason, error: result.error });
      setStatus('failed');
      event('form_failed', { reason: result.reason });
      if (result.field && ['name', 'email', 'message'].includes(result.field)) {
        setErrors((e) => ({ ...e, [result.field as FieldName]: result.error }));
        setTouched((t) => ({ ...t, [result.field as FieldName]: true }));
      }
    },
    [finish],
  );

  /* Offline: the message waits in the outbox and is sent once, when the
     browser says the connection is back. A second failure is shown as one. */
  useEffect(() => {
    if (status !== 'queued') return;
    const retry = () => {
      const out = outbox.current ?? readOutbox();
      if (out) void deliver(out);
    };
    window.addEventListener('online', retry, { once: true });
    return () => window.removeEventListener('online', retry);
  }, [status, deliver]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status === 'sending' || !topic) return;
    const found = validate(current);
    setErrors(found);
    setTouched({ name: true, email: true, message: true, ...Object.fromEntries(fields.map((f) => [f.key, true])) });
    const order: FieldName[] = ['name', 'email', 'message', ...fields.map((f) => f.key)];
    const first = order.find((k) => found[k]);
    if (first) {
      event('form_failed', { reason: 'validation' });
      // Focus goes to the first problem, so a screen reader hears where it is.
      if (first === 'name') nameRef.current?.focus();
      else if (first === 'email') emailRef.current?.focus();
      else if (first === 'message') messageRef.current?.focus();
      else {
        pendingFocus.current = first;
        setDetailsOpen(true);
      }
      return;
    }

    const sub = submission();
    if (!sub) return;
    const out: Outgoing = {
      submission: sub,
      mentionTitles: sub.mentions.map((id) => projectTitle(id) ?? id),
      requestId: newRequestId(),
      elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : 0,
      honeypot,
    };

    // Bot heuristics: a filled honeypot or an inhumanly fast submit both
    // "succeed" without sending, so a bot learns nothing.
    if (honeypot.trim() || out.elapsedMs < MIN_FILL_TIME_MS) {
      finish(out, false);
      return;
    }
    await deliver(out);
  };

  /* The doors are one radio group: arrow keys move the choice, as in any
     native radio set, and only the chosen door is in the tab order. */
  const onDoorKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + TOPIC_IDS.length) % TOPIC_IDS.length;
    open(TOPIC_IDS[next], 'door');
    doorRefs.current[next]?.focus();
  };
  const tabStop = (index: number) => (topic ? topic === TOPIC_IDS[index] : index === 0);

  const invalid = (field: FieldName) => Boolean(touched[field] && errors[field]);
  const describedBy = (field: FieldName, ...more: (string | false | null | undefined)[]) =>
    [invalid(field) && `contact-${field}-error`, ...more].filter(Boolean).join(' ') || undefined;

  /* A field is a line, not a box: a hairline at rest, ink when it has focus,
     the error colour when it is wrong. 16px below `md`, not a whim: iOS
     Safari zooms the page whenever a focused input renders under 16px. */
  const fieldClass = (field: FieldName) =>
    `w-full bg-transparent text-foreground text-base md:text-[1.0625rem] placeholder:text-muted-quiet outline-none focus-visible:outline-none border-0 border-b px-0 py-3 transition-[border-color] duration-300 ${
      invalid(field) ? 'border-status-error focus:border-status-error' : 'border-rule-strong hover:border-muted-foreground focus:border-foreground'
    }`;
  const label = (field: FieldName, children: React.ReactNode, extra?: React.ReactNode) => (
    <label htmlFor={`contact-${field}`} className="flex items-baseline justify-between gap-3 t-caption">
      <span>{children}</span>
      <span className="flex items-baseline gap-3">
        {invalid(field) && (
          <span id={`contact-${field}-error`} className="text-status-error">
            {errors[field]}
          </span>
        )}
        {extra}
      </span>
    </label>
  );

  const fade = prefersReduced ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };
  const reveal = prefersReduced
    ? {}
    : { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 } };

  const sub = topic ? submission() : null;
  const mentionTitles = mentions.map((id) => projectTitle(id)).filter((t): t is string => Boolean(t));
  const subject = topic ? subjectLine(topic, name, topicDetails.company) : '';
  const steps = NEXT_STEPS[topic ?? 'none'];

  return (
    <div ref={rootRef} className="scroll-mt-24">
      {/* ── The doors ── */}
      <div role="radiogroup" aria-label="What the message is about">
        <div className="grid grid-cols-1 md:grid-cols-2 border-y border-border">
          {DOORS.map((door, i) => {
            const on = topic === door.id;
            return (
              <button
                key={door.id}
                ref={(el) => {
                  doorRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={tabStop(i) ? 0 : -1}
                onClick={() => open(door.id, 'door')}
                onKeyDown={(e) => onDoorKey(e, i)}
                className={`group relative text-left py-9 md:py-11 transition-colors duration-300 focus-visible:outline-offset-[-2px] ${
                  i === 0 ? 'md:pr-12' : 'md:pl-12 border-t md:border-t-0 md:border-l border-border'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'contact-door'}
                    className={`absolute top-[-1px] h-px bg-foreground left-0 right-0 ${i === 0 ? 'md:right-12' : 'md:left-12'}`}
                    transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                    aria-hidden="true"
                  />
                )}
                <span className="flex items-start justify-between gap-6">
                  <span className={`t-heading transition-colors duration-300 ${topic && !on ? 'text-muted-foreground group-hover:text-foreground' : 'text-foreground'}`}>
                    {door.title}
                  </span>
                  <span
                    className={`mt-1.5 shrink-0 w-4 h-4 rounded-full border transition-colors duration-300 grid place-items-center ${
                      on ? 'border-foreground' : 'border-rule-strong group-hover:border-muted-foreground'
                    }`}
                    aria-hidden="true"
                  >
                    {on && <span className="w-2 h-2 rounded-full bg-foreground" />}
                  </span>
                </span>
                <span className="mt-3 block t-body max-w-[30rem]">{door.body}</span>
                <span className={`mt-6 inline-flex items-center gap-2 text-[15px] ${on ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`}>
                  <span className={on ? '' : 'link-draw'}>{on ? door.open : door.closed}</span>
                  {on ? (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pt-5">
          <button
            ref={(el) => {
              doorRefs.current[2] = el;
            }}
            type="button"
            role="radio"
            aria-checked={topic === 'other'}
            aria-describedby="contact-other-hint"
            tabIndex={tabStop(2) ? 0 : -1}
            onClick={() => open('other', 'door')}
            onKeyDown={(e) => onDoorKey(e, 2)}
            className="tap group inline-flex items-center gap-3 text-[15px] text-left"
          >
            <span
              className={`shrink-0 w-3.5 h-3.5 rounded-full border grid place-items-center transition-colors ${
                topic === 'other' ? 'border-foreground' : 'border-rule-strong group-hover:border-muted-foreground'
              }`}
              aria-hidden="true"
            >
              {topic === 'other' && <span className="w-1.5 h-1.5 rounded-full bg-foreground" />}
            </span>
            <span className={topic === 'other' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground transition-colors'}>
              Something else
            </span>
            <span id="contact-other-hint" className="hidden sm:inline t-caption">
              A question about a case study, or anything at all
            </span>
          </button>

          {/* Read first, write later: the CV and the work, outside the choice. */}
          <span className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <CVDownloadButton variant="ghost" />
            <a
              href="#projects"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                scrollToSection('projects');
              }}
              className="tap group inline-flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="link-draw">See what I have built</span>
              <ArrowRight className="nudge w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </span>
        </div>
      </div>

      {/* ── Behind the chosen door ── */}
      <AnimatePresence initial={false}>
        {topic && (
          <motion.div key="desk" ref={formRef} {...reveal} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="pt-12 md:pt-16">
              <AnimatePresence mode="wait" initial={false}>
                {status === 'sent' && receipt ? (
                  /* ── The receipt ── */
                  <motion.div key="receipt" {...fade} transition={{ duration: 0.35 }} role="status">
                    <p className="inline-flex items-center gap-2 t-caption text-status-ok">
                      <Check className="w-4 h-4" aria-hidden="true" /> Sent
                    </p>
                    <p className="mt-4 t-heading text-foreground">
                      Thanks, {receipt.name.split(/\s+/)[0]}. Your message has been sent.
                    </p>
                    <p className="mt-4 t-body max-w-prose">
                      I&rsquo;ll reply to <span className="text-foreground">{receipt.email}</span> within 1 working day.
                      {receipt.confirmation
                        ? ' A short confirmation is on its way there now, so you know it arrived.'
                        : ' If that address is wrong, just send it again with the right one. Writing twice does no harm.'}
                    </p>
                    <dl className="mt-8 border-t border-border text-[14px]">
                      {(
                        [
                          ['About', topicLabel(receipt.topic)],
                          ['Sent', receipt.at.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })],
                          ['Message', receipt.message],
                          ...(receipt.attachment ? [['Attached', receipt.attachment]] : []),
                          ...(receipt.mentions.length ? [['Mentioned', receipt.mentions.join(', ')]] : []),
                        ] as [string, string][]
                      ).map(([term, value]) => (
                        <div key={term} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-6 py-3 border-b border-border">
                          <dt className="t-caption">{term}</dt>
                          <dd className={term === 'Message' ? 'text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words' : 'text-foreground tabular-nums'}>
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      type="button"
                      onClick={() => setStatus('idle')}
                      className="tap group mt-8 inline-flex items-center gap-2 text-[15px] text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="link-draw">Write another</span>
                    </button>
                  </motion.div>
                ) : (
                  /* ── The form ── */
                  <motion.form key="form" {...fade} transition={{ duration: 0.35 }} onSubmit={submit} className="space-y-10 max-w-[46rem]" noValidate>
                    {/* Honeypot: invisible to people, irresistible to bots. */}
                    <div className="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
                      <label htmlFor="contact-website">Website</label>
                      <input
                        id="contact-website"
                        name="company_website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    {showRestored && status !== 'queued' && (
                      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 t-caption border-b border-border pb-3">
                        <span>
                          <span className="text-foreground">Your unsent message is back.</span> It was saved on this device only.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setName('');
                            setEmail('');
                            setMessages(blankMessages());
                            setDetails(blankDetails());
                            setAttachment(null);
                            setShowRestored(false);
                            clearDraft();
                          }}
                          className="tap text-foreground underline decoration-rule-strong underline-offset-4 hover:decoration-foreground transition-colors"
                        >
                          Clear it
                        </button>
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                      <div>
                        {label('name', 'Name')}
                        <input
                          ref={nameRef}
                          id="contact-name"
                          name="name"
                          type="text"
                          placeholder="Ada Okafor"
                          autoComplete="name"
                          required
                          maxLength={120}
                          aria-invalid={invalid('name') || undefined}
                          aria-describedby={describedBy('name')}
                          value={name}
                          onChange={(e) => change('name', e.target.value)}
                          onBlur={() => blur('name')}
                          className={fieldClass('name')}
                        />
                      </div>
                      <div>
                        {label('email', 'Email')}
                        <input
                          ref={emailRef}
                          id="contact-email"
                          name="email"
                          type="email"
                          inputMode="email"
                          placeholder="ada@company.com"
                          autoComplete="email"
                          spellCheck={false}
                          required
                          maxLength={254}
                          aria-invalid={invalid('email') || undefined}
                          aria-describedby={describedBy('email', suggestion && 'contact-email-suggestion')}
                          value={email}
                          onChange={(e) => change('email', e.target.value)}
                          onBlur={() => blur('email')}
                          className={fieldClass('email')}
                        />
                        {/* A near miss of a big provider, offered, never applied. */}
                        <AnimatePresence initial={false}>
                          {suggestion && (
                            <motion.p
                              id="contact-email-suggestion"
                              initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden t-caption"
                            >
                              <span className="block pt-2.5">
                                Did you mean{' '}
                                <button
                                  type="button"
                                  onClick={() => {
                                    change('email', suggestion);
                                    emailRef.current?.focus();
                                  }}
                                  className="text-foreground underline decoration-primary underline-offset-4 hover:decoration-foreground"
                                >
                                  {suggestion}
                                </button>
                                ?
                              </span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      {label(
                        'message',
                        'Message',
                        <span
                          id="contact-message-count"
                          className={`tabular-nums ${message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-status-warn' : 'text-muted-quiet'}`}
                        >
                          {message.length}/{MAX_MESSAGE_LENGTH}
                        </span>,
                      )}
                      <textarea
                        ref={messageRef}
                        id="contact-message"
                        name="message"
                        placeholder={intent.prompt}
                        rows={4}
                        required
                        maxLength={MAX_MESSAGE_LENGTH}
                        aria-invalid={invalid('message') || undefined}
                        // The character budget is described too, not just the error:
                        // it is information a sighted user gets for free.
                        aria-describedby={describedBy('message', 'contact-message-count')}
                        value={message}
                        onChange={(e) => change('message', e.target.value)}
                        onBlur={() => blur('message')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            void submit();
                          }
                        }}
                        className={`${fieldClass('message')} resize-none min-h-[120px] leading-relaxed`}
                      />
                    </div>

                    {/* What the assistant drafted: its own card, sent under its own heading. */}
                    <AnimatePresence initial={false}>
                      {attachment && (
                        <motion.div key="attachment" {...reveal} transition={{ duration: 0.3 }} className="overflow-hidden">
                          <div className="border border-border" role="group" aria-labelledby="contact-attachment-label">
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                              <p className="flex-1 min-w-0 text-[14px]">
                                <span id="contact-attachment-label" className="text-foreground">
                                  {attachment.label}
                                </span>
                                <span className="t-caption"> · attached, sent with your message</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachment(null);
                                  messageRef.current?.focus();
                                }}
                                aria-label={`Remove the ${attachment.label.toLowerCase()}`}
                                className="tap -mr-1.5 inline-flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                            <p
                              id="contact-attachment-text"
                              className={`px-4 pt-3 text-[13.5px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words ${
                                attachmentOpen ? 'max-h-[320px] overflow-y-auto' : 'line-clamp-3'
                              }`}
                              tabIndex={attachmentOpen ? 0 : undefined}
                            >
                              {/* Folded, blank lines would spend the three-line preview on nothing. */}
                              {attachmentOpen ? attachment.text : attachment.text.replace(/\n{2,}/g, '\n')}
                            </p>
                            <button
                              type="button"
                              aria-expanded={attachmentOpen}
                              aria-controls="contact-attachment-text"
                              onClick={() => setAttachmentOpen((o) => !o)}
                              className="tap px-4 pt-2 pb-3 t-caption text-foreground hover:underline underline-offset-4"
                            >
                              {attachmentOpen ? 'Show less' : 'Read all of it'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* What they read: offered from this visit, sent only if chosen. */}
                    {visits.length > 0 && (
                      <div role="group" aria-labelledby="contact-mentions-label" aria-describedby="contact-mentions-hint">
                        <p id="contact-mentions-label" className="t-caption">
                          Mention what you read
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {visits.map((id) => {
                            const on = mentions.includes(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setMentions((m) => (on ? m.filter((x) => x !== id) : [...m, id]))}
                                className={`tap inline-flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] border transition-colors duration-200 ${
                                  on ? 'border-foreground text-foreground' : 'border-border text-muted-foreground hover:border-rule-strong hover:text-foreground'
                                }`}
                              >
                                {on ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                                {projectTitle(id)}
                              </button>
                            );
                          })}
                        </div>
                        <p id="contact-mentions-hint" className="mt-2.5 t-caption">
                          {mentionTitles.length ? (
                            <>
                              Adds: <span className="text-foreground">Read on the site: {mentionTitles.join(', ')}</span>
                            </>
                          ) : (
                            'The case studies you opened. Choose any to add one line to your message.'
                          )}
                        </p>
                      </div>
                    )}

                    {/* Optional details, behind one button. */}
                    {fields.length > 0 && (
                      <div>
                        <button
                          type="button"
                          aria-expanded={detailsOpen}
                          aria-controls="contact-details"
                          onClick={() => setDetailsOpen((o) => !o)}
                          className="tap group inline-flex items-center gap-2 text-[15px] text-foreground"
                        >
                          <Plus className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${detailsOpen ? 'rotate-45' : ''}`} aria-hidden="true" />
                          <span className="link-draw">{detailsOpen ? 'Hide details' : 'Add details (optional)'}</span>
                          {filledDetails > 0 && <span className="t-caption tabular-nums">· {filledDetails} added</span>}
                        </button>
                        <AnimatePresence initial={false}>
                          {detailsOpen && (
                            <motion.div id="contact-details" key="details" {...reveal} transition={{ duration: 0.35 }} className="overflow-hidden">
                              <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-9">
                                {fields.map((f) =>
                                  f.kind === 'choice' ? (
                                    <div key={f.key} role="group" aria-labelledby={`contact-${f.key}-label`} className="sm:col-span-2">
                                      <p id={`contact-${f.key}-label`} className="t-caption">
                                        {f.label}
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {f.options?.map((option) => {
                                          const on = topicDetails[f.key] === option;
                                          return (
                                            <button
                                              key={option}
                                              type="button"
                                              aria-pressed={on}
                                              onClick={() => change(f.key, on ? '' : option)}
                                              className={`tap px-3 py-1.5 text-[13.5px] border transition-colors duration-200 ${
                                                on ? 'border-foreground text-foreground' : 'border-border text-muted-foreground hover:border-rule-strong hover:text-foreground'
                                              }`}
                                            >
                                              {option}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={f.key}>
                                      {label(f.key, f.label)}
                                      <input
                                        ref={(el) => {
                                          detailRefs.current[f.key] = el;
                                        }}
                                        id={`contact-${f.key}`}
                                        name={f.key}
                                        type={f.kind === 'url' ? 'url' : 'text'}
                                        inputMode={f.kind === 'url' ? 'url' : undefined}
                                        spellCheck={f.kind === 'url' ? false : undefined}
                                        autoComplete={f.key === 'company' ? 'organization' : 'off'}
                                        placeholder={f.placeholder}
                                        maxLength={f.max}
                                        aria-invalid={invalid(f.key) || undefined}
                                        aria-describedby={describedBy(f.key)}
                                        value={topicDetails[f.key] ?? ''}
                                        onChange={(e) => change(f.key, e.target.value)}
                                        onBlur={() => blur(f.key)}
                                        className={fieldClass(f.key)}
                                      />
                                    </div>
                                  ),
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Offline: the message waits here and goes when the connection is back. */}
                    <AnimatePresence initial={false}>
                      {status === 'queued' && (
                        <motion.div
                          role="status"
                          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-3 border-t border-status-warn/60 pt-4"
                        >
                          <CloudOff className="mt-0.5 w-4 h-4 text-status-warn shrink-0" aria-hidden="true" />
                          <p className="flex-1 text-[14px] text-foreground leading-snug">
                            Saved. It will send when you&rsquo;re back online.
                            <span className="block t-caption mt-1">Keep this tab open, or come back to it later.</span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* A failure keeps everything where it is, and offers the one route
                        that does not depend on this form working. */}
                    <AnimatePresence initial={false}>
                      {status === 'failed' && failure && sub && (
                        <motion.div
                          role="alert"
                          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-status-error/60 pt-4"
                        >
                          <AlertCircle className="w-4 h-4 text-status-error shrink-0" aria-hidden="true" />
                          <p className="flex-1 text-[14px] text-foreground leading-snug">
                            {FAILURES[failure.reason]}
                            {failure.reason === 'invalid' && failure.error ? ` ${failure.error}` : ''} Try again, or send it from your own email app.
                          </p>
                          <a
                            href={mailtoHref(to, subject, composePlainText(sub, mentionTitles))}
                            className="tap group inline-flex items-center gap-2 text-[14px] text-foreground shrink-0"
                          >
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                            <span className="link-draw">Send from my email app</span>
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div aria-live="polite" className="sr-only">
                      {status === 'sending' && 'Sending message…'}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                      <button
                        type="submit"
                        disabled={status === 'sending' || status === 'queued'}
                        className="btn-ink group w-full sm:w-auto min-w-[176px] disabled:cursor-wait"
                      >
                        {status === 'sending' ? (
                          <>
                            <span className="w-3.5 h-3.5 border-[1.5px] border-background/25 border-t-background rounded-full animate-spin" aria-hidden="true" />
                            <span>Sending</span>
                          </>
                        ) : status === 'failed' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Try again</span>
                          </>
                        ) : status === 'queued' ? (
                          <span>Waiting for a connection</span>
                        ) : (
                          <>
                            <span>Send message</span>
                            <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
                          </>
                        )}
                      </button>
                      <span className="hidden md:inline-flex items-center gap-1.5 t-caption">
                        <kbd className="kbd">{MOD}</kbd>
                        <kbd className="kbd">
                          <CornerDownLeft className="w-3 h-3" aria-label="Enter" />
                        </kbd>
                        <span className="ml-1">to send</span>
                      </span>
                      <span className="w-full t-caption">
                        Subject line: <span className="text-foreground">&ldquo;{subject}&rdquo;</span>
                      </span>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── What happens next ── */}
      <div className="mt-14 md:mt-20">
        <p className="t-caption">What happens next</p>
        <ol className={`mt-4 grid grid-cols-1 ${steps.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} border-t border-border`}>
          {steps.map((step, i) => (
            <li
              key={`${topic ?? 'none'}-${i}`}
              className={`flex sm:block items-baseline gap-4 py-4 sm:py-5 border-b sm:border-b-0 border-border ${i > 0 ? 'sm:pl-6 sm:border-l' : 'sm:pr-6'}`}
            >
              <span className="t-folio shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="sm:mt-3 block text-[15px] leading-snug text-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
