import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github, Linkedin,
  Copy, CheckCircle2,
  Terminal, Send, AlertCircle
} from "lucide-react";
import { XLogo } from "@/components/ui/XLogo";
import { CVDownloadButton } from "@/components/ui/CVDownloadButton";

/* -------------------------------------------------------------------------- */
/* DATA                                                                       */
/* -------------------------------------------------------------------------- */

const SOCIAL_LINKS = [
  { id: "github", label: "GitHub", href: "https://github.com/emmanuelrichard01", icon: Github },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/", icon: Linkedin },
  { id: "twitter", label: "X", href: "https://x.com/mrebr", icon: XLogo },
];

const EMAIL = "emma.moghalu@gmail.com";
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT ?? "https://formspree.io/f/xwvwpaaz";

/* -------------------------------------------------------------------------- */
/* CONTACT FORM                                                               */
/* -------------------------------------------------------------------------- */

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

const MAX_MESSAGE_LENGTH = 1000;

// Minimum time (ms) a real human takes to read the form and fill it out.
// Bots that fetch-and-post immediately fall under this and get silently dropped.
const MIN_FILL_TIME_MS = 1500;

const ContactForm = () => {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const mountedAt = useRef<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!formData.name.trim()) errs.name = "Required.";
    if (!formData.email.trim()) {
      errs.email = "Required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Invalid format.";
    }
    if (!formData.message.trim()) errs.message = "Required.";
    return errs;
  };

  const handleBlur = (field: string) => {
    setFocused(null);
    setTouched((t) => ({ ...t, [field]: true }));
    const fieldErrors = validate();
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field as keyof FieldErrors] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    setTouched({ name: true, email: true, message: true });

    if (Object.keys(fieldErrors).length > 0) {
      // Move focus to the first field that needs attention. Without this,
      // submitting an invalid form leaves focus on the button and a screen
      // reader user is told nothing about where the problem is.
      if (fieldErrors.name) nameRef.current?.focus();
      else if (fieldErrors.email) emailRef.current?.focus();
      else if (fieldErrors.message) messageRef.current?.focus();
      return;
    }

    // Bot heuristics: a filled honeypot or an inhumanly fast submit both
    // silently "succeed" without ever hitting Formspree, so bots get no
    // signal that they were caught while real users are never blocked.
    const isLikelyBot = honeypot.trim().length > 0 || mountedAt.current === null || Date.now() - mountedAt.current < MIN_FILL_TIME_MS;
    if (isLikelyBot) {
      setFormState("success");
      setFormData({ name: "", email: "", message: "" });
      setTouched({});
      setErrors({});
      setTimeout(() => setFormState("idle"), 4000);
      return;
    }

    setFormState("submitting");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormState("success");
        setFormData({ name: "", email: "", message: "" });
        setTouched({});
        setErrors({});
        setTimeout(() => setFormState("idle"), 4000);
      } else {
        setFormState("error");
        setTimeout(() => setFormState("idle"), 4000);
      }
    } catch {
      setFormState("error");
      setTimeout(() => setFormState("idle"), 4000);
    }
  };

  const fieldClass = (name: string) =>
    `w-full bg-card text-foreground text-[13px] placeholder:text-muted-foreground/50 outline-none transition-all border ${
      touched[name] && errors[name as keyof FieldErrors]
        ? "border-destructive focus:border-destructive"
        : focused === name
        ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
        : "border-border hover:border-muted-foreground"
    } p-3 rounded-none`;

  const showError = (field: keyof FieldErrors) => touched[field] && errors[field];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Honeypot — invisible to real users, catnip for bots. */}
      <div className="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-name" className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Name</span>
            {/* The error carries an id so the input can point at it. It was
                previously only visually adjacent, which tells a sighted user
                everything and a screen reader user nothing. */}
            {showError("name") && (
              <span id="contact-name-error" className="text-destructive tracking-normal normal-case">
                {errors.name}
              </span>
            )}
          </label>
          <input
            ref={nameRef}
            id="contact-name"
            type="text"
            name="name"
            placeholder="John Doe"
            required
            autoComplete="name"
            aria-invalid={showError("name") ? true : undefined}
            aria-describedby={showError("name") ? "contact-name-error" : undefined}
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            onFocus={() => setFocused("name")}
            onBlur={() => handleBlur("name")}
            className={fieldClass("name")}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Email</span>
            {showError("email") && (
              <span id="contact-email-error" className="text-destructive tracking-normal normal-case">
                {errors.email}
              </span>
            )}
          </label>
          <input
            ref={emailRef}
            id="contact-email"
            type="email"
            name="email"
            placeholder="john@example.com"
            required
            autoComplete="email"
            aria-invalid={showError("email") ? true : undefined}
            aria-describedby={showError("email") ? "contact-email-error" : undefined}
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            onFocus={() => setFocused("email")}
            onBlur={() => handleBlur("email")}
            className={fieldClass("email")}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>Message</span>
          <span className="flex items-center gap-2">
            {showError("message") && (
              <span id="contact-message-error" className="text-destructive tracking-normal normal-case">
                {errors.message}
              </span>
            )}
            <span
              id="contact-message-count"
              className={`tracking-normal normal-case ${formData.message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-amber-400' : 'text-muted-foreground'}`}
            >
              {formData.message.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </span>
        </label>
        <textarea
          ref={messageRef}
          id="contact-message"
          name="message"
          placeholder="Tell me about your project or opportunity..."
          rows={5}
          required
          maxLength={MAX_MESSAGE_LENGTH}
          aria-invalid={showError("message") ? true : undefined}
          // The character budget is described too, not just the error — it is
          // information about the field that a sighted user gets for free.
          aria-describedby={
            showError("message") ? "contact-message-error contact-message-count" : "contact-message-count"
          }
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          onFocus={() => setFocused("message")}
          onBlur={() => handleBlur("message")}
          className={`${fieldClass("message")} resize-none`}
        />
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {formState === "submitting" && "Sending message..."}
        {formState === "success" && "Message sent successfully."}
        {formState === "error" && "Failed to send message."}
      </div>

      <button
        type="submit"
        disabled={formState === "submitting"}
        className="btn-structural w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <AnimatePresence mode="wait">
          {formState === "submitting" ? (
            <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-background/20 border-t-background rounded-full animate-spin" />
              <span>Sending</span>
            </motion.span>
          ) : formState === "success" ? (
            <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sent</span>
            </motion.span>
          ) : formState === "error" ? (
            <motion.span key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>Failed — Retry</span>
            </motion.span>
          ) : (
            <motion.span key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 group">
              <span>Send Message</span>
              <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </form>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

const Contact: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <section id="contact" data-section="contact" className="py-24 relative overflow-hidden" aria-label="Contact information">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>

          {/* Header */}
          <div className="mb-16 border-b border-border pb-8">
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
              <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Module 04 // Connect</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Let's <span className="text-muted-foreground font-mono font-normal">Talk</span>
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-md font-light leading-relaxed">
              Open to discussing data engineering challenges, architectural scaling, or new opportunities.
            </p>
            {/* Timezone up front — the first practical question anyone
                scheduling a call has, and it saves an email to ask it. */}
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
              Abuja, Nigeria — UTC+1 · Remote &amp; hybrid
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

            {/* Left: Info */}
            <div className="lg:col-span-4 space-y-10">

              {/* Email */}
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4">
                  // Email
                </div>
                <div
                  className={`flex items-center justify-between border bg-card px-4 py-3 group overflow-hidden gap-2 transition-all ${
                    copied ? 'border-emerald-500/50' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span className="text-[13px] sm:text-sm font-mono text-foreground truncate">{EMAIL}</span>
                  <button
                    onClick={handleCopy}
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    aria-label="Copy email address"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <motion.div key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {/* Socials */}
              <div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4">
                  // Socials
                </div>
                {/* Three tiles rather than three full-width rows.

                    Stacked, the socials made five near-identical bordered
                    boxes down this column — email, three links, CV — so the
                    two blocks that are actually actions read with exactly the
                    same weight as the three that are just links. Sitting them
                    side by side subordinates them and returns about ninety
                    vertical pixels to the column. */}
                <div className="grid grid-cols-3 gap-2">
                  {SOCIAL_LINKS.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center justify-center gap-2 border border-border bg-card py-4 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                    >
                      <link.icon className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider font-mono">{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Download CV */}
              <CVDownloadButton variant="card" />
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-8">
              {/* The form is two thirds of the section and was the only block
                  in it without a heading, so the column that matters most
                  opened on an unlabelled input while every smaller block
                  beside it announced itself. */}
              <div className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4">
                // Message
              </div>
              <ContactForm />
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;