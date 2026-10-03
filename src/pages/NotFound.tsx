import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import TransitionLink from "@/components/ui/TransitionLink";
import HorizonMark from "@/components/ui/HorizonMark";
import { Reveal, RevealText, Rule } from "@/components/ui/Reveal";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { PROJECTS } from "@/data/projects";
import { MODIFIER_KEY } from "@/lib/platform";

/* ==========================================================================
   MISSING PAGE

   Built like the first screen: one centred column, the black hole drawn
   above it, and a line of terminal showing what was asked for and what
   came back. Then three ways forward (home, the work, search) and the
   flagship case studies by name, since a lost visitor was usually looking
   for one of them.

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
    <div className="relative min-h-dvh pt-28 md:pt-32 pb-24 bg-background overflow-hidden">
      <SEOHead metadata={{ title: seoTitle, description: seoDescription, robots: "noindex, follow" }} />

      <div className="page-x">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal y={0} className="mx-auto w-40 md:w-52 mb-8 md:mb-10">
            <HorizonMark />
          </Reveal>

          <p className="t-caption mb-5">
            <span className="t-figure text-foreground">404</span>
            <span aria-hidden="true" className="text-muted-ghost px-2">·</span>
            Page not found
          </p>

          <RevealText as="h1" className="t-display text-foreground">
            {title}
          </RevealText>

          <Reveal delay={0.15} className="mt-6 md:mt-8 mx-auto max-w-[46ch]">
            <p className="t-lede text-muted-foreground">{lede}</p>
          </Reveal>

          {/* What was asked for, and what came back, in the hero's own
              voice: the same prompt, the same amber, the same box. */}
          <Reveal delay={0.25} className="mt-10 mx-auto max-w-xl text-left">
            <div className="border border-border bg-[hsl(var(--hero-surface))] px-5 py-4 font-mono text-[13px] leading-[1.9]">
              <p className="truncate">
                <span className="text-primary">em@builtbyem:~/$</span>{" "}
                <span className="text-foreground">cd {pathname}</span>
              </p>
              <p className="text-muted-foreground">no such page. try one of the links below.</p>
            </div>
          </Reveal>

          <Reveal delay={0.32} className="mt-10 flex flex-wrap justify-center gap-3">
            <TransitionLink to="/" className="btn-ink tap">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to the home page
            </TransitionLink>
            <TransitionLink to="/#projects" className="btn-line tap">
              See the work
              <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
            </TransitionLink>
            <button type="button" onClick={openPalette} className="btn-line tap">
              <Search className="w-4 h-4" aria-hidden="true" />
              Search the site
              <span className="hidden md:inline-flex items-center gap-1 ml-1">
                <kbd className="kbd">{MODIFIER_KEY}</kbd>
                <kbd className="kbd">K</kbd>
              </span>
            </button>
          </Reveal>
        </div>

        {flagships.length > 0 && (
          <nav aria-labelledby="missing-flagships" className="mx-auto max-w-3xl mt-24 md:mt-32">
            <Rule className="mb-8" />
            <h2 id="missing-flagships" className="t-subhead text-foreground mb-2">
              Or start with one of these projects
            </h2>
            <ul>
              {flagships.map((p, i) => (
                <Reveal as="li" key={p.id} delay={i * 0.05} className="border-b border-border">
                  <TransitionLink
                    to={`/projects/${p.id}`}
                    className="group grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-x-3 py-5"
                  >
                    <span className="t-folio">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="t-subhead text-foreground">
                        <span className="link-draw">{p.title}</span>
                      </span>
                      <span className="block mt-1 t-caption truncate">{p.subtitle}</span>
                    </span>
                    <ArrowRight className="nudge w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                  </TransitionLink>
                </Reveal>
              ))}
            </ul>
          </nav>
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
