import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Info } from "lucide-react";

import { PROJECTS } from "@/data/projects";
import SEOHead from "@/components/SEOHead";
import { CaseBlocks } from "@/components/projects/CaseBlocks";
import ProjectAsk from "@/components/projects/ProjectAsk";
import { useArrivalHighlight } from "@/components/ai/answer/highlight";
import { CaseContents, MobileContents, ReadingProgress } from "@/components/case/CaseContents";
import { CaseHero } from "@/components/case/CaseHero";
import { toParagraphs } from "@/components/case/caseModel";
import { CaseSection, FieldNotesList, Highlights, Tradeoffs } from "@/components/case/CaseSections";
import { CaseFooter } from "@/components/case/CaseFooter";
import { readingMinutes, sectionsFor, type CaseSection as Section } from "@/components/case/caseModel";
import { MissingPage } from "@/pages/NotFound";
import { Reveal } from "@/components/ui/Reveal";
import { scrollToY } from "@/lib/smoothScroll";
import { recordCaseVisit } from "@/lib/visits";
import { VIEW_TRANSITIONS } from "@/lib/viewTransition";
import type { Project, SEOMetadata } from "@/types";

/* ==========================================================================
   CASE STUDY

   Laid out for the two ways these pages are actually read.

   Skimmed: the hero says what it is, whether it is running and how long the
   page takes; "in 30 seconds" gives the problem, approach and outcome in
   their own first words; the trade-offs are visually the heaviest thing on
   the page, because they are the most convincing.

   Read: a book layout — a contents rail on the left that fills as each
   section is read, with an estimate of the time left, and the reading
   column on the right set for sentences (17px, 68ch). Headings link to
   themselves, debugging stories fold to their symptoms, and at the end the
   assistant — told which page it is on — then the next chapter.

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
   for sentences, at a book's measure. */
/* 60ch, not 68: Inter's average letter is narrower than the "0" a ch is
   measured on, and 68ch set about 90 characters to a line. 60ch lands near
   70, inside the comfortable 65 to 75. */
const PROSE = "text-[16px] md:text-[17px] text-foreground/85 leading-[1.75] tracking-[-0.006em] max-w-[60ch]";

function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-5">
      {toParagraphs(text).map((paragraph, i) => (
        <p key={i} className={PROSE}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/* ── Rail ──
   The left margin of the book: where you are, what it is made of, where the
   source lives, and the two keys that turn the page. */

const Rail = ({ project, minutes, sections }: { project: Project; minutes: number; sections: Section[] }) => (
  /* h-full is load-bearing: a sticky child can only travel inside its
     parent's box, and the aside must claim the stretched grid cell. */
  <aside className="hidden lg:block h-full">
    <div className="sticky top-28 flex flex-col gap-10">
      <CaseContents sections={sections} minutes={minutes} />

      <div>
        <p className="t-caption text-foreground mb-2">Built with</p>
        <p className="t-caption leading-[1.7]">{project.stack.length ? project.stack.join(", ") : "Not built yet"}</p>
      </div>

      {(project.github || project.liveUrl) && (
        <ul className="flex flex-col gap-2 text-[13px]">
          {project.github && (
            <li>
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="link-draw">Code on GitHub</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </li>
          )}
          {project.liveUrl && (
            <li>
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="link-draw">Live site</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </li>
          )}
        </ul>
      )}

      <p className="t-caption leading-[1.9]">
        Press <kbd className="kbd">[</kbd> or <kbd className="kbd">]</kbd> for the previous or next project.
        <br />
        Highlight any sentence to ask about it.
      </p>
    </div>
  </aside>
);

/* ── Page ── */

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const project = PROJECTS.find((p) => p.id === id);
  /* Memoised: the contents rail and the mobile bar subscribe to scroll per
     section list, and a fresh array each render would resubscribe both. */
  const sections = useMemo(() => (project ? sectionsFor(project) : []), [project]);

  /* To the top on arrival — unless the address names a section, which is
     what a copied section link is for. */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const frame = requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) scrollToY(Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96), { immediate: true });
      });
      return () => cancelAnimationFrame(frame);
    }
    scrollToY(0, { immediate: true });
  }, [id]);

  /* Arriving from the assistant: show the sentence or section it cited. */
  useArrivalHighlight(project?.id);

  /* Remembered for this tab only, so the contact form can offer "Mention what you read". */
  useEffect(() => {
    if (project) recordCaseVisit(project.id);
  }, [project]);

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
      <MissingPage
        title="This project isn’t here."
        lede="There is no project at this address. It may have been renamed. You can find every project on the home page."
        seoTitle="Project not found | Emmanuel Moghalu"
        seoDescription="This project does not exist. See every project on the home page instead."
      />
    );
  }

  const { caseStudy } = project;
  const headline = `${project.title}: ${project.subtitle}`;
  const minutes = readingMinutes(project);

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
    <div className="pt-28 md:pt-36 pb-28 min-h-dvh bg-background relative">
      <SEOHead metadata={metadata}>
        <script type="application/ld+json">{JSON.stringify(seo.projectSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(seo.breadcrumbSchema)}</script>
      </SEOHead>

      <ReadingProgress />

      <div className="page-max page-x relative">
        <CaseHero project={project} minutes={minutes} />

        <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] gap-12 lg:gap-16 xl:gap-24">
          <Rail project={project} minutes={minutes} sections={sections} />
          <motion.article
            initial={VIEW_TRANSITIONS ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-24 md:gap-32 min-w-0 max-w-[880px]"
          >
            <MobileContents sections={sections} />

            {/* Scope notice — stated up front, not buried. */}
            {caseStudy?.notice && (
              <Reveal as="div" className="-mt-8 md:-mt-16 border-t border-border pt-5 md:pt-6 max-w-[60ch]">
                <p className="flex items-center gap-2 mb-2.5 t-caption">
                  <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Before you read: what this project does not do
                </p>
                <p className="text-[15px] text-foreground/85 leading-[1.7]">{caseStudy.notice}</p>
              </Reveal>
            )}

            {caseStudy ? (
              <>
                <CaseSection id="problem" label="The problem">
                  <Prose text={caseStudy.problem} />
                  <CaseBlocks blocks={caseStudy.blocks?.problem} />
                </CaseSection>

                <CaseSection id="approach" label="How it works">
                  <Prose text={caseStudy.approach} />
                  <CaseBlocks blocks={caseStudy.blocks?.approach} />
                </CaseSection>

                <CaseSection
                  id="outcome"
                  label="The result"
                  aside={caseStudy.highlights?.length ? `${caseStudy.highlights.length} key facts` : undefined}
                >
                  <Prose text={caseStudy.outcome} />
                  <CaseBlocks blocks={caseStudy.blocks?.outcome} />
                  {caseStudy.highlights?.length ? <Highlights items={caseStudy.highlights} /> : null}
                </CaseSection>

                {caseStudy.tradeoffs?.length ? (
                  <CaseSection id="tradeoffs" label="Choices and trade-offs" aside={`${caseStudy.tradeoffs.length} choices`}>
                    <Tradeoffs project={project} tradeoffs={caseStudy.tradeoffs} />
                  </CaseSection>
                ) : null}

                {caseStudy.fieldNotes?.length ? (
                  <CaseSection id="field-notes" label="Lessons from debugging" aside={`${caseStudy.fieldNotes.length} bugs`}>
                    <FieldNotesList notes={caseStudy.fieldNotes} />
                  </CaseSection>
                ) : null}
              </>
            ) : (
              /* No verified long-form source for this project — the short
                 form, rather than a template padded with invention. */
              <CaseSection id="overview" label="Overview">
                <Prose text={project.description} />
              </CaseSection>
            )}

            {/* Decisions only where no trade-offs supersede them: both
                describe the same choices, and a trade-off names what lost. */}
            {project.decisions.length > 0 && !caseStudy?.tradeoffs?.length && (
              <CaseSection id="decisions" label="Key decisions">
                <ol className="border-b border-border">
                  {project.decisions.map((decision, i) => (
                    <li key={decision.title} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-t border-border py-6">
                      <span className="t-folio pt-[0.35em]">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <h3 className="t-subhead text-foreground mb-2">{decision.title}</h3>
                        <p className="text-[15px] text-foreground/80 leading-[1.7] max-w-[68ch]">{decision.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CaseSection>
            )}

            {/* Last, because it is where a question occurs to someone. */}
            <CaseSection id="ask" label="Ask a question">
              <ProjectAsk key={project.id} project={project} />
            </CaseSection>
          </motion.article>
        </div>

        <CaseFooter project={project} all={PROJECTS} />
      </div>
    </div>
  );
};

export default ProjectDetail;
