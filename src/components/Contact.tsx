import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Github, Linkedin, Twitter,
  ArrowUpRight, Copy, CheckCircle2,
  Terminal, Send, AlertCircle, Download, Mail,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. DATA                                                                    */
/* -------------------------------------------------------------------------- */

const SOCIAL_LINKS = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/emmanuelrichard01",
    icon: Github,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/e-mc/",
    icon: Linkedin,
  },
  {
    id: "twitter",
    label: "X",
    href: "https://x.com/mrebr",
    icon: Twitter,
  },
];

const EMAIL = "emma.moghalu@gmail.com";
const FORMSPREE_ENDPOINT =
  import.meta.env.VITE_FORMSPREE_ENDPOINT ?? "https://formspree.io/f/xwvwpaaz";

/* -------------------------------------------------------------------------- */
/* 2. ANIMATION                                                               */
/* -------------------------------------------------------------------------- */

const ease = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

/* -------------------------------------------------------------------------- */
/* 3. CONTACT FORM                                                            */
/* -------------------------------------------------------------------------- */

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

const ContactForm = () => {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [focused, setFocused] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!formData.name.trim()) errs.name = "Name is required.";
    if (!formData.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Please enter a valid email address.";
    }
    if (!formData.message.trim()) errs.message = "Message is required.";
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

    if (Object.keys(fieldErrors).length > 0) return;

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
    `w-full bg-transparent text-white/90 text-sm placeholder:text-white/50 outline-none transition-all duration-300 border-b ${
      touched[name] && errors[name as keyof FieldErrors]
        ? "border-red-400/60"
        : focused === name
        ? "border-primary/50 placeholder:text-white/50"
        : "border-white/[0.08] hover:border-white/[0.15]"
    } pb-3 pt-1`;

  const showError = (field: keyof FieldErrors) =>
    touched[field] && errors[field];

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-name" className="text-[10px] font-mono text-white/60 uppercase tracking-[0.15em] mb-2 block">
            Name <span className="text-red-400" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            name="name"
            placeholder="Your name"
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            onFocus={() => setFocused("name")}
            onBlur={() => handleBlur("name")}
            className={fieldClass("name")}
            aria-required="true"
            aria-invalid={showError("name") ? "true" : undefined}
            aria-describedby={showError("name") ? "name-error" : undefined}
          />
          {showError("name") && (
            <p id="name-error" className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className="text-[10px] font-mono text-white/60 uppercase tracking-[0.15em] mb-2 block">
            Email <span className="text-red-400" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            onFocus={() => setFocused("email")}
            onBlur={() => handleBlur("email")}
            className={fieldClass("email")}
            aria-required="true"
            aria-invalid={showError("email") ? "true" : undefined}
            aria-describedby={showError("email") ? "email-error" : undefined}
          />
          {showError("email") && (
            <p id="email-error" className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3 shrink-0" /> {errors.email}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="text-[10px] font-mono text-white/60 uppercase tracking-[0.15em] mb-2 block">
          Message <span className="text-red-400" aria-hidden="true">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          placeholder="Tell me about your project..."
          rows={4}
          required
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          onFocus={() => setFocused("message")}
          onBlur={() => handleBlur("message")}
          className={`${fieldClass("message")} resize-none`}
          aria-required="true"
          aria-invalid={showError("message") ? "true" : undefined}
          aria-describedby={showError("message") ? "message-error" : undefined}
        />
        {showError("message") && (
          <p id="message-error" className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
            <AlertCircle className="w-3 h-3 shrink-0" /> {errors.message}
          </p>
        )}
      </div>

      {/* Status region — announced to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {formState === "submitting" && "Sending your message..."}
        {formState === "success" && "Message sent successfully!"}
        {formState === "error" && "Failed to send message. Please try again."}
      </div>

      <button
        type="submit"
        disabled={formState === "submitting"}
        className="group/btn inline-flex items-center gap-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] px-2"
      >
        <AnimatePresence mode="wait">
          {formState === "submitting" ? (
            <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-[1.5px] border-white/20 border-t-white/70 rounded-full animate-spin" role="status" aria-label="Sending" />
              Sending...
            </motion.span>
          ) : formState === "success" ? (
            <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Message sent
            </motion.span>
          ) : formState === "error" ? (
            <motion.span key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Failed — try again
            </motion.span>
          ) : (
            <motion.span key="go" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              Send message
              <Send className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </form>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. MAIN                                                                    */
/* -------------------------------------------------------------------------- */

const Contact: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
    } catch {
      // Fallback: open mailto instead
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
    <section id="contact" data-section="contact" className="py-20 sm:py-24 md:py-32 relative overflow-hidden" aria-label="Contact information">
      <div ref={ref} className="container px-4 md:px-6 max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
        >
          {/* Header */}
          <motion.div variants={fadeUp} className="mb-12 sm:mb-16 md:mb-20">
            <div className="flex items-center gap-2 text-primary/60 font-mono text-[10px] tracking-[0.2em] uppercase mb-4">
              <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Contact</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90 mb-4">
              Let's work{" "}
              <span className="text-white/60">together.</span>
            </h2>
            <p className="text-sm text-white/60 max-w-md font-light leading-relaxed">
              Have a project in mind or looking for an engineer?
              I'd love to hear about it.
            </p>
          </motion.div>

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 lg:gap-20">

            {/* Left: email + socials */}
            <motion.div variants={stagger} className="lg:col-span-4 space-y-10">
              {/* Email — direct mailto link + copy button */}
              <motion.div variants={fadeUp}>
                <div className="text-[10px] font-mono text-white/60 uppercase tracking-[0.15em] mb-3">
                  Email
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:${EMAIL}`}
                    className="text-base font-medium text-white/70 hover:text-white transition-colors duration-300 border-b border-transparent hover:border-white/20 pb-0.5"
                  >
                    {EMAIL}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={copied ? "Email copied to clipboard" : "Copy email to clipboard"}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </motion.div>
                      ) : (
                        <motion.div key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="w-4 h-4 text-white/50 hover:text-white/70 transition-colors" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                {/* Live region for copy confirmation */}
                <div aria-live="polite" className="sr-only">
                  {copied ? "Email address copied to clipboard" : ""}
                </div>
              </motion.div>

              {/* Social links */}
              <motion.div variants={fadeUp}>
                <div className="text-[10px] font-mono text-white/60 uppercase tracking-[0.15em] mb-3">
                  Elsewhere
                </div>
                <div className="flex flex-col gap-1">
                  {SOCIAL_LINKS.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 py-2 text-sm text-white/60 hover:text-white/90 transition-colors duration-300 w-fit min-h-[44px]"
                      aria-label={`${link.label} (opens in new tab)`}
                    >
                      <link.icon className="w-4 h-4" aria-hidden="true" />
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-50 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </motion.div>

              {/* Resume download */}
              <motion.div variants={fadeUp}>
                <div className="text-[10px] font-mono text-white/60 uppercase tracking-[0.15em] mb-3">
                  Resume
                </div>
                <a
                  href="/Emmanuel_Moghalu_CV.pdf"
                  download="Emmanuel_Moghalu_CV.pdf"
                  className="group inline-flex items-center gap-2 py-2 text-sm text-white/60 hover:text-white/90 transition-colors duration-300 min-h-[44px]"
                  aria-label="Download Emmanuel Moghalu's CV as PDF"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download CV</span>
                  <span className="text-[9px] font-mono text-white/40 ml-1">(PDF)</span>
                </a>
              </motion.div>

              {/* Availability */}
              <motion.div
                variants={fadeUp}
                className="flex items-center gap-2 text-[11px] text-white/60 font-mono"
              >
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Available for work
              </motion.div>
            </motion.div>

            {/* Right: form */}
            <motion.div variants={fadeUp} className="lg:col-span-8">
              <ContactForm />
            </motion.div>

          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;