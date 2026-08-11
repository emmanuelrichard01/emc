import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useInView } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { scrollToSection } from "@/lib/scrollToSection";
import { SECTIONS } from "@/data/sections";
// Shared with the hero's message-of-the-day, so the footer and the shell can
// never report different builds.
import { COMMIT_SHA, IS_DEV_BUILD, formatRelativeBuildTime } from "@/lib/buildInfo";
import { LOGO_PATHS } from "@/components/ui/LogoMark";

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
   ========================================================================== */

const REPO_URL = "https://github.com/emmanuelrichard01/emc";

const CONNECT_LINKS = [
  { label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { label: "X", href: "https://x.com/mrebr" },
  { label: "Email", href: "mailto:emma.moghalu@gmail.com" },
];

/* -------------------------------------------------------------------------- */
/*  LIVE LAGOS CLOCK — ticks on the minute boundary, not every second, so it   */
/*  stays a quiet ambient detail rather than a distracting countdown.         */
/* -------------------------------------------------------------------------- */

function useLagosClock() {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
    }),
    []
  );
  // Lazy initializer — runs once on mount only, so reading the clock here
  // isn't the "impure render" pattern that a bare `useState(formatter.format(new Date()))`
  // (re-evaluated every render) or a Date.now() effect body would be.
  const [time, setTime] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const alignTimeout = setTimeout(() => {
      setTime(formatter.format(new Date()));
      intervalId = setInterval(() => setTime(formatter.format(new Date())), 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(alignTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [formatter]);

  return time;
}

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
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 group flex items-center justify-center w-10 h-10 bg-card border border-border hover:border-primary transition-all cursor-pointer"
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
/*  FOOTER                                                                     */
/* -------------------------------------------------------------------------- */

const FooterColumnLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4 block">
    {children}
  </span>
);

/** Shared styling for the two flat link lists. */
const footerLink =
  "relative text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors";

const Footer = () => {
  const year = new Date().getFullYear();
  const deployed = formatRelativeBuildTime();
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.3 });
  const lagosTime = useLagosClock();

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
          having. Bled off the right edge and held at 3% so it reads as
          watermark rather than as a second logo, and masked so it fades out
          before it reaches the colophon it sits behind. */}
      <div
        className="absolute -right-16 -bottom-20 w-[420px] max-w-[70%] pointer-events-none select-none opacity-[0.03] text-foreground"
        aria-hidden="true"
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
      </div>

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

          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="w-1.5 h-1.5 bg-emerald-500 status-live shrink-0" aria-hidden="true" />
            <span>Abuja, NG — {lagosTime}</span>
          </div>
        </div>

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
        </div>

        {/* Both lists lie flat. As columns they were two stacks of five short
            mono strings, which is most of what made the footer feel like a
            second contact section. */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <FooterColumnLabel>// Sitemap</FooterColumnLabel>
            {/* Real anchors, sharing the nav's section list — the footer used
                to keep its own copy, which is how "Work" and "Experience"
                drift apart from the pill above. */}
            <nav className="flex flex-wrap gap-x-5 gap-y-2.5" aria-label="Footer section links">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    scrollToSection(section.id);
                  }}
                  className={footerLink}
                >
                  {section.label}
                </a>
              ))}
            </nav>
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

        {/* Build receipt.

            Previously aria-hidden at 60% opacity, which measured about 2.6:1
            — the only unique content in the footer, and the least readable
            thing in it. The SHA now links to the commit it names: the site
            asks to be taken at its word about its numbers, so it should be
            checkable about its own build too. */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            © {year} Emmanuel Moghalu
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