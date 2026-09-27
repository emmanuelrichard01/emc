import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight, CheckCircle2, CornerDownLeft, Mail, RotateCcw, Send } from 'lucide-react';

import { INTENTS, mailtoHref, subjectFor, suggestEmail, type Intent } from './contactModel';

/* ==========================================================================
   CONTACT FORM

   Built around what goes wrong when someone writes to a stranger:

     · they are not sure what to say — so they choose what it is about
       first, and the prompt in the message box asks for the details that
       make a first reply useful for that kind of message
     · they mistype their address — so a near miss of a big provider is
       caught ("did you mean gmail.com?") before the reply bounces
     · they lose what they wrote — so the draft is kept on this device as
       they type, and restored if they leave and come back
     · the send fails — so the message stays exactly where it is, and the
       same message can be handed to their own mail app in one click
     · it succeeds — and they are told what happened, where the reply will
       go, and what they sent, rather than a button that says "Sent" for
       four seconds and then pretends nothing happened

   Formspree carries the message; a honeypot and a minimum fill time drop
   bots without telling them.
   ========================================================================== */

const ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT ?? 'https://formspree.io/f/xwvwpaaz';
const MAX_MESSAGE_LENGTH = 1000;
// Minimum time (ms) a real human takes to read the form and fill it out.
// Bots that fetch-and-post immediately fall under this and get silently dropped.
const MIN_FILL_TIME_MS = 1500;
const DRAFT_KEY = 'emc-contact-draft';
/** A draft older than this is not a draft any more; it is someone else's afternoon. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Fields {
  name: string;
  email: string;
  message: string;
}
type FieldName = keyof Fields;
type Errors = Partial<Record<FieldName, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'failed';

interface Draft extends Fields {
  intent: Intent['id'];
  savedAt: number;
}

const EMPTY: Fields = { name: '', email: '', message: '' };

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (Date.now() - d.savedAt > DRAFT_TTL_MS || !(d.name || d.email || d.message)) return null;
    return d;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable: nothing was saved, so nothing to clear.
  }
}

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Needed, so the reply can use it.';
  if (!f.email.trim()) e.email = 'Needed — it is where the reply goes.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'That does not look like an address yet.';
  if (!f.message.trim()) e.message = 'A line or two is enough.';
  return e;
}

/** ⌘ on Apple platforms, Ctrl everywhere else — for the send shortcut's label. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

export default function ContactForm({ email: to }: { email: string }) {
  const prefersReduced = useReducedMotion();
  const [restored] = useState(readDraft);
  const [intent, setIntent] = useState<Intent>(() => INTENTS.find((i) => i.id === restored?.intent) ?? INTENTS[0]);
  const [fields, setFields] = useState<Fields>(() => (restored ? { name: restored.name, email: restored.email, message: restored.message } : EMPTY));
  const [showRestored, setShowRestored] = useState(Boolean(restored));
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [receipt, setReceipt] = useState<{ intent: Intent; fields: Fields; at: Date } | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const mountedAt = useRef<number>(0);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };
  const intentRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  /* The draft, kept as it is typed. Debounced so a fast typist is not
     writing to storage on every keystroke. */
  useEffect(() => {
    if (status === 'sent') return;
    const id = setTimeout(() => {
      try {
        if (fields.name || fields.email || fields.message) {
          const draft: Draft = { ...fields, intent: intent.id, savedAt: Date.now() };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // Storage unavailable (private mode): the form still works, it just forgets.
      }
    }, 400);
    return () => clearTimeout(id);
  }, [fields, intent, status]);

  /* The message box grows with what is written, to a limit, so a long
     message is read as a whole rather than through a five-line slot. */
  useLayoutEffect(() => {
    const el = refs.message.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 380)}px`;
  }, [fields.message, refs.message]);

  const set = (name: FieldName, value: string) => {
    setFields((f) => ({ ...f, [name]: value }));
    // Once a field has been judged, it is re-judged as it is fixed, so an
    // error disappears the moment it is no longer true.
    if (touched[name]) setErrors((e) => ({ ...e, [name]: validate({ ...fields, [name]: value })[name] }));
  };

  const blur = (name: FieldName) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validate(fields)[name] }));
  };

  const suggestion = fields.email.includes('@') ? suggestEmail(fields.email.trim()) : null;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status === 'sending') return;
    const found = validate(fields);
    setErrors(found);
    setTouched({ name: true, email: true, message: true });
    const first = (['name', 'email', 'message'] as const).find((k) => found[k]);
    if (first) {
      // Focus goes to the first problem, so a screen reader hears where it is.
      refs[first].current?.focus();
      return;
    }

    const sent = () => {
      setReceipt({ intent, fields: { ...fields }, at: new Date() });
      setStatus('sent');
      setFields(EMPTY);
      setTouched({});
      setErrors({});
      setShowRestored(false);
      clearDraft();
    };

    // Bot heuristics: a filled honeypot or an inhumanly fast submit both
    // "succeed" without sending, so a bot learns nothing.
    if (honeypot.trim() || !mountedAt.current || Date.now() - mountedAt.current < MIN_FILL_TIME_MS) {
      sent();
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...fields, intent: intent.label, _subject: subjectFor(intent, fields.name) }),
      });
      if (res.ok) sent();
      else setStatus('failed');
    } catch {
      setStatus('failed');
    }
  };

  /* Intent is a radio group: arrow keys move the choice, as they do in any
     native radio set, and only the chosen option is in the tab order. */
  const onIntentKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + INTENTS.length) % INTENTS.length;
    setIntent(INTENTS[next]);
    intentRefs.current[next]?.focus();
  };

  const invalid = (name: FieldName) => Boolean(touched[name] && errors[name]);
  const fieldClass = (name: FieldName) =>
    /* 16px below `md`, not a whim: iOS Safari zooms the page whenever a
       focused input renders under 16px, and it does not zoom back out. */
    `w-full bg-card text-foreground text-base md:text-[13px] placeholder:text-muted-quiet outline-none border p-3 transition-[border-color,box-shadow] duration-200 ${
      invalid(name)
        ? 'border-destructive focus:border-destructive'
        : 'border-border hover:border-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]'
    }`;
  const label = (name: FieldName, children: React.ReactNode, extra?: React.ReactNode) => (
    <label htmlFor={`contact-${name}`} className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <span>{children}</span>
      <span className="flex items-center gap-3 normal-case tracking-normal">
        {invalid(name) && (
          <span id={`contact-${name}-error`} className="text-destructive">
            {errors[name]}
          </span>
        )}
        {extra}
      </span>
    </label>
  );

  const fade = prefersReduced ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'sent' && receipt ? (
        /* ── The receipt ── */
        <motion.div key="receipt" {...fade} transition={{ duration: 0.3 }} className="border border-border bg-card/40 p-6 md:p-8" role="status">
          <div className="flex items-center gap-3 text-status-ok">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Sent</span>
          </div>
          <p className="mt-4 text-xl text-foreground font-semibold tracking-tight">
            Thanks, {receipt.fields.name.trim().split(/\s+/)[0]}. It is in the inbox.
          </p>
          <p className="mt-2 text-[15px] md:text-[13px] text-muted-foreground font-light leading-relaxed max-w-prose">
            The reply will go to <span className="font-mono text-foreground">{receipt.fields.email}</span>. If that address
            is wrong, send again with the right one — nothing is lost by writing twice.
          </p>
          <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-border pt-5 font-mono text-[11px]">
            <dt className="text-muted-foreground uppercase tracking-widest text-[10px]">about</dt>
            <dd className="text-foreground">{receipt.intent.label}</dd>
            <dt className="text-muted-foreground uppercase tracking-widest text-[10px]">sent</dt>
            <dd className="text-foreground tabular-nums">
              {receipt.at.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </dd>
            <dt className="text-muted-foreground uppercase tracking-widest text-[10px]">message</dt>
            <dd className="text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">{receipt.fields.message}</dd>
          </dl>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="tap mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Write another
          </button>
        </motion.div>
      ) : (
        /* ── The form ── */
        <motion.form key="form" {...fade} transition={{ duration: 0.3 }} onSubmit={submit} className="space-y-6" noValidate>
          {/* Honeypot — invisible to real users, catnip for bots. */}
          <div className="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
            <label htmlFor="contact-company">Company</label>
            <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          {showRestored && (
            <div className="flex flex-wrap items-center justify-between gap-2 border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="text-foreground">Draft restored</span> — kept on this device from your last visit.
              </span>
              <button
                type="button"
                onClick={() => {
                  setFields(EMPTY);
                  setShowRestored(false);
                  clearDraft();
                }}
                className="tap px-1 text-primary hover:text-foreground transition-colors"
              >
                discard
              </button>
            </div>
          )}

          {/* What it is about */}
          <fieldset>
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">About</legend>
            <div role="radiogroup" aria-label="What the message is about" className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
              {INTENTS.map((option, i) => {
                const on = option.id === intent.id;
                return (
                  <button
                    key={option.id}
                    ref={(el) => {
                      intentRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setIntent(option)}
                    onKeyDown={(e) => onIntentKey(e, i)}
                    className={`tap relative px-3 py-2.5 font-mono text-[11px] text-left transition-colors ${
                      on ? 'bg-primary/10 text-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {on && (
                      <motion.span
                        layoutId={prefersReduced ? undefined : 'intent-edge'}
                        className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        aria-hidden="true"
                      />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              {label('name', 'Name')}
              <input
                ref={refs.name}
                id="contact-name"
                name="name"
                type="text"
                placeholder="Ada Okafor"
                autoComplete="name"
                required
                aria-invalid={invalid('name') || undefined}
                aria-describedby={invalid('name') ? 'contact-name-error' : undefined}
                value={fields.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => blur('name')}
                className={fieldClass('name')}
              />
            </div>
            <div>
              {label('email', 'Email')}
              <input
                ref={refs.email}
                id="contact-email"
                name="email"
                type="email"
                inputMode="email"
                placeholder="ada@company.com"
                autoComplete="email"
                spellCheck={false}
                required
                aria-invalid={invalid('email') || undefined}
                aria-describedby={[invalid('email') && 'contact-email-error', suggestion && 'contact-email-suggestion'].filter(Boolean).join(' ') || undefined}
                value={fields.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => blur('email')}
                className={fieldClass('email')}
              />
              {/* A near miss of a big provider, offered — never applied. */}
              <AnimatePresence initial={false}>
                {suggestion && (
                  <motion.p
                    id="contact-email-suggestion"
                    initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden font-mono text-[11px] text-muted-foreground"
                  >
                    <span className="block pt-2">
                      Did you mean{' '}
                      <button
                        type="button"
                        onClick={() => {
                          set('email', suggestion);
                          refs.email.current?.focus();
                        }}
                        className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
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
                className={`tabular-nums ${fields.message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-status-warn' : 'text-muted-foreground'}`}
              >
                {fields.message.length}/{MAX_MESSAGE_LENGTH}
              </span>,
            )}
            <textarea
              ref={refs.message}
              id="contact-message"
              name="message"
              placeholder={intent.prompt}
              rows={5}
              required
              maxLength={MAX_MESSAGE_LENGTH}
              aria-invalid={invalid('message') || undefined}
              // The character budget is described too, not just the error —
              // it is information a sighted user gets for free.
              aria-describedby={invalid('message') ? 'contact-message-error contact-message-count' : 'contact-message-count'}
              value={fields.message}
              onChange={(e) => set('message', e.target.value)}
              onBlur={() => blur('message')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className={`${fieldClass('message')} resize-none min-h-[132px]`}
            />
          </div>

          {/* A failure keeps everything where it is, and offers the one route
              that does not depend on this form working. */}
          <AnimatePresence initial={false}>
            {status === 'failed' && (
              <motion.div
                role="alert"
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 border border-destructive/50 bg-destructive/10 px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 text-status-error shrink-0" aria-hidden="true" />
                <p className="flex-1 text-[13px] text-foreground/90 leading-snug">
                  The message did not go through — it is still here. Try again, or send it from your own mail app.
                </p>
                <a
                  href={mailtoHref(to, subjectFor(intent, fields.name), `${fields.message}\n\n— ${fields.name}`)}
                  className="tap inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-primary hover:text-foreground transition-colors shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Open in mail
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <div aria-live="polite" className="sr-only">
            {status === 'sending' && 'Sending message…'}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-structural w-full sm:w-auto min-w-[168px] flex items-center justify-center gap-3 active:translate-y-px disabled:opacity-60 disabled:cursor-wait"
            >
              {status === 'sending' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-background/20 border-t-background rounded-full animate-spin" aria-hidden="true" />
                  <span>Sending</span>
                </>
              ) : status === 'failed' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Try again</span>
                </>
              ) : (
                <span className="group flex items-center gap-3">
                  <span>Send message</span>
                  <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </span>
              )}
            </button>
            <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <kbd className="border border-border px-1 py-px text-foreground/85">{MOD}</kbd>
              <kbd className="border border-border px-1 py-px text-foreground/85">
                <CornerDownLeft className="w-2.5 h-2.5 inline" aria-label="Enter" />
              </kbd>
              to send from the message
            </span>
            <span className="w-full font-mono text-[10px] text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-primary/80" aria-hidden="true" />
              Arrives as “{subjectFor(intent, fields.name)}”
            </span>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
