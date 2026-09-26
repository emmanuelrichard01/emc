import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Bug, ExternalLink, GitBranch, Github, Info, Layers, MessageSquare, Target } from "lucide-react";

import { PROJECTS } from "@/data/projects";
import SEOHead from "@/components/SEOHead";
import { CaseBlocks } from "@/components/projects/CaseBlocks";
import ProjectAsk from "@/components/projects/ProjectAsk";
import { CaseContents, MobileContents, ReadingProgress } from "@/components/case/CaseContents";
import { CaseHero, CaseSummary } from "@/components/case/CaseHero";
import { CaseSection, FieldNotesList, Highlights, Tradeoffs } from "@/components/case/CaseSections";
import { CaseFooter } from "@/components/case/CaseFooter";
import { readingMinutes, sectionsFor, type CaseSection as Section } from "@/components/case/caseModel";
import { VIEW_TRANSITIONS } from "@/lib/viewTransition";
import type { Project, SEOMetadata } from "@/types";

/* ==========================================================================
   CASE STUDY

   Laid out for the two ways these pages are actually read.

   Skimmed: the hero says what it is, whether it is running and how long the
   page takes; "in 30 seconds" gives the problem, approach and outcome in
   their own first words; the trade-offs are visually the heaviest thing on
   the page, because they are the most convincing.

   Read: prose set for reading (16–17px, regular weight, 68ch), a contents
   rail that fills as each section is read with an estimate of the time
   left, headings that link to themselves, debugging stories folded to their
   symptoms, and at the end the assistant — told which page it is on — then
   where to go next.

   Nothing on the page is written for the page. Every figure, sentence and
   count comes from the project's data (caseModel derives the rest), so the
   case study, the card, the index and the AI can never disagree.
   ========================================================================== */

const SITE_URL = "https://www.builtbyem.dev";
const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : SITE_URL);

/* Search engines truncate around 155 characters; cutting on a word boundary
   keeps the snippet from ending mid-word. */
function truncate(text: string, max = 155): string {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/* Reading mode for the case-study prose: a size, weight and contrast meant
   for sentences. The instrument styling stays on labels and figures. */
const PROSE = "text-[16px] md:text-[17px] text-foreground/80 leading-[1.75] max-w-[68ch]";

/* ── Sidebar ── */

const Sidebar = ({ project, minutes, sections }: { project: Project; minutes: number; sections: Section[] }) => (
  /* h-full is load-bearing: a sticky child can only travel inside its
     parent's box, and the aside must claim the stretched grid cell. */
  <aside className="hidden lg:block h-full">
    <div className="sticky top-28 flex flex-col gap-8">
      <CaseContents sections={sections} minutes={minutes} />

      <div>
        <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-3 block">// Stack</span>
        <ul className="flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <li
              key={tech}
              className="px-2 py-1 border border-border bg-card/50 text-muted-foreground text-[10px] font-mono uppercase tracking-wider"
            >
              {tech}
            </li>
          ))}
          {!project.stack.length && <li className="font-mono text-[11px] text-muted-foreground">not built</li>}
        </ul>
      </div>

      {(project.github || project.liveUrl) && (
        <div className="flex flex-col gap-2">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between border border-border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                <Github className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[11px] font-mono uppercase tracking-wider">Source</span>
              </span>
              <span className="text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true">↗</span>
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between border border-border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[11px] font-mono uppercase tracking-wider">Live</span>
              </span>
              <span className="text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground leading-relaxed">
        <kbd className="border border-border px-1">[</kbd> <kbd className="border border-border px-1">]</kbd> previous · next
        <br />
        select any sentence to ask about it
      </p>
    </div>
  </aside>
);

/* ── Page ── */

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = PROJECTS.find((p) => p.id === id);
  /* Memoised: the contents rail and the mobile bar subscribe to scroll per
     section list, and a fresh array each render would resubscribe both. */
  const sections = useMemo(() => (project ? sectionsFor(project) : []), [project]);

  /* To the top on arrival — unless the address names a section, which is
     what a copied section link is for. */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const frame = requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [id]);

  const seo = useMemo(() => {
    if (!project) return null;
    const origin = getOrigin();
    const canonical = `${origin}/projects/${project.id}`;
    const description = truncate(project.caseStudy?.problem ?? project.description);
    const image = project.image ? `${origin}${project.image}` : `${origin}/og-image.jpg`;

    /* SoftwareSourceCode is the accurate schema.org type for an engineering
       project page, and lets the stack be expressed as programmingLanguage. */
    const projectSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: project.title,
      alternateName: project.subtitle,
      description: project.caseStudy?.approach ?? project.description,
      url: canonical,
      ...(project.github ? { codeRepository: project.github } : {}),
      programmingLanguage: project.stack,
      applicationCategory: project.category,
      author: { "@type": "Person", name: "Emmanuel Moghalu", url: origin },
      ...(project.image ? { image } : {}),
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Projects", item: `${origin}/#projects` },
        { "@type": "ListItem", position: 3, name: project.title, item: canonical },
      ],
    };

    return { canonical, description, image, projectSchema, breadcrumbSchema };
  }, [project]);

  if (!project || !seo) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background noise-overlay">
        <SEOHead
          metadata={{
            title: "Project not found | Emmanuel Moghalu",
            description: "This project does not exist. Browse the systems on the portfolio index instead.",
            robots: "noindex, follow",
          }}
        />
        <h1 className="text-2xl text-foreground font-bold font-mono tracking-tighter">404 // NOT_FOUND</h1>
        <button type="button" onClick={() => navigate("/")} className="text-primary hover:underline font-mono text-sm">
          Return to root
        </button>
      </div>
    );
  }

  const { caseStudy } = project;
  const headline = `${project.title} — ${project.subtitle}`;
  const minutes = readingMinutes(project);
  const decisionsNum = sections.find((s) => s.id === "decisions")?.num ?? "02";
  const fieldNotesNum = sections.find((s) => s.id === "field-notes")?.num ?? "05";

  const metadata: SEOMetadata = {
    title: `${headline} | Emmanuel Moghalu`,
    description: seo.description,
    canonical: seo.canonical,
    openGraph: { title: headline, description: seo.description, image: seo.image, imageAlt: headline, url: seo.canonical, type: "article" },
    twitter: {
      card: "summary_large_image",
      site: "@mrebr",
      creator: "@mrebr",
      title: headline,
      description: seo.description,
      image: seo.image,
    },
  };

  return (
    <div className="pt-28 md:pt-32 pb-24 min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
      <SEOHead metadata={metadata}>
        <script type="application/ld+json">{JSON.stringify(seo.projectSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(seo.breadcrumbSchema)}</script>
      </SEOHead>

      <ReadingProgress />

      {/* Background: the drafting grid, fading out below the hero. */}
      <div className="absolute inset-0 z-0 pointer-events-none noise-overlay" />
      <div
        className="absolute inset-x-0 top-0 h-[900px] z-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 90%)",
        }}
      />

      <div className="container px-6 md:px-12 max-w-6xl mx-auto relative z-10">
        <CaseHero project={project} minutes={minutes} />
        <CaseSummary project={project} />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-12 lg:gap-16">
          <motion.article
            initial={VIEW_TRANSITIONS ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-16 min-w-0"
          >
            <MobileContents sections={sections} />

            {/* Scope notice — stated up front, not buried. */}
            {caseStudy?.notice && (
              <div className="flex gap-4 border border-amber-500/25 bg-amber-500/5 p-5 -mt-6">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 mb-2">Scope notice</span>
                  <p className="text-[14px] text-foreground/75 leading-relaxed">{caseStudy.notice}</p>
                </div>
              </div>
            )}

            {caseStudy ? (
              <>
                <CaseSection id="problem" num="01" label="The Problem" icon={AlertTriangle}>
                  <p className={PROSE}>{caseStudy.problem}</p>
                  <CaseBlocks blocks={caseStudy.blocks?.problem} />
                </CaseSection>

                <CaseSection id="approach" num="02" label="The Approach" icon={Layers}>
                  <p className={PROSE}>{caseStudy.approach}</p>
                  <CaseBlocks blocks={caseStudy.blocks?.approach} />
                </CaseSection>

                <CaseSection
                  id="outcome"
                  num="03"
                  label="The Outcome"
                  icon={Target}
                  aside={
                    caseStudy.highlights?.length ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                        {caseStudy.highlights.length} highlights
                      </span>
                    ) : undefined
                  }
                >
                  <p className={PROSE}>{caseStudy.outcome}</p>
                  <CaseBlocks blocks={caseStudy.blocks?.outcome} />
                  {caseStudy.highlights?.length ? <Highlights items={caseStudy.highlights} /> : null}
                </CaseSection>

                {caseStudy.tradeoffs?.length ? (
                  <CaseSection
                    id="tradeoffs"
                    num="04"
                    label="Trade-offs"
                    icon={GitBranch}
                    aside={
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                        {caseStudy.tradeoffs.length} decisions
                      </span>
                    }
                  >
                    <Tradeoffs project={project} tradeoffs={caseStudy.tradeoffs} />
                  </CaseSection>
                ) : null}

                {caseStudy.fieldNotes?.length ? (
                  <CaseSection id="field-notes" num={fieldNotesNum} label="Field Notes" icon={Bug}>
                    <FieldNotesList notes={caseStudy.fieldNotes} />
                  </CaseSection>
                ) : null}
              </>
            ) : (
              /* No verified long-form source for this project — the short
                 form, rather than a template padded with invention. */
              <CaseSection id="overview" num="01" label="Overview" icon={Layers}>
                <p className={PROSE}>{project.description}</p>
              </CaseSection>
            )}

            {/* Decisions only where no trade-offs supersede them: both
                describe the same choices, and a trade-off names what lost. */}
            {project.decisions.length > 0 && !caseStudy?.tradeoffs?.length && (
              <CaseSection id="decisions" num={decisionsNum} label="Architecture Decisions" icon={GitBranch}>
                <ol className="flex flex-col gap-px bg-border border border-border">
                  {project.decisions.map((decision, i) => (
                    <li key={decision.title} className="bg-card p-5 md:p-6 flex gap-4">
                      <span className="font-mono text-[10px] tabular-nums text-primary pt-1">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <h3 className="text-[14px] font-semibold text-foreground mb-2">{decision.title}</h3>
                        <p className="text-[14px] text-foreground/75 leading-[1.75]">{decision.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CaseSection>
            )}

            {/* Last, because it is where a question occurs to someone. */}
            <CaseSection id="ask" num="→" label="Ask About It" icon={MessageSquare}>
              <ProjectAsk key={project.id} project={project} />
            </CaseSection>
          </motion.article>

          <Sidebar project={project} minutes={minutes} sections={sections} />
        </div>

        <CaseFooter project={project} all={PROJECTS} />
      </div>
    </div>
  );
};

export default ProjectDetail;
