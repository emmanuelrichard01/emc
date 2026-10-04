import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { PROJECTS } from "@/data/projects";
import { useAsk } from "@/components/ai/AskProvider";
import { Reveal, RevealText, SectionHead } from "@/components/ui/Reveal";
import FlagshipStage from "@/components/projects/FlagshipStage";
import WorkToolbar from "@/components/projects/WorkToolbar";
import ProjectIndex from "@/components/projects/ProjectIndex";
import ProjectCards from "@/components/projects/ProjectCards";
import StackMatrix from "@/components/projects/StackMatrix";
import CompareDock from "@/components/projects/CompareDock";
import {
  COMPARE_MAX,
  DEFAULT_STATE,
  TIERS,
  applyWork,
  isFiltered,
  rankStack,
  searchFromState,
  stateFromSearch,
  type Tier,
  type WorkState,
} from "@/components/projects/workModel";

/* ==========================================================================
   WORK

   Plates, then an index — the order of a studio monograph.

   The flagships get plates (FlagshipStage): four, each a full spread with
   a caption column, alternating sides so the run reads as a sequence.
   Below them, every project — flagships included, so filters mean what
   they say — in the index: one search line, and behind "Filter" the tier,
   stack, sort and two more views of the same results.

     index    the scanning view: one typographic table
     plates   the browsing view, art on every entry
     matrix   projects × technologies — breadth and depth at a glance

   Search reaches into the case studies, not just the titles, and says where
   it matched. Filter state lives in the URL, so "his Python systems, newest
   first" is a link. Any two or three projects can be compared side by side
   and the comparison handed to the assistant.

   Two guarantees this section is not allowed to lose, whatever the design:
   design-stage work always reads as not built (dashed rules and frames,
   "design stage, not built", the caveat below), and every figure is the
   data's — counted from PROJECTS, never written into the copy.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* Header figures, counted rather than written, so a sentence can never
   disagree with the catalogue directly beneath it. */
const BUILT_COUNT = PROJECTS.filter((p) => p.tier !== "design").length;
const DESIGN_COUNT = PROJECTS.length - BUILT_COUNT;
const CASE_STUDY_COUNT = PROJECTS.filter((p) => p.caseStudy).length;
const SOURCE_OPEN_COUNT = PROJECTS.filter((p) => p.github).length;
const LIVE_COUNT = PROJECTS.filter((p) => p.liveUrl && p.tier !== "design").length;
const FIELD_NOTE_COUNT = PROJECTS.reduce((n, p) => n + (p.caseStudy?.fieldNotes?.length ?? 0), 0);
const TRADEOFF_COUNT = PROJECTS.reduce((n, p) => n + (p.caseStudy?.tradeoffs?.length ?? 0), 0);

const FLAGSHIPS = PROJECTS.filter((p) => p.tier === "flagship");
const STACK = rankStack(PROJECTS);
const TIER_COUNTS = Object.fromEntries(TIERS.map((t) => [t, PROJECTS.filter((p) => p.tier === t).length])) as Record<Tier, number>;

/* ── URL-synced state ─────────────────────────────────────────────────────
   Read once from the address on mount; written back with replaceState so
   filtering never adds history entries (Back should leave the page, not
   undo a checkbox) and never goes through the router, which would re-render
   the whole route for a query-string change. The hash is kept, so the page
   stays anchored at #projects. */
function useWorkState(): [WorkState, (patch: Partial<WorkState>) => void] {
  const [state, setState] = React.useState<WorkState>(() =>
    typeof window === "undefined" ? DEFAULT_STATE : stateFromSearch(window.location.search, STACK.map((t) => t.name))
  );

  React.useEffect(() => {
    const search = searchFromState(state, window.location.search);
    if (search === window.location.search) return;
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", url);
  }, [state]);

  const update = React.useCallback((patch: Partial<WorkState>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update];
}

const Projects: React.FC = () => {
  const [state, update] = useWorkState();
  const [compare, setCompare] = React.useState<string[]>([]);
  const prefersReduced = useReducedMotion();
  const { openAsk } = useAsk();

  // The search input updates on every keystroke; the list follows it one
  // frame behind so typing never waits on a re-sort of three views.
  const deferredQuery = React.useDeferredValue(state.query);
  const results = React.useMemo(
    () => applyWork(PROJECTS, { ...state, query: deferredQuery }),
    [deferredQuery, state]
  );

  /* Other sections can point the catalogue at a technology — About's stack
     and the career ledger's tenure strip do, on click — without reaching into this section's state: they
     dispatch an event, and the filter becomes that one technology. */
  React.useEffect(() => {
    /* The assistant sends richer filters than one technology (several, a
       tier, a search), so the detail accepts all three; anything it names
       that the catalogue does not have is ignored rather than producing an
       empty list. */
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<{ stack?: string | string[]; tier?: string; query?: string }>).detail ?? {};
      const wanted = Array.isArray(detail.stack) ? detail.stack : detail.stack ? [detail.stack] : [];
      const stack = wanted.filter((tech) => STACK.some((t) => t.name === tech));
      const tier = detail.tier && (TIERS as readonly string[]).includes(detail.tier) ? (detail.tier as Tier) : null;
      const query = typeof detail.query === "string" ? detail.query.slice(0, 80) : "";
      if (stack.length || tier || query) update({ query, tier, stack });
    };
    window.addEventListener("emc:work-filter", onFilter);
    return () => window.removeEventListener("emc:work-filter", onFilter);
  }, [update]);

  const toggleCompare = React.useCallback((id: string) => {
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= COMPARE_MAX ? prev : [...prev, id]
    );
  }, []);
  const compared = compare.map((id) => PROJECTS.find((p) => p.id === id)!).filter(Boolean);

  const showsDesign = results.some((r) => r.project.tier === "design");
  // Grouping by tier only makes sense while the list is in tier order and
  // more than one tier is showing.
  const grouped = state.sort === "tier" && state.tier === null && !deferredQuery.trim();

  const resetFilters = () => update({ query: "", tier: null, stack: [] });

  return (
    <section id="projects" data-section="projects" className="page-x section-y relative" aria-labelledby="work-title">
      <div className="page-max">
        <SectionHead
          id="work-title"
          title="Selected systems"
          lede={
            <>
              {BUILT_COUNT} projects built and {DESIGN_COUNT} designed but not yet built. {CASE_STUDY_COUNT} have a full
              write-up: the problem, how it was solved, what it achieved, and the option that was turned down.
            </>
          }
          aside={
            /* The full count line from sm up; on a phone, the two that matter
               most, so the rule beside it is not crushed. */
            <span className="tabular-nums">
              {LIVE_COUNT} live · {SOURCE_OPEN_COUNT} with public code
              <span className="hidden sm:inline">
                {" "}· {TRADEOFF_COUNT} trade-offs · {FIELD_NOTE_COUNT} debugging stories
              </span>
            </span>
          }
          className="mb-20 md:mb-32"
        />

        <FlagshipStage projects={FLAGSHIPS} />

        {/* ── Index ──
            The anchor other sections send people to when they mean "the
            results" rather than "the section" (About's stack does). The
            scroll margin clears the fixed navbar. */}
        <div id="work-catalogue" className="scroll-mt-24 mt-32 md:mt-48 grid grid-cols-12 gap-x-6 gap-y-6 mb-12 md:mb-16 items-end">
          <RevealText as="h3" className="t-title col-span-12 md:col-span-6">
            All projects
          </RevealText>
          <Reveal className="col-span-12 md:col-span-6 lg:col-span-5 lg:col-start-8 flex flex-col gap-4" delay={0.1}>
            <p className="t-body">
              Every project, including the four above. The search looks through the full write-ups, and you can compare
              any two or three side by side.
            </p>
            <button
              type="button"
              onClick={() =>
                openAsk({
                  question: isFiltered(state) && results.length
                    ? `of ${results.slice(0, 5).map((r) => r.project.title).join(", ")}, which best shows how he works, and why?`
                    : "which of his systems is the strongest, and why?",
                })
              }
              className="tap group self-start inline-flex items-center gap-2 text-[14px] text-foreground"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary transition-transform duration-500 ease-out-expo group-hover:rotate-12" aria-hidden="true" />
              <span className="link-draw">{isFiltered(state) ? "Ask about these" : "Ask which to read first"}</span>
              <ArrowRight className="nudge w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </Reveal>
        </div>

        <WorkToolbar
          state={state}
          onChange={update}
          tierCounts={TIER_COUNTS}
          stack={STACK}
          total={PROJECTS.length}
          shown={results.length}
        />

        {/* Design-stage caveat, whenever such a project is on screen. */}
        {showsDesign && (
          <p className="t-caption mb-8 max-w-2xl">
            Rows under a dashed line, with outlined titles, are <span className="text-foreground">designed, not built</span>. They are plans
            written before any code, and nothing in them is running.
          </p>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={results.length === 0 ? "empty" : state.view}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {results.length === 0 ? (
              <div className="py-20 border-y border-border">
                <p className="t-heading text-foreground">Nothing matches that.</p>
                <p className="t-body mt-3 max-w-lg">
                  The search looks through every write-up. It may not be here, or it may be worded differently.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                  <button type="button" onClick={resetFilters} className="btn-line tap">
                    Clear filters
                  </button>
                  {state.query.trim() && (
                    <button
                      type="button"
                      onClick={() => openAsk({ question: `has he worked with ${state.query.trim()}?` })}
                      className="tap group inline-flex items-center gap-2 text-[14px] text-foreground"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span className="link-draw">Ask instead</span>
                    </button>
                  )}
                </div>
              </div>
            ) : state.view === "cards" ? (
              <ProjectCards results={results} grouped={grouped} compare={compare} onCompare={toggleCompare} compareMax={COMPARE_MAX} />
            ) : state.view === "matrix" ? (
              <StackMatrix
                results={results}
                all={PROJECTS}
                selectedStack={state.stack}
                onToggleStack={(tech) =>
                  update({ stack: state.stack.includes(tech) ? state.stack.filter((t) => t !== tech) : [...state.stack, tech] })
                }
              />
            ) : (
              <ProjectIndex
                results={results}
                query={deferredQuery}
                grouped={grouped}
                compare={compare}
                onCompare={toggleCompare}
                compareMax={COMPARE_MAX}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <CompareDock
        projects={compared}
        onRemove={(id) => setCompare((prev) => prev.filter((x) => x !== id))}
        onClear={() => setCompare([])}
      />
    </section>
  );
};

export default Projects;
