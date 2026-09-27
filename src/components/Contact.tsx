import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Linkedin, Copy, CheckCircle2, Terminal, Mail } from "lucide-react";
import { XLogo } from "@/components/ui/XLogo";
import { CVDownloadButton } from "@/components/ui/CVDownloadButton";
import ContactForm from "@/components/contact/ContactForm";
import { relativeZone } from "@/lib/lagosClock";
import { useLagosClock } from "@/lib/useLagosClock";

/* -------------------------------------------------------------------------- */
/* DATA                                                                       */
/* -------------------------------------------------------------------------- */

const SOCIAL_LINKS = [
  { id: "github", label: "GitHub", href: "https://github.com/emmanuelrichard01", icon: Github },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/", icon: Linkedin },
  { id: "twitter", label: "X", href: "https://x.com/mrebr", icon: XLogo },
];

const EMAIL = "emma.moghalu@gmail.com";

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

const Contact: React.FC = () => {
  const [copied, setCopied] = useState(false);
  /* The first practical question anyone writing has is when they will hear
     back. Rather than promise a turnaround, say what time it is where the
     reply will be written, and whether that is a working hour. */
  const clock = useLagosClock();
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
            <p className="text-[15px] md:text-[13px] text-muted-foreground max-w-md font-light leading-relaxed">
              Open to discussing data engineering challenges, architectural scaling, or new opportunities.
            </p>
            {/* Timezone up front — the first practical question anyone
                scheduling a call has — and now the time itself, live, with
                whether it is a working hour there. */}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
              <span>Abuja, Nigeria</span>
              <span aria-hidden="true">·</span>
              <span>
                <time className="text-foreground tabular-nums" aria-label={`${clock.time} in Abuja`}>{clock.time}</time> UTC+1
              </span>
              <span aria-hidden="true">·</span>
              <span className="normal-case tracking-normal text-[11px]">{relativeZone(clock.ahead)}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 ${clock.working ? "bg-status-ok status-live" : "bg-muted-foreground"}`}
                  aria-hidden="true"
                />
                {clock.working ? "working hours" : clock.weekend ? "the weekend" : "after hours"}
              </span>
              <span aria-hidden="true">·</span>
              <span>Remote &amp; hybrid</span>
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
                    copied ? 'border-status-ok/50' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span className="text-[13px] sm:text-sm font-mono text-foreground truncate">{EMAIL}</span>
                  <span className="flex items-center gap-3 shrink-0">
                  <a
                    href={`mailto:${EMAIL}`}
                    className="text-muted-foreground hover:text-primary transition-colors p-2.5 -m-2.5"
                    aria-label="Write from your mail app"
                    title="Write from your mail app"
                  >
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </a>
                  <button
                    onClick={handleCopy}
                    // A 16px icon, given a 36px target without moving it.
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-2.5 -m-2.5"
                    aria-label="Copy email address"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                          <CheckCircle2 className="w-4 h-4 text-status-ok" />
                        </motion.div>
                      ) : (
                        <motion.div key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                  </span>
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
              <ContactForm email={EMAIL} />
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;