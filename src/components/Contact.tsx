import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

import { CVDownloadButton } from "@/components/ui/CVDownloadButton";
import ContactForm from "@/components/contact/ContactForm";
import { requestIntent } from "@/components/contact/contactModel";
import { scrollToSection } from "@/lib/scrollToSection";
import { Reveal, RevealText, Rule } from "@/components/ui/Reveal";
import { relativeZone } from "@/lib/lagosClock";
import { useLagosClock } from "@/lib/useLagosClock";

/* ==========================================================================
   CONTACT — the closing invitation

   The monograph ends on one large line and two doors of equal weight,
   because the page is read by two kinds of visitor with two different next
   steps:

     hiring     the CV, and a message about a role
     building   a message about a project

   Neither door is the "main" one. Both lead to the same form; the door only
   chooses what the message is about, so the prompt in the message box asks
   for the details that make a first reply useful.

   Below them: the address itself, set large enough to read and copy, the
   profiles as plain links, the local time in Abuja (the honest answer to
   "when will I hear back"), and the form.
   ========================================================================== */

const SOCIAL_LINKS = [
  { id: "github", label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { id: "twitter", label: "X", href: "https://x.com/mrebr" },
];

const EMAIL = "emma.moghalu@gmail.com";

const Contact: React.FC = () => {
  const [copied, setCopied] = useState(false);
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

  const status = clock.working ? "working hours" : clock.weekend ? "the weekend" : "after hours";
  const statusSentence = clock.working
    ? "That's within working hours."
    : clock.weekend
      ? "It's the weekend there."
      : "It's outside working hours there.";

  return (
    <section
      id="contact"
      data-section="contact"
      className="relative section-y page-x"
      aria-labelledby="contact-title"
    >
      <div className="page-max">
        {/* ── The line ── */}
        <div className="flex items-center justify-between gap-6 mb-12 md:mb-16">
          <Rule className="flex-1" />
          <Reveal y={0} delay={0.3} className="shrink-0 t-caption tabular-nums">
            <span className="inline-flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 ${clock.working ? "bg-status-ok status-live" : "bg-muted-quiet"}`}
                aria-hidden="true"
              />
              <span>
                Abuja <time className="text-foreground">{clock.time}</time>
                <span className="hidden sm:inline"> · {status}</span>
              </span>
            </span>
          </Reveal>
        </div>

        <RevealText as="h2" id="contact-title" className="t-display text-foreground max-w-[14ch]">
          Let&rsquo;s build something that stays correct.
        </RevealText>

        <Reveal delay={0.2} className="mt-8 md:mt-10 max-w-[38rem] t-lede text-muted-foreground">
          Hiring for a data or backend role, or have a system that needs building? Either way, a few lines are
          enough to start.
        </Reveal>

        {/* ── Two doors, equal weight ── */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-2 border-y border-border">
          <Reveal className="py-10 md:py-12 md:pr-12">
            <h3 className="t-heading text-foreground">Hiring for a role?</h3>
            <p className="mt-4 t-body max-w-[30rem]">
              The CV has the roles, the stack and the dates. The case studies above have the reasoning behind
              the work.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <CVDownloadButton variant="structural" />
              <button
                type="button"
                onClick={() => requestIntent("role")}
                className="tap group inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="link-draw">Write about a role</span>
                <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="py-10 md:py-12 md:pl-12 border-t md:border-t-0 md:border-l border-border">
            <h3 className="t-heading text-foreground">Have a project in mind?</h3>
            <p className="mt-4 t-body max-w-[30rem]">
              Data pipelines, payment reconciliation, analytics platforms and the backends behind them. Tell me
              where it stands today and when you need it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              {/* Same weight as the hiring door: one ink action, one quiet one. */}
              <button type="button" onClick={() => requestIntent("project")} className="btn-ink tap group">
                Describe your project
                <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
              </button>
              <a
                href="#projects"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  scrollToSection("projects");
                }}
                className="tap group inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="link-draw">See what I have built</span>
                <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </Reveal>
        </div>

        {/* ── Address, profiles, and the form ── */}
        <div className="mt-16 md:mt-24 grid grid-cols-12 gap-x-6 gap-y-14">
          <Reveal className="col-span-12 lg:col-span-5">
            <p className="t-caption">Email</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-3">
              <a
                href={`mailto:${EMAIL}`}
                className="link-ink max-w-full font-display text-[1.125rem] min-[400px]:text-[1.375rem] sm:text-[1.625rem] font-[540] tracking-[-0.02em] [font-stretch:110%]"
              >
                {EMAIL}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="tap inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                aria-label={copied ? "Email address copied" : "Copy email address"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="done"
                      className="inline-flex items-center gap-1.5 text-status-ok"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" /> Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      Copy
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

            <p className="mt-12 t-caption">Find me on</p>
            <ul className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} (opens in a new tab)`}
                    className="tap group inline-flex items-center gap-1 text-[15px] text-foreground"
                  >
                    <span className="link-draw">{link.label}</span>
                    <ArrowUpRight className="nudge-up w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>

            {/* The first practical question anyone writing has is when they
                will hear back. Rather than promise a turnaround, say what
                time it is where the reply will be written. */}
            <p className="mt-12 t-caption max-w-[24rem]">
              It&rsquo;s <time className="text-foreground tabular-nums">{clock.time}</time> in Abuja (UTC+1),{" "}
              {relativeZone(clock.ahead)}. {statusSentence} Open to remote and hybrid work.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="col-span-12 lg:col-span-7">
            <ContactForm email={EMAIL} />
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
