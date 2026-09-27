import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useInView, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowUp, ArrowUpRight, CornerDownLeft, Sparkles } from "lucide-react";
import { scrollToSection } from "@/lib/scrollToSection";
import { SECTIONS } from "@/data/sections";
// Shared with the hero's message-of-the-day, so the footer and the shell can
// never report different builds.
import { COMMIT_SHA, IS_DEV_BUILD, formatRelativeBuildTime } from "@/lib/buildInfo";
import { LOGO_PATHS } from "@/components/ui/LogoMark";
import { useAsk } from "@/components/ai/AskProvider";
import { MODIFIER_KEY } from "@/lib/platform";
import { useLagosClock } from "@/lib/useLagosClock";
import SuggestionMarquee from "@/components/ai/SuggestionMarquee";
import { useVisitVitals, type VisitVitals } from "@/components/footer/useVisitVitals";
import { formatBytes, formatMetric, rate, type Metric, type Rating } from "@/components/footer/vitals";
import { useReadingTrail } from "@/components/footer/useReadingTrail";
import { READ, SKIPPED } from "@/components/footer/readingTrail";

/* ==========================================================================
   FOOTER

   A colophon and a build receipt — not a second contact section.

   The previous footer ran four equal columns of mono text: identity,
   sitemap, connect, status. Three of them restated what Contact says
   immediately above it — the same socials, the same city, the same
   timezone — so the page ended by repeating its own last section in a
   smaller font. Meanwhile the one thing here that exists nowhere else, the
   commit and deploy time, sat at nine pixels and sixty percent opacity.

   So the weights are swapped. Identity and status compress to a single
   line, the two link lists lie flat instead of standing as columns, and
   the build metadata becomes a legible receipt whose SHA links to the
   commit it names — which is the same claim the rest of the site makes
   about its numbers, applied to itself.

   Two things only a footer can know, added since:

     this visit   the Core Web Vitals of the visit being read, measured by
                  the visitor's own browser (footer/vitals.ts) — the build
                  receipt says what shipped; this says how it arrived
     the trail    how much of each section this visitor has actually seen,
                  on the sitemap, with what they skipped named
                  (footer/readingTrail.ts)
   ========================================================================== */

const REPO_URL = "https://github.com/emmanuelrichard01/emc";

const CONNECT_LINKS = [
  { label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { label: "X", href: "https://x.com/mrebr" },
  { label: "Email", href: "mailto:emma.moghalu@gmail.com" },
];

/* -------------------------------------------------------------------------- */
/*  SCROLL-TO-TOP                                                              */
/* -------------------------------------------------------------------------- */

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 25,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          /* Desktop only. On a phone this sat on the bottom island, over its
             Ask button, and the island's own Home tab already goes to the
             top — two controls for one job, one of them in the other's way. */
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 group hidden md:flex items-center justify-center w-10 h-10 bg-card border border-border hover:border-primary transition-all cursor-pointer"
          style={{ boxShadow: 'var(--shadow-md)' }}
          aria-label="Scroll to top"
        >
          {/* Progress ring.

              `pathLength` is driven by framer, which manages strokeDasharray
              and strokeDashoffset itself to express it. The previous version
              also hardcoded strokeDasharray="160" and set strokeDashoffset
              from progress.get() — a non-reactive read during render that
              fought the same two attributes framer was already writing. */}
          <svg className="absolute inset-0 w-full h-full p-1 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
            <motion.rect
              x="2"
              y="2"
              width="40"
              height="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary"
              style={{ pathLength: progress }}
            />
          </svg>
          <ArrowUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  LAST PROMPT                                                                */
/*                                                                             */
/*  The page opens on a prompt and now closes on one. Whoever reaches the     */
/*  footer has read everything and still has a question — which is the one    */
/*  moment a "contact me" link is the wrong answer, because the question may  */
/*  well be answerable right now. It opens the same assistant as ⌘J.          */
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
    <div className="mt-10 pt-8 border-t border-border">
      <FooterColumnLabel>// Still have a question?</FooterColumnLabel>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="group flex items-center gap-3 border border-border bg-background/40 px-3 md:px-4 py-2.5 focus-within:border-primary/60 transition-colors max-w-2xl"
      >
        <span className="hidden sm:inline font-mono text-[13px] text-primary/80 shrink-0 select-none" aria-hidden="true">
          em@builtbyem:~/$ ask
        </span>
        <Sparkles className="sm:hidden w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
        <label htmlFor="footer-ask" className="sr-only">
          Ask the assistant a question about Emmanuel&rsquo;s work
        </label>
        <input
          id="footer-ask"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="anything the page didn't answer…"
          autoComplete="off"
          // 16px below md: iOS zooms the page on focus for anything smaller.
          className="flex-1 min-w-0 bg-transparent font-mono text-base md:text-[13px] text-foreground placeholder:text-muted-quiet focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Ask"
          // Icon-only on a phone (the word shows from sm), so it needs its own
          // hit area: 14×14 was the whole target.
          className="shrink-0 flex items-center gap-1.5 p-2.5 -m-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground group-focus-within:text-primary hover:text-primary transition-colors"
        >
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">ask</span>
        </button>
      </form>
      <SuggestionMarquee items={starters} onPick={submit} className="mt-3 max-w-2xl" secondsPerItem={8} />
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
const RATING_LABEL: Record<Rating, string> = { good: "good", "needs-improvement": "fair", poor: "poor" };

const VitalCell = ({ metric, name, value, supported, pending }: { metric: Metric; name: string; value: number | null; supported: boolean; pending: string }) => {
  const rating = value === null ? null : rate(metric, value);
  return (
    <div className="bg-card px-4 py-3 min-w-0" title={name}>
      <dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {metric}
        {rating && (
          <span className="flex items-center gap-1.5 normal-case tracking-normal">
            <span className={`w-1.5 h-1.5 ${RATING_TONE[rating]}`} aria-hidden="true" />
            {RATING_LABEL[rating]}
          </span>
        )}
      </dt>
      <dd className="mt-2 font-mono text-[15px] text-foreground tabular-nums leading-none truncate">
        {value !== null ? formatMetric(metric, value) : <span className="text-[11px] text-muted-foreground">{supported ? pending : "not measured here"}</span>}
      </dd>
    </div>
  );
};

/* The visit, as the visitor's browser measured it. INP starts empty — it is
   the slowest response to something the visitor did — so the cell invites
   them to do something, and updates when they have. */
const ThisVisit = ({ vitals }: { vitals: VisitVitals }) => (
  <div className="mt-10 pt-8 border-t border-border">
    <FooterColumnLabel>// This visit, measured in your browser</FooterColumnLabel>
    <dl className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border">
      <VitalCell metric="LCP" name="Largest Contentful Paint — when the main content appeared" value={vitals.lcp} supported={vitals.supported.lcp} pending="measuring…" />
      <VitalCell metric="INP" name="Interaction to Next Paint — the slowest response to something you did" value={vitals.inp} supported={vitals.supported.inp} pending="click anything" />
      <VitalCell metric="CLS" name="Cumulative Layout Shift — how much the page moved under you" value={vitals.cls} supported={vitals.supported.cls} pending="measuring…" />
      <VitalCell metric="TTFB" name="Time to First Byte — how long the server took to answer" value={vitals.ttfb} supported pending="—" />
      <div className="bg-card px-4 py-3 col-span-2 md:col-span-1 min-w-0" title="Bytes over the network for the page and the resources it was allowed to time; cached files cost nothing">
        <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">transferred</dt>
        <dd className="mt-2 font-mono text-[15px] text-foreground tabular-nums leading-none">
          {formatBytes(vitals.bytes)}
          <span className="ml-2 text-[11px] text-muted-foreground">
            {vitals.requests} req{vitals.cached > 0 ? ` · ${vitals.cached} cached` : ""}
          </span>
        </dd>
      </div>
    </dl>
    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
      {/* Said plainly because it is true: this strip only reads, but the site
          does report anonymous vitals to Vercel Speed Insights (App.tsx). */}
      Core Web Vitals, read from your browser and rated against Google&rsquo;s published thresholds. The site
      also reports these, anonymously, to Vercel Speed Insights.
    </p>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  FOOTER                                                                     */
/* -------------------------------------------------------------------------- */

const FooterColumnLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4 block">
    {children}
  </span>
);

/** Shared styling for the two flat link lists. */
/* py-2 -my-2 below md: the links were 17px tall, too small for a thumb;
   the negative margin keeps the lists' spacing exactly as it was. */
const footerLink =
  "relative py-2 -my-2 px-1.5 -mx-1.5 min-w-[32px] text-center md:min-w-0 md:text-left md:p-0 md:m-0 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors";

const SECTION_IDS = SECTIONS.map((section) => section.id);

const Footer = () => {
  const year = new Date().getFullYear();
  const deployed = formatRelativeBuildTime();
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.3 });
  const clock = useLagosClock();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLanding = pathname === "/";
  const prefersReduced = useReducedMotion();
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

  return (
    <footer
      ref={footerRef}
      className="relative border-t border-border bg-card/20 overflow-hidden"
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* The mark, closing the page the way the boot overlay opens it.

          Set as a watermark rather than beside the name, which is where a
          logo naturally wants to go and is exactly where it would be
          redundant — the identity block already says "Emmanuel Moghalu" in
          bold two lines below. Repeating it as a lockup is the same problem
          the hero calls out, where the mark appeared four times before a
          visitor had done anything.

          Down here it is doing a different job. The footer is otherwise
          entirely text with no visual anchor at all, and the same mark that
          strokes itself on at the cold open bookending the scroll is worth
          having. Bled off the right edge and held at 7% so it reads as
          watermark rather than as a second logo, and masked so it fades out
          before it reaches the colophon it sits behind. */}
      {/* Revealed by a wipe as the footer arrives — the cold open draws
          the mark on, and the close uncovers it the same way. */}
      <motion.div
        className="absolute -right-16 -bottom-20 w-[420px] max-w-[70%] pointer-events-none select-none opacity-[0.07] text-foreground"
        aria-hidden="true"
        initial={prefersReduced ? false : { clipPath: "inset(0 0 0 100%)" }}
        animate={isInView || prefersReduced ? { clipPath: "inset(0 0 0 0%)" } : { clipPath: "inset(0 0 0 100%)" }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{
          maskImage: 'linear-gradient(to left, #000 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to left, #000 30%, transparent 100%)',
        }}
      >
        <svg viewBox="0 0 200 120" className="w-full h-auto">
          {LOGO_PATHS.map((d, i) => (
            <path key={i} d={d} fill="currentColor" />
          ))}
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto py-12 md:py-16"
      >
        {/* Identity and status on one line. Both were columns; neither is a
            column's worth of content. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="block text-[13px] font-bold text-foreground tracking-widest uppercase">
              Emmanuel Moghalu
            </span>
            <span className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1.5">
              Software &amp; Data Engineer
            </span>
          </div>

          {/* Green only when it is a working hour there — a dot that is
              "live" at three in the morning is decoration pretending to be
              status. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className={`w-1.5 h-1.5 shrink-0 ${clock.working ? "bg-status-ok status-live" : "bg-muted-foreground"}`} aria-hidden="true" />
            <span>
              Abuja, NG — <span className="text-foreground tabular-nums">{clock.time}</span>
            </span>
            <span className="normal-case tracking-normal">
              · {clock.working ? "working hours" : clock.weekend ? "the weekend" : "after hours"}
            </span>
          </div>
        </div>

        <LastPrompt />

        {/* Colophon — the one thing a footer can say that the sections above
            cannot, and the place to state the site's own claim about itself. */}
        <div className="mt-10 pt-8 border-t border-border">
          <FooterColumnLabel>// Colophon</FooterColumnLabel>
          <p className="text-[15px] md:text-[13px] text-muted-foreground font-light leading-relaxed max-w-xl">
            React, TypeScript and Tailwind, deployed on Vercel. The figures on this page
            are not written by hand — they are queried from the same dataset the terminal
            reads, so{" "}
            <code className="font-mono text-foreground/80">queries</code> will reproduce any
            of them, and show the query it used.
          </p>
          {/* The reasoning behind every pass is written down; say where. */}
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px]">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="tap group inline-flex items-center gap-1 text-primary hover:text-foreground transition-colors">
              source <ArrowUpRight className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noopener noreferrer" className="tap group inline-flex items-center gap-1 text-primary hover:text-foreground transition-colors">
              changelog, with the reasoning <ArrowUpRight className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </p>
        </div>

        {/* Both lists lie flat. As columns they were two stacks of five short
            mono strings, which is most of what made the footer feel like a
            second contact section. */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <FooterColumnLabel>// Sitemap</FooterColumnLabel>
            {/* Real anchors, sharing the nav's section list — the footer used
                to keep its own copy, which is how "Work" and "Experience"
                drift apart from the pill above.

                And real destinations off the landing page. These were bare
                fragments with an unconditional preventDefault, so on a case
                study they pointed at sections that do not exist there and
                nothing replaced the browser's own handling — the same dead
                links the navbar was fixed for, left behind in the footer. */}
            {/* Each link carries how much of its section this visit has had on
                screen — a hairline under the label — so the sitemap doubles
                as a trail. Only on the landing page, where the sections are. */}
            <nav className="flex flex-wrap gap-x-5 gap-y-2.5" aria-label="Footer section links">
              {SECTIONS.map((section) => {
                const seen = trail[section.id];
                return (
                  <a
                    key={section.id}
                    href={isLanding ? `#${section.id}` : `/#${section.id}`}
                    onClick={(e) => goTo(e, section.id)}
                    className={footerLink}
                    aria-label={isLanding && seen !== undefined ? `${section.label}, ${Math.round(seen * 100)}% read` : undefined}
                  >
                    {section.label}
                    {isLanding && seen !== undefined && (
                      <span className="absolute left-0 right-0 bottom-0.5 md:-bottom-1.5 h-px bg-border" aria-hidden="true">
                        <span
                          className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${seen >= READ ? "bg-primary" : "bg-primary/60"}`}
                          style={{ width: `${seen * 100}%` }}
                        />
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
            {skipped.length > 0 && skipped.length < SECTIONS.length && (
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                Not seen yet:{" "}
                {skipped.map((section, i) => (
                  <React.Fragment key={section.id}>
                    {i > 0 && ", "}
                    <a href={`#${section.id}`} onClick={(e) => goTo(e, section.id)} className="text-primary hover:text-foreground underline-offset-4 hover:underline transition-colors">
                      {section.label}
                    </a>
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>

          <div>
            <FooterColumnLabel>// Connect</FooterColumnLabel>
            <nav className="flex flex-wrap gap-x-5 gap-y-2.5" aria-label="External profiles and contact">
              {CONNECT_LINKS.map((link) => {
                const isExternal = link.href.startsWith("http");
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`${footerLink} group`}
                    aria-label={isExternal ? `${link.label} (opens in new tab)` : link.label}
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        <ThisVisit vitals={vitals} />

        {/* Build receipt.

            Previously aria-hidden at 60% opacity, which measured about 2.6:1
            — the only unique content in the footer, and the least readable
            thing in it. The SHA now links to the commit it names: the site
            asks to be taken at its word about its numbers, so it should be
            checkable about its own build too. */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            <span>© {year} Emmanuel Moghalu</span>
            {/* The shortcuts, stated once where someone looking for them
                would look. Desktop only: a phone has none of these keys. */}
            <span className="hidden md:flex items-center gap-3 text-muted-quiet" aria-label="Keyboard shortcuts">
              <span><kbd className="border border-border px-1 py-px">{MODIFIER_KEY}+K</kbd> go</span>
              <span><kbd className="border border-border px-1 py-px">{MODIFIER_KEY}+J</kbd> ask</span>
              <span><kbd className="border border-border px-1 py-px">/</kbd> ask</span>
            </span>
          </span>

          <span className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground tracking-widest">
            <span className="text-primary" aria-hidden="true">#</span>
            {IS_DEV_BUILD ? (
              <span>local build</span>
            ) : (
              <a
                href={`${REPO_URL}/commit/${COMMIT_SHA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
                aria-label={`Commit ${COMMIT_SHA} on GitHub (opens in new tab)`}
              >
                {COMMIT_SHA}
              </a>
            )}
            {deployed && <span>· deployed {deployed}</span>}
          </span>
        </div>
      </motion.div>

      <ScrollToTop />
    </footer>
  );
};

export default Footer;