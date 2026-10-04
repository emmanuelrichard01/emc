import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@vercel/analytics";
import { ArrowUpRight, Check, Contact as ContactIcon } from "lucide-react";

import ContactForm from "@/components/contact/ContactForm";
import {
  AVAILABILITY,
  HOME_ZONE,
  buildVCard,
  overlapSentence,
  workdayOverlapMinutes,
  zoneOffsetMinutes,
} from "@/components/contact/contactModel";
import { Reveal, RevealText, Rule } from "@/components/ui/Reveal";
import { relativeZone } from "@/lib/lagosClock";
import { useLagosClock } from "@/lib/useLagosClock";

/* ==========================================================================
   CONTACT — the closing invitation

   The monograph ends on one short line and a choice of doors, because the
   page is read by two kinds of visitor with two different next steps:

     hiring     a message about a role (the CV sits beside the doors)
     building   a message about a project

   Neither door is the "main" one. Each opens its own form in place
   (contact/ContactForm.tsx), with a prompt and optional details shaped for
   that kind of message, and says what happens after it is sent.

   Above the doors: what Emmanuel is open to, in one line. Below: the
   address itself, set large enough to read and copy, the profiles, the time
   in Abuja and how much of a working day the visitor shares with it, and an
   address-book card.
   ========================================================================== */

const SOCIAL_LINKS = [
  { id: "github", label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { id: "twitter", label: "X", href: "https://x.com/mrebr" },
];

const EMAIL = "emma.moghalu@gmail.com";
const SITE = "https://www.builtbyem.dev";

/** The visitor's zone as their browser reports it, or null when it will not say. */
function visitorZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function saveContact() {
  const card = buildVCard({
    name: "Emmanuel Moghalu",
    family: "Moghalu",
    given: "Emmanuel",
    title: "Software & Data Engineer",
    email: EMAIL,
    url: SITE,
    city: "Abuja",
    country: "Nigeria",
    links: SOCIAL_LINKS.map((l) => l.href),
  });
  const url = URL.createObjectURL(new Blob([card], { type: "text/vcard;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "Emmanuel-Moghalu.vcf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    track("vcard_download");
  } catch {
    // Analytics never breaks a download.
  }
}

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

  /* Worked out from both zones' rules for today, so a visitor in London
     gets the right answer in July and in January. Re-read with the clock. */
  const overlap = useMemo(() => {
    const zone = visitorZone();
    const now = new Date();
    const visitor = zone ? zoneOffsetMinutes(zone, now) : -now.getTimezoneOffset();
    return overlapSentence(workdayOverlapMinutes(visitor, zoneOffsetMinutes(HOME_ZONE, now)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock.ahead]);

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

        <RevealText as="h2" id="contact-title" className="t-display text-foreground">
          Let&rsquo;s work together.
        </RevealText>

        <Reveal delay={0.2} className="mt-8 md:mt-10 max-w-[38rem] t-lede text-muted-foreground">
          Hiring for a role or planning a project? Choose one below and I&rsquo;ll reply within 1 working day.
        </Reveal>

        <Reveal delay={0.28} className="mt-6">
          <p className="flex items-start gap-2.5 t-caption">
            <span className="mt-[0.45rem] w-1.5 h-1.5 shrink-0 bg-status-ok" aria-hidden="true" />
            <span>
              <span className="sr-only">Availability: </span>
              {AVAILABILITY}
            </span>
          </p>
        </Reveal>

        {/* ── The doors, and the form behind each ── */}
        <Reveal className="mt-14 md:mt-20">
          <ContactForm email={EMAIL} />
        </Reveal>

        {/* ── Address, profiles, time ── */}
        <Reveal className="mt-16 md:mt-24 pt-10 md:pt-12 border-t border-border grid grid-cols-12 gap-x-6 gap-y-12">
          <div className="col-span-12 lg:col-span-7">
            <p className="t-caption">Or email me directly</p>
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
              <button
                type="button"
                onClick={saveContact}
                className="tap group inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ContactIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="link-draw">Save contact</span>
              </button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2" aria-label="Profiles">
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
          </div>

          {/* "When will I hear back" has a promise above it; this is the
              detail: the time where the reply is written, and how much of a
              working day the two of you share. */}
          <p className="col-span-12 lg:col-span-5 t-caption max-w-[26rem] lg:justify-self-end">
            It&rsquo;s <time className="text-foreground tabular-nums">{clock.time}</time> in Abuja (UTC+1),{" "}
            {relativeZone(clock.ahead)}. {statusSentence} <span className="text-foreground">{overlap}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Contact;
