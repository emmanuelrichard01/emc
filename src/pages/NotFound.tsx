import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import TransitionLink from "@/components/ui/TransitionLink";
import HorizonMark from "@/components/ui/HorizonMark";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { PROJECTS } from "@/data/projects";
import { MODIFIER_KEY } from "@/lib/platform";

/* ==========================================================================
   MISSING PAGE

   The error page's sibling, and built the same way: one screen, no scroll,
   one centred column, and the black hole drawn as large as the hero's but
   turned down and cropped into a corner. Each page keeps its own corner:
   the hero's rises from the bottom right, the error page's sinks into the
   bottom left, this one hangs from the top right.

   A line of terminal shows what was asked for and what came back, then the
   ways forward (home, the work, search) and the flagship case studies by
   name in one line, since a lost visitor was usually looking for one.

   It carries its own head tags: without them a 404 inherited whatever the
   last page set, and invited crawlers to index it under that identity.
   ========================================================================== */

interface MissingPageProps {
  title: string;
  lede: string;
  seoTitle: string;
  seoDescription: string;
}

export function MissingPage({ title, lede, seoTitle, seoDescription }: MissingPageProps) {
  const { pathname } = useLocation();
  const { open: openPalette } = useCommandPalette();
  const flagships = PROJECTS.filter((p) => p.tier === "flagship");

  return (
    // Clear of the top bar, and of the bottom bar on phones.
    <div className="relative min-h-dvh flex items-center overflow-hidden bg-background page-x pt-20 pb-24 md:pt-24 md:pb-12">
      <SEOHead metadata={{ title: seoTitle, description: seoDescription, robots: "noindex, follow" }} />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[30vmax] -top-[38vmax] w-[80vmax] opacity-[0.45] [mask-image:radial-gradient(closest-side,#000_62%,transparent)]"
      >
        <HorizonMark className="w-full" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl text-center">
        <p className="t-caption mb-3 md:mb-4">
          <span className="t-figure text-foreground">404</span>
          <span aria-hidden="true" className="text-muted-ghost px-2">·</span>
          Page not found
        </p>

        {/* Sized below the site's display voice, like the error page, so the
            whole page fits one screen. */}
        <RevealText
          as="h1"
          className="font-display text-[clamp(2.125rem,1.1rem+3.4vw,4rem)] font-[560] leading-[0.98] tracking-[-0.03em] text-foreground"
        >
          {title}
        </RevealText>

        <Reveal delay={0.15} className="mt-4 md:mt-5 mx-auto max-w-[46ch]">
          <p className="t-lede text-muted-foreground">{lede}</p>
        </Reveal>

        {/* What was asked for, and what came back, in the hero's own
            voice: the same prompt, the same amber, the same box. */}
        <Reveal delay={0.22} className="mt-6 md:mt-7 mx-auto max-w-xl text-left">
          <div className="border border-border bg-[hsl(var(--hero-surface))] px-4 md:px-5 py-3 font-mono text-[12.5px] md:text-[13px] leading-[1.85]">
            <p className="truncate">
              <span className="text-primary">em@builtbyem:~/$</span>{" "}
              <span className="text-foreground">cd {pathname}</span>
            </p>
            <p className="text-muted-foreground">no such page. try one of the links below.</p>
          </div>
        </Reveal>

        {/* Two rows on a phone (home across the top, then the other two side
            by side), so a short screen still has room for the projects. */}
        <Reveal delay={0.28} className="mt-6 md:mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
          <TransitionLink to="/" className="btn-ink tap col-span-2 justify-center">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to the home page
          </TransitionLink>
          <TransitionLink to="/#projects" className="btn-line tap justify-center">
            See the work
            <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
          </TransitionLink>
          <button type="button" onClick={openPalette} className="btn-line tap justify-center">
            <Search className="w-4 h-4" aria-hidden="true" />
            Search<span className="hidden sm:inline">&nbsp;the site</span>
            <span className="hidden md:inline-flex items-center gap-1 ml-1">
              <kbd className="kbd">{MODIFIER_KEY}</kbd>
              <kbd className="kbd">K</kbd>
            </span>
          </button>
        </Reveal>

        {flagships.length > 0 && (
          <Reveal delay={0.34} className="mt-6 md:mt-8">
            <nav aria-label="Projects to start with" className="flex flex-wrap justify-center items-baseline gap-x-1.5 gap-y-1 text-[14px] text-muted-foreground">
              <span>Or start with</span>
              {flagships.map((p, i) => (
                <span key={p.id} className="whitespace-nowrap">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-muted-ghost pr-1.5">
                      ·
                    </span>
                  )}
                  <TransitionLink to={`/projects/${p.id}`} className="link-ink text-foreground">
                    {p.title}
                  </TransitionLink>
                </span>
              ))}
            </nav>
          </Reveal>
        )}
      </div>
    </div>
  );
}

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: no route for", location.pathname);
  }, [location.pathname]);

  return (
    <MissingPage
      title="This page doesn’t exist."
      lede="The link may have a typo, or the page has moved. Nothing is lost: everything on the site is one click away from here."
      seoTitle="Page not found | Emmanuel Moghalu"
      seoDescription="This page does not exist. Go back to the home page or see the work."
    />
  );
};

export default NotFound;
