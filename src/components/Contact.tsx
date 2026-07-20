import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Github, Linkedin, Twitter,
  ArrowUpRight, Copy, CheckCircle2,
  Terminal, Send, AlertCircle,
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
    href: "https://x.com/_mrebuka",
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

const ContactForm = () => {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    `w-full bg-transparent text-white/80 text-sm placeholder:text-white/40 outline-none transition-all duration-300 border-b ${
      focused === name
        ? "border-primary/50 placeholder:text-white/50"
        : "border-white/[0.06] hover:border-white/[0.12]"
    } pb-3 pt-1`;

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-mono text-white/50 uppercase tracking-[0.15em] mb-2 block">
            Name
          </label>
          <input
            type="text"
            name="name"
            placeholder="Your name"
            required
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
            className={fieldClass("name")}
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-white/50 uppercase tracking-[0.15em] mb-2 block">
            Email
          </label>
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            required
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            className={fieldClass("email")}
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-mono text-white/20 uppercase tracking-[0.15em] mb-2 block">
          Message
        </label>
        <textarea
          name="message"
          placeholder="Tell me about your project..."
          rows={4}
          required
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          onFocus={() => setFocused("message")}
          onBlur={() => setFocused(null)}
          className={`${fieldClass("message")} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={formState === "submitting"}
        className="group/btn inline-flex items-center gap-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <AnimatePresence mode="wait">
          {formState === "submitting" ? (
            <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-[1.5px] border-white/20 border-t-white/70 rounded-full animate-spin" />
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
      // fallback
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
              <Terminal className="w-3.5 h-3.5" />
              <span>Contact</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90 mb-4">
              Let's work{" "}
              <span className="text-white/55">together.</span>
            </h2>
            <p className="text-sm text-white/55 max-w-md font-light leading-relaxed">
              Have a project in mind or looking for an engineer?
              I'd love to hear about it.
            </p>
          </motion.div>

          {/* Layout: stacked, not 2-column */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 lg:gap-20">

            {/* Left: email + socials */}
            <motion.div variants={stagger} className="lg:col-span-4 space-y-10">
              {/* Email */}
              <motion.div variants={fadeUp}>
                <div className="text-[10px] font-mono text-white/50 uppercase tracking-[0.15em] mb-3">
                  Email
                </div>
                <button
                  onClick={handleCopy}
                  className="group flex items-center gap-2.5 text-left"
                >
                  <span className="text-base font-medium text-white/70 group-hover:text-white transition-colors duration-300 border-b border-transparent group-hover:border-white/20 pb-0.5">
                    {EMAIL}
                  </span>
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </motion.div>
                    ) : (
                      <motion.div key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>

              {/* Social links */}
              <motion.div variants={fadeUp}>
                <div className="text-[10px] font-mono text-white/50 uppercase tracking-[0.15em] mb-3">
                  Elsewhere
                </div>
                <div className="flex flex-col gap-1">
                  {SOCIAL_LINKS.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 py-1.5 text-sm text-white/55 hover:text-white/80 transition-colors duration-300 w-fit"
                    >
                      <link.icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-50 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                  ))}
                </div>
              </motion.div>

              {/* Availability */}
              <motion.div
                variants={fadeUp}
                className="flex items-center gap-2 text-[11px] text-white/55 font-mono"
              >
                <span className="relative flex h-1.5 w-1.5">
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