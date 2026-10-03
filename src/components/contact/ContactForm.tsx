import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, CornerDownLeft, Mail, RotateCcw } from 'lucide-react';

import { INTENT_EVENT, INTENTS, mailtoHref, subjectFor, suggestEmail, type Intent } from './contactModel';
import { scrollToY } from '@/lib/smoothScroll';

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
  if (!f.name.trim()) e.name = 'Please add your name.';
  if (!f.email.trim()) e.email = 'Please add your email, so I can reply.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "That doesn't look like a full email address yet.";
  if (!f.message.trim()) e.message = 'Please write a line or two.';
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  /* A door was chosen: switch the topic, bring the form up, and put the
     cursor where the writing happens. Focus waits for the scroll to land so
     the browser does not jump the page to the field first. */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onIntent = (event: Event) => {
      const next = INTENTS.find((i) => i.id === (event as CustomEvent<Intent['id']>).detail);
      if (!next) return;
      setIntent(next);
      setStatus((current) => (current === 'sent' ? 'idle' : current));
      const el = rootRef.current;
      if (el) scrollToY(Math.max(0, el.getBoundingClientRect().top + window.scrollY - 120));
      clearTimeout(timer);
      timer = setTimeout(() => refs.message.current?.focus({ preventScroll: true }), 700);
    };
    window.addEventListener(INTENT_EVENT, onIntent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(INTENT_EVENT, onIntent);
    };
  }, [refs.message]);

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
  /* A field is a line, not a box: a hairline at rest, ink when it has focus,
     the error colour when it is wrong. 16px below `md`, not a whim: iOS
     Safari zooms the page whenever a focused input renders under 16px. */
  const fieldClass = (name: FieldName) =>
    `w-full bg-transparent text-foreground text-base md:text-[1.0625rem] placeholder:text-muted-quiet outline-none focus-visible:outline-none border-0 border-b px-0 py-3 transition-[border-color] duration-300 ${
      invalid(name)
        ? 'border-status-error focus:border-status-error'
        : 'border-rule-strong hover:border-muted-foreground focus:border-foreground'
    }`;
  const label = (name: FieldName, children: React.ReactNode, extra?: React.ReactNode) => (
    <label htmlFor={`contact-${name}`} className="flex items-baseline justify-between gap-3 t-caption">
      <span>{children}</span>
      <span className="flex items-baseline gap-3">
        {invalid(name) && (
          <span id={`contact-${name}-error`} className="text-status-error">
            {errors[name]}
          </span>
        )}
        {extra}
      </span>
    </label>
  );

  const fade = prefersReduced ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

  return (
    <div ref={rootRef}>
      <AnimatePresence mode="wait" initial={false}>
        {status === 'sent' && receipt ? (
          /* ── The receipt ── */
          <motion.div key="receipt" {...fade} transition={{ duration: 0.35 }} className="border-t border-border pt-8" role="status">
            <p className="inline-flex items-center gap-2 t-caption text-status-ok">
              <Check className="w-4 h-4" aria-hidden="true" /> Sent
            </p>
            <p className="mt-4 t-heading text-foreground">
              Thanks, {receipt.fields.name.trim().split(/\s+/)[0]}. Your message has been sent.
            </p>
            <p className="mt-4 t-body max-w-prose">
              I&rsquo;ll reply to <span className="text-foreground">{receipt.fields.email}</span>. If that address is
              wrong, just send it again with the right one. Writing twice does no harm.
            </p>
            <dl className="mt-8 border-t border-border text-[14px]">
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-6 py-3 border-b border-border">
                <dt className="t-caption">About</dt>
                <dd className="text-foreground">{receipt.intent.label}</dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-6 py-3 border-b border-border">
                <dt className="t-caption">Sent</dt>
                <dd className="text-foreground tabular-nums">
                  {receipt.at.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-6 py-3 border-b border-border">
                <dt className="t-caption">Message</dt>
                <dd className="text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">{receipt.fields.message}</dd>
              </div>
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
          <motion.form key="form" {...fade} transition={{ duration: 0.35 }} onSubmit={submit} className="space-y-10" noValidate>
            {/* Honeypot — invisible to real users, catnip for bots. */}
            <div className="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
              <label htmlFor="contact-company">Company</label>
              <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            {showRestored && (
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 t-caption border-b border-border pb-3">
                <span>
                  <span className="text-foreground">Your unsent message is back.</span> It was saved on this device only.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFields(EMPTY);
                    setShowRestored(false);
                    clearDraft();
                  }}
                  className="tap text-foreground underline decoration-rule-strong underline-offset-4 hover:decoration-foreground transition-colors"
                >
                  Clear it
                </button>
              </p>
            )}

            {/* What it is about */}
            <fieldset>
              <legend className="t-caption mb-4">What&rsquo;s this about?</legend>
              <div role="radiogroup" aria-label="What the message is about" className="flex flex-wrap gap-x-7 gap-y-1">
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
                      className={`tap relative py-2 text-[15px] transition-colors duration-300 ${
                        on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option.label}
                      {on && (
                        <motion.span
                          layoutId={prefersReduced ? undefined : 'intent-underline'}
                          className="absolute left-0 right-0 bottom-0.5 h-px bg-foreground"
                          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
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
                      className="overflow-hidden t-caption"
                    >
                      <span className="block pt-2.5">
                        Did you mean{' '}
                        <button
                          type="button"
                          onClick={() => {
                            set('email', suggestion);
                            refs.email.current?.focus();
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
                  className={`tabular-nums ${fields.message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-status-warn' : 'text-muted-quiet'}`}
                >
                  {fields.message.length}/{MAX_MESSAGE_LENGTH}
                </span>,
              )}
              <textarea
                ref={refs.message}
                id="contact-message"
                name="message"
                placeholder={intent.prompt}
                rows={4}
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
                className={`${fieldClass('message')} resize-none min-h-[120px] leading-relaxed`}
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
                  className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-status-error/60 pt-4"
                >
                  <AlertCircle className="w-4 h-4 text-status-error shrink-0" aria-hidden="true" />
                  <p className="flex-1 text-[14px] text-foreground leading-snug">
                    Your message didn&rsquo;t send, but it&rsquo;s still here. Try again, or send it from your own email app.
                  </p>
                  <a
                    href={mailtoHref(to, subjectFor(intent, fields.name), `${fields.message}\n\n${fields.name}`)}
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
                disabled={status === 'sending'}
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
                Subject line: <span className="text-foreground">&ldquo;{subjectFor(intent, fields.name)}&rdquo;</span>
              </span>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
