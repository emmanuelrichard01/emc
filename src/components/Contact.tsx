import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Github, Linkedin, Twitter,
  ArrowUpRight, Copy, CheckCircle2,
  MapPin, Terminal, MessageSquare, Send, AlertCircle
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. DATA: CONNECTION PROTOCOLS                                              */
/* -------------------------------------------------------------------------- */

const SOCIAL_LINKS = [
  {
    id: "github",
    label: "GitHub",
    context: "Production Code & Systems",
    href: "https://github.com/emmanuelrichard01",
    icon: Github
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    context: "Professional Context & Roles",
    href: "https://www.linkedin.com/in/e-mc/",
    icon: Linkedin
  },
  {
    id: "twitter",
    label: "X / Twitter",
    context: "Thoughts & Engineering",
    href: "https://x.com/_mrebuka",
    icon: Twitter
  }
];

const EMAIL = "emma.moghalu@gmail.com";
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xwvwpaaz";

/* -------------------------------------------------------------------------- */
/* 2. UI COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

// Copyable Email Component
const EmailDisplay = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative inline-flex flex-col items-start gap-3">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
        <Mail className="w-3.5 h-3.5" /> Primary Channel
      </div>

      <button
        onClick={handleCopy}
        className="relative flex items-center gap-4 text-xl md:text-4xl font-bold text-foreground hover:text-primary transition-colors text-left"
      >
        <span className="border-b-2 border-transparent group-hover:border-primary/20 pb-1 transition-all">
          {EMAIL}
        </span>
        <div className="relative p-2 rounded-full bg-secondary/30 text-muted-foreground group-hover:text-foreground group-hover:bg-secondary/60 transition-all">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              >
                <Copy className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tooltip Feedback */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg whitespace-nowrap hidden sm:block"
            >
              Copied to Clipboard!
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <p className="text-sm text-muted-foreground max-w-md">
        Best for role inquiries, technical collaborations, and deep-dive engineering discussions.
      </p>
    </div>
  );
};

// Contact Form Component
const ContactForm = () => {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormState('success');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setFormState('idle'), 4000);
      } else {
        setFormState('error');
        setTimeout(() => setFormState('idle'), 4000);
      }
    } catch {
      setFormState('error');
      setTimeout(() => setFormState('idle'), 4000);
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-white/50 dark:bg-white/5 backdrop-blur-sm p-6 hover:border-primary/20 transition-all duration-300">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
          <Terminal className="w-3.5 h-3.5" /> Direct Message
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
          />
        </div>

        <textarea
          name="message"
          placeholder="What are you building?"
          rows={4}
          required
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all resize-none"
        />

        <button
          type="submit"
          disabled={formState === 'submitting'}
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-medium text-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <AnimatePresence mode="wait">
            {formState === 'submitting' ? (
              <motion.span key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Transmitting...
              </motion.span>
            ) : formState === 'success' ? (
              <motion.span key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Message Sent
              </motion.span>
            ) : formState === 'error' ? (
              <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                Transmission Failed
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                Send Message
                <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. MAIN COMPONENT                                                          */
/* -------------------------------------------------------------------------- */

const Contact: React.FC = () => {
  return (
    <section id="contact" data-section="contact" className="py-24 md:py-32 bg-background relative overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* LEFT: INTENT FRAMING */}
          <div className="space-y-12">
            <div>
              <div className="flex items-center gap-2 text-primary font-mono text-xs tracking-widest mb-6">
                <MessageSquare className="w-4 h-4" />
                <span>INITIATE_HANDSHAKE</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
                Let's build something <br />
                <span className="text-muted-foreground">solid.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                I'm interested in meaningful work—resilient systems, thoughtful teams, and problems worth solving. If you're building a serious product or engineering team, I'd love to hear from you.
              </p>
            </div>

            <EmailDisplay />

            {/* Contact Form */}
            <ContactForm />

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/20 w-fit px-4 py-2 rounded-full border border-border/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Available for Full-time Roles & Select Projects</span>
            </div>
          </div>

          {/* RIGHT: CONTEXTUAL LINKS */}
          <div className="lg:pl-12 flex flex-col justify-center space-y-8">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Additional Protocols
            </div>

            <div className="space-y-4">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-5 rounded-xl border border-border/50 bg-secondary/5 hover:bg-secondary/20 hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-background border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors">
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {link.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {link.context}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </a>
              ))}
            </div>

            {/* Location Signal */}
            <div className="mt-8 pt-8 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Abuja, Nigeria (Remote Ready)</span>
              </div>
              <div className="font-mono text-xs opacity-50">
                UTC+1
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Contact;