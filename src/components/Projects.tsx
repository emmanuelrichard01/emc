import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, Terminal } from "lucide-react";

import { PROJECTS } from "@/data/projects";
import { useAsk } from "@/components/ai/AskProvider";
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

   A stage, then a catalogue.

   The flagships get a stage (FlagshipStage): four, chosen between rather
   than rotated, each at a size that shows what it is. Below it, every
   project — flagships included, so filters mean what they say — in the
   catalogue: one toolbar, three views of the same results.

     index    the scanning view, in the terminal's language
     cards    the browsing view, art on every card
     matrix   projects × technologies — breadth and depth at a glance

   Search reaches into the case studies, not just the titles, and says where
   it matched. Filter state lives in the URL, so "his Python systems, newest
   first" is a link. Any two or three projects can be compared side by side
   and the comparison handed to the assistant.

   Two guarantees this section is not allowed to lose, whatever the design:
   design-stage work always reads as not built (dashed borders, DESIGN STAGE
   in amber, the caveat below), and every figure is the data's — counted
   from PROJECTS, never written into the copy.
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
    <section id="projects" data-section="projects" className="py-24 relative" aria-label="Projects and case studies">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-12 border-b border-border pb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <div>
            <span className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
              <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
              Module 02 // Engineering
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Systems <span className="text-muted-foreground font-mono font-normal">Index</span>
            </h2>
            <p className="text-[15px] md:text-[13px] text-muted-foreground max-w-md font-light leading-relaxed">
              {BUILT_COUNT} built systems and {DESIGN_COUNT} design studies. {CASE_STUDY_COUNT} carry a full case
              study — the problem, the approach, the measured outcome, and the alternative that was rejected.
            </p>
          </div>

          {/* The catalogue's totals as a ledger — what a reader can go and
              check, not adjectives about it. */}
          <dl className="grid grid-cols-4 border border-border divide-x divide-border bg-card/30 self-start lg:self-end">
            {[
              { label: "live", value: LIVE_COUNT },
              { label: "source open", value: SOURCE_OPEN_COUNT },
              { label: "trade-offs", value: TRADEOFF_COUNT },
              { label: "field notes", value: FIELD_NOTE_COUNT },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3 min-w-[84px]">
                <dd className="font-mono text-xl text-foreground tabular-nums leading-none">{item.value}</dd>
                <dt className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">{item.label}</dt>
              </div>
            ))}
          </dl>
        </motion.div>

        <FlagshipStage projects={FLAGSHIPS} />

        {/* ── Catalogue ── */}
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
            <span className="text-primary mr-2">//</span>catalogue
          </h3>
          <button
            type="button"
            onClick={() =>
              openAsk({
                question: isFiltered(state) && results.length
                  ? `of ${results.slice(0, 5).map((r) => r.project.title).join(", ")}, which best shows how he works, and why?`
                  : "which of his systems is the strongest, and why?",
              })
            }
            className="group inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            <Sparkles className="w-3 h-3 text-primary/70 group-hover:text-primary transition-colors" aria-hidden="true" />
            {isFiltered(state) ? "ask about these" : "ask which to read first"}
          </button>
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
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-5 max-w-2xl">
            Entries marked <span className="text-amber-400 font-mono">DESIGN STAGE</span> are reference architectures
            produced ahead of implementation — specified, not built, and not running in production.
          </p>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={results.length === 0 ? "empty" : state.view}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {results.length === 0 ? (
              <div className="py-16 px-6 text-center border border-dashed border-border">
                <p className="font-mono text-[12px] text-foreground mb-2">nothing matches that</p>
                <p className="text-[12px] text-muted-foreground mb-5">
                  the search reads every case study, so it may not be here — or it may be phrased differently.
                </p>
                <div className="flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-mono text-[10px] uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
                  >
                    clear filters
                  </button>
                  {state.query.trim() && (
                    <button
                      type="button"
                      onClick={() => openAsk({ question: `has he worked with ${state.query.trim()}?` })}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      ask instead
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
