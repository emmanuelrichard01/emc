import React, { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useInView, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowUp, ArrowUpRight, CornerDownLeft, Plus, Sparkles } from "lucide-react";
import { scrollToSection } from "@/lib/scrollToSection";
import { scrollToY } from "@/lib/smoothScroll";
import { SECTIONS } from "@/data/sections";
// Shared with the hero's message-of-the-day, so the footer and the shell can
// never report different builds.
import { COMMIT_SHA, IS_DEV_BUILD, formatRelativeBuildTime } from "@/lib/buildInfo";
import { useAsk } from "@/components/ai/AskProvider";
import { MODIFIER_KEY } from "@/lib/platform";
import { useLagosClock } from "@/lib/useLagosClock";
import SuggestionMarquee from "@/components/ai/SuggestionMarquee";
import { useVisitVitals, type VisitVitals } from "@/components/footer/useVisitVitals";
import { formatBytes, formatMetric, rate, type Metric, type Rating } from "@/components/footer/vitals";
import { useReadingTrail } from "@/components/footer/useReadingTrail";
import { READ, SKIPPED } from "@/components/footer/readingTrail";
import { Reveal, Rule } from "@/components/ui/Reveal";

/* ==========================================================================
   FOOTER — the colophon

   The monograph's last page: a question still worth asking, where to go,
   where else to find him, how the book was made — and his name, set across
   the full measure and cut by the edge of the page, as a studio signs off.

   Two things only a footer can know stay here, set quietly:

     the trail    how much of each section this visitor has actually seen,
                  as a figure beside each sitemap link, with what they
                  skipped named (footer/readingTrail.ts)
     this visit   the Core Web Vitals of the visit being read, measured by
                  the visitor's own browser (footer/vitals.ts) — behind a
                  disclosure, since it answers a question most visitors
                  never ask; the build receipt says what shipped, this says
                  how it arrived
   ========================================================================== */

const REPO_URL = "https://github.com/emmanuelrichard01/emc";

const CONNECT_LINKS = [
  { label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { label: "X", href: "https://x.com/mrebr" },
  { label: "Email", href: "mailto:emma.moghalu@gmail.com" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */
/*  SCROLL-TO-TOP                                                              */
/* -------------------------------------------------------------------------- */

/* It lives in the page's right gutter, centred in it, so it never sits on
   content: the gutter is the page margin, plus the extra space either side
   of the 1440px measure on wide screens. It only exists where that gutter
   is wide enough to hold it (xl and up), and it steps away while the footer
   is on screen, where the sign-off runs edge to edge and the way back up is
   one short scroll anyway. On a phone the island's Home tab goes to the top. */
const GUTTER_CENTRE = "calc((max(var(--page-x), (100vw - 1440px) / 2 + var(--page-x)) - 40px) / 2)";

const ScrollToTop = ({ footerRef }: { footerRef: React.RefObject<HTMLElement | null> }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [footerInView, setFooterInView] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting), { threshold: 0 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footerRef]);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 400);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && !footerInView && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: EASE }}
          onClick={() => scrollToY(0)}
          style={{ right: GUTTER_CENTRE }}
          className="fixed bottom-8 z-50 group hidden xl:flex items-center justify-center w-10 h-10 bg-background/90"
          aria-label="Back to top"
        >
          {/* How far down the page the reader is, drawn round the square:
              a measured figure, so it may carry the accent. */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
            <rect x="0.5" y="0.5" width="39" height="39" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
            <motion.rect x="0.5" y="0.5" width="39" height="39" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" style={{ pathLength: progress }} />
          </svg>
          <ArrowUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-[color,transform] duration-300 group-hover:-translate-y-0.5 relative z-10" aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  LAST PROMPT                                                                */
/*                                                                             */
/*  The page opens on a prompt and closes on one. Whoever reaches the footer  */
/*  has read everything and still has a question — which may well be          */
/*  answerable right now. It opens the same assistant as ⌘J.                  */
/* -------------------------------------------------------------------------- */

const LastPrompt = () => {
  const { openAsk, starters } = useAsk();
  const [value, setValue] = useState("");

  const submit = (question: string) => {
    const q = question.trim();
    openAsk(q ? { question: q } : undefined);
    setValue("");
  };

  return (
    <div>
      <h2 className="t-heading text-foreground">Still have a question?</h2>
      <p className="mt-3 t-body max-w-[30rem]">
        Ask it here. The assistant answers using the case studies and work history on this site, and shows
        where each answer came from.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="group mt-8 flex items-center gap-3 border-b border-rule-strong focus-within:border-foreground transition-colors duration-300 max-w-[36rem]"
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <label htmlFor="footer-ask" className="sr-only">
          Ask the assistant a question about Emmanuel&rsquo;s work
        </label>
        <input
          id="footer-ask"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Anything the page didn't answer…"
          autoComplete="off"
          // 16px below md: iOS zooms the page on focus for anything smaller.
          className="flex-1 min-w-0 bg-transparent py-3.5 text-base md:text-[1.0625rem] text-foreground placeholder:text-muted-quiet outline-none focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="tap shrink-0 flex items-center gap-2 py-2.5 pl-2 text-[13px] text-muted-foreground group-focus-within:text-foreground hover:text-foreground transition-colors"
        >
          <span className="hidden sm:inline">Ask</span>
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
      <SuggestionMarquee items={starters} onPick={submit} className="mt-3 max-w-[36rem]" secondsPerItem={8} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  THIS VISIT                                                                 */
/* -------------------------------------------------------------------------- */

const RATING_TONE: Record<Rating, string> = {
  good: "bg-status-ok",
  "needs-improvement": "bg-status-warn",
  poor: "bg-status-error",
};
const RATING_LABEL: Record<Rating, string> = { good: "good", "needs-improvement": "okay", poor: "slow" };

const VitalCell = ({ metric, plain, name, value, supported, pending }: { metric: Metric; plain: string; name: string; value: number | null; supported: boolean; pending: string }) => {
  const rating = value === null ? null : rate(metric, value);
  return (
    <div className="py-4 pr-4 min-w-0 border-t border-border" title={name}>
      <dt className="text-[13px] text-foreground">{plain}</dt>
      <dt className="mt-0.5 flex items-center gap-2 t-caption">
        {metric}
        {rating && (
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 ${RATING_TONE[rating]}`} aria-hidden="true" />
            {RATING_LABEL[rating]}
          </span>
        )}
      </dt>
      <dd className="mt-2 t-figure text-[1.125rem] text-foreground leading-none truncate">
        {value !== null ? formatMetric(metric, value) : <span className="font-sans text-[13px] tracking-normal text-muted-foreground">{supported ? pending : "your browser can't measure this"}</span>}
      </dd>
    </div>
  );
};

/* The visit, as the visitor's browser measured it — behind a disclosure.
   Measurement runs either way (useVisitVitals); the disclosure only decides
   whether it is shown. INP starts empty — it is the slowest response to
   something the visitor did — so the cell invites them to do something. */
const ThisVisit = ({ vitals }: { vitals: VisitVitals }) => {
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="tap group inline-flex items-center gap-2.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className={`w-3.5 h-3.5 transition-transform duration-500 ease-out-expo ${open ? "rotate-45 text-foreground" : ""}`} aria-hidden="true" />
        <span className="link-draw">How fast this page loaded for you</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={prefersReduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <VitalCell metric="LCP" plain="Main content shown" name="Largest Contentful Paint: how long it took for the main content to appear" value={vitals.lcp} supported={vitals.supported.lcp} pending="measuring…" />
              <VitalCell metric="INP" plain="Reaction to your taps" name="Interaction to Next Paint: the slowest the page took to react when you tapped, clicked or typed" value={vitals.inp} supported={vitals.supported.inp} pending="tap or click anything" />
              <VitalCell metric="CLS" plain="Page stayed still" name="Cumulative Layout Shift: how much the page jumped around while you read it. Lower is better" value={vitals.cls} supported={vitals.supported.cls} pending="measuring…" />
              <VitalCell metric="TTFB" plain="Server first replied" name="Time to First Byte: how long the server took to start sending the page" value={vitals.ttfb} supported pending="not available" />
              <div className="py-4 min-w-0 border-t border-border col-span-2 sm:col-span-1" title="How much data this page downloaded. Files your browser already had saved cost nothing">
                <dt className="text-[13px] text-foreground">Data downloaded</dt>
                <dt className="mt-0.5 t-caption">Transferred</dt>
                <dd className="mt-2 t-figure text-[1.125rem] text-foreground leading-none whitespace-nowrap">
                  {formatBytes(vitals.bytes)}
                  <span className="ml-2 font-sans text-[12px] tracking-normal text-muted-foreground">
                    {vitals.requests} files{vitals.cached > 0 ? `, ${vitals.cached} already saved` : ""}
                  </span>
                </dd>
              </div>
            </dl>
            {/* Said plainly because it is true: this strip only reads, but the
                site does report anonymous vitals to Vercel Speed Insights. */}
            <p className="mt-3 t-caption max-w-[44rem]">
              These are Google&rsquo;s Core Web Vitals, measured by your own browser and graded against Google&rsquo;s
              published targets. The site also sends these numbers to Vercel Speed Insights, without anything that
              identifies you.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  SIGN-OFF                                                                   */
/* -------------------------------------------------------------------------- */

/* The name across the full measure, cut by the bottom edge of the page.
   Set as SVG text with a fixed advance (textLength) so it fills the width
   exactly at every viewport instead of being tuned to one. Decorative: the
   colophon above says the name in words. Uncovered by a wipe as the footer
   arrives, bookending the cold open that draws the mark on. */
const SignOff = ({ show }: { show: boolean }) => {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none select-none -mb-[1.4%] mt-16 md:mt-24"
      initial={prefersReduced ? false : { clipPath: "inset(100% 0 0 0)" }}
      animate={show || prefersReduced ? { clipPath: "inset(0% 0 0 0)" } : { clipPath: "inset(100% 0 0 0)" }}
      transition={{ duration: 1.6, ease: [0.77, 0, 0.18, 1], delay: 0.15 }}
    >
      <svg viewBox="0 0 1000 94" className="block w-full h-auto" preserveAspectRatio="xMidYMax meet">
        <text
          x="0"
          y="86"
          textLength="1000"
          lengthAdjust="spacing"
          fill="hsl(var(--border))"
          style={{ fontFamily: "'Archivo', 'Inter', sans-serif", fontWeight: 600, fontStretch: "118%", fontSize: 95, letterSpacing: "-0.03em" }}
        >
          Emmanuel Moghalu
        </text>
      </svg>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  FOOTER                                                                     */
/* -------------------------------------------------------------------------- */

const SECTION_IDS = SECTIONS.map((section) => section.id);

const Footer = () => {
  const year = new Date().getFullYear();
  const deployed = formatRelativeBuildTime();
  const footerRef = useRef<HTMLElement>(null);
  const signRef = useRef<HTMLDivElement>(null);
  const signInView = useInView(signRef, { once: true, amount: 0.2 });
  const clock = useLagosClock();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLanding = pathname === "/";
  // Live, not once: the vitals only publish while someone can see them.
  const onScreen = useInView(footerRef, { amount: 0 });
  const vitals = useVisitVitals(onScreen);
  const trail = useReadingTrail(SECTION_IDS, isLanding);
  const skipped = isLanding ? SECTIONS.filter((section) => (trail[section.id] ?? 0) < SKIPPED) : [];

  const goTo = (e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (isLanding) scrollToSection(id);
    else navigate(`/#${id}`);
  };

  const status = clock.working ? "Working hours." : clock.weekend ? "It's the weekend." : "Outside working hours.";

  return (
    <footer ref={footerRef} className="relative overflow-hidden page-x">
      <div className="page-max pt-8 md:pt-12">
        <Rule />

        <div className="mt-14 md:mt-20 grid grid-cols-12 gap-x-6 gap-y-14">
          <Reveal className="col-span-12 lg:col-span-6">
            <LastPrompt />
          </Reveal>

          {/* The sitemap doubles as a trail: each section carries how much of
              it this visit has had on screen. Real anchors with real
              destinations off the landing page. */}
          <Reveal delay={0.08} className="col-span-6 sm:col-span-4 lg:col-span-3 lg:col-start-8">
            <p className="t-caption">Sections</p>
            <nav aria-label="Footer section links">
              <ul className="mt-4 space-y-1">
                {SECTIONS.map((section) => {
                  const seen = trail[section.id];
                  const showTrail = isLanding && seen !== undefined;
                  return (
                    <li key={section.id}>
                      <a
                        href={isLanding ? `#${section.id}` : `/#${section.id}`}
                        onClick={(e) => goTo(e, section.id)}
                        className="tap group flex items-baseline justify-between gap-4 py-1.5 text-[15px] text-foreground"
                        aria-label={showTrail ? `${section.label}, ${Math.round(seen * 100)}% read` : undefined}
                      >
                        <span className="link-draw">{section.label}</span>
                        {showTrail && (
                          <span
                            className={`t-folio ${seen >= READ ? "text-muted-foreground" : ""}`}
                            aria-hidden="true"
                            title="How much of this section you've seen"
                          >
                            {Math.round(seen * 100)}%
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            {skipped.length > 0 && skipped.length < SECTIONS.length && (
              <p className="mt-4 t-caption">
                You haven&rsquo;t seen:{" "}
                {skipped.map((section, i) => (
                  <React.Fragment key={section.id}>
                    {i > 0 && ", "}
                    <a href={`#${section.id}`} onClick={(e) => goTo(e, section.id)} className="text-foreground underline decoration-rule-strong underline-offset-4 hover:decoration-foreground transition-colors">
                      {section.label}
                    </a>
                  </React.Fragment>
                ))}
              </p>
            )}
          </Reveal>

          <Reveal delay={0.14} className="col-span-6 sm:col-span-4 lg:col-span-2">
            <p className="t-caption">Find me on</p>
            <ul className="mt-4 space-y-1">
              {CONNECT_LINKS.map((link) => {
                const isExternal = link.href.startsWith("http");
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="tap group inline-flex items-center gap-1 py-1.5 text-[15px] text-foreground"
                      aria-label={isExternal ? `${link.label} (opens in new tab)` : link.label}
                    >
                      <span className="link-draw">{link.label}</span>
                      {isExternal && <ArrowUpRight className="nudge-up w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        {/* Colophon — the one thing a footer can say that the sections above
            cannot, and the place to state the site's own claim about itself. */}
        <div className="mt-16 md:mt-24 pt-10 border-t border-border grid grid-cols-12 gap-x-6 gap-y-10">
          <Reveal className="col-span-12 lg:col-span-6">
            <p className="t-body max-w-[34rem]">
              Set in Archivo and Inter. Built with React, TypeScript and Tailwind, and hosted on Vercel. The numbers on
              this page aren&rsquo;t typed in by hand. They come from the same data the terminal reads, so the{" "}
              <code className="font-mono text-[0.9em] text-foreground">queries</code> command can show you exactly how
              each one was worked out.
            </p>
            {/* The reasoning behind every pass is written down; say where. */}
            <p className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[14px]">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="tap group inline-flex items-center gap-1 text-foreground">
                <span className="link-draw">Source</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              </a>
              <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noopener noreferrer" className="tap group inline-flex items-center gap-1 text-foreground">
                <span className="link-draw">Changelog, with the reasons for each change</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              </a>
            </p>
          </Reveal>

          <Reveal delay={0.08} className="col-span-12 lg:col-span-5 lg:col-start-8 space-y-6">
            {/* Green only when it is a working hour there — a dot that is
                "live" at three in the morning is decoration pretending to be
                status. */}
            <p className="flex items-center gap-2.5 text-[14px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 shrink-0 ${clock.working ? "bg-status-ok status-live" : "bg-muted-quiet"}`} aria-hidden="true" />
              <span>
                It&rsquo;s <span className="text-foreground tabular-nums">{clock.time}</span> in Abuja, Nigeria. {status}
              </span>
            </p>
            <ThisVisit vitals={vitals} />
          </Reveal>
        </div>

        {/* Bottom line: copyright, shortcuts, and the build receipt — whose
            SHA links to the commit it names, so the site is as checkable
            about its own build as it asks to be about its numbers. */}
        <div className="mt-14 pt-6 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:pr-16 text-[12px] text-muted-foreground">
          <span className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>© {year} Emmanuel Moghalu</span>
            {/* Desktop only: a phone has none of these keys. */}
            <span className="hidden md:flex items-center gap-4" aria-label="Keyboard shortcuts">
              <span className="inline-flex items-center gap-1.5"><kbd className="kbd">{MODIFIER_KEY}</kbd><kbd className="kbd">K</kbd> jump to anything</span>
              <span className="inline-flex items-center gap-1.5"><kbd className="kbd">{MODIFIER_KEY}</kbd><kbd className="kbd">J</kbd> ask a question</span>
              <span className="inline-flex items-center gap-1.5"><kbd className="kbd">/</kbd> also asks</span>
            </span>
          </span>

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>This version:</span>
            {IS_DEV_BUILD ? (
              <span className="font-mono text-[11px] text-foreground">local</span>
            ) : (
              <a
                href={`${REPO_URL}/commit/${COMMIT_SHA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-foreground underline decoration-rule-strong underline-offset-4 hover:decoration-foreground transition-colors"
                aria-label={`Commit ${COMMIT_SHA} on GitHub (opens in new tab)`}
              >
                {COMMIT_SHA}
              </a>
            )}
            {deployed && <span>published {deployed}</span>}
          </span>
        </div>

        <div ref={signRef}>
          <SignOff show={signInView} />
        </div>
        {/* Clear of the phone's bottom island, which floats over the last
            ~80px of the page. */}
        <div className="h-24 md:hidden" aria-hidden="true" />
      </div>

      <ScrollToTop footerRef={footerRef} />
    </footer>
  );
};

export default Footer;
