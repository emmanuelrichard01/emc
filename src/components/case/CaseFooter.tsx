import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { Reveal, RevealText, Rule } from '@/components/ui/Reveal';
import { navigateWithTransition } from '@/lib/viewTransition';
import type { Project } from '@/types';
import { relatedProjects, statusInWords } from './caseModel';

/* ==========================================================================
   CASE FOOTER — where to go from here

   The end of a chapter turns the page: the next case study, set large, is
   the one obvious way on. Above it, the more useful question — what else
   did he build with these tools? Related is by shared stack, weighted toward
   rare technologies, and says what is shared, so the link explains itself.
   The previous chapter is a quiet link beside it.

   `[` and `]` step through case studies from the keyboard, when focus is
   not in a field.
   ========================================================================== */

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function CaseFooter({ project, all }: { project: Project; all: Project[] }) {
  const navigate = useNavigate();
  const index = all.findIndex((p) => p.id === project.id);
  const previous = all[(index - 1 + all.length) % all.length];
  const next = all[(index + 1) % all.length];
  const related = relatedProjects(project, all);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === '[') navigateWithTransition(navigate, `/projects/${previous.id}`);
      if (e.key === ']') navigateWithTransition(navigate, `/projects/${next.id}`);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, previous.id, next.id]);

  return (
    <footer className="mt-28 md:mt-40">
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mb-28 md:mb-36">
          <Rule className="mb-10 md:mb-12" />
          <RevealText as="h2" id="related-title" className="t-heading text-foreground mb-10 md:mb-12">
            Projects built with the same tools
          </RevealText>
          {/* Index rows, as at the back of the monograph: what it is, what it
              shares with this project, and the way in. No cards. */}
          {/* No closing rule: the Next project rule below closes the list. */}
          <ul>
            {related.map(({ project: p, shared }, i) => (
              <Reveal as="li" key={p.id} delay={i * 0.06} className="border-t border-border">
                <TransitionLink
                  to={`/projects/${p.id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_8rem_1rem] items-baseline gap-x-6 gap-y-2 py-5 md:py-6"
                >
                  <span className="min-w-0">
                    <span className="block t-subhead text-foreground transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
                      {p.title}
                    </span>
                    <span className="block mt-1 t-caption">{p.subtitle}</span>
                  </span>
                  <span className="col-span-2 md:col-span-1 row-start-2 md:row-start-auto t-caption">
                    Also uses <span className="text-foreground">{shared.slice(0, 3).join(", ")}</span>
                    {shared.length > 3 ? ` and ${shared.length - 3} more` : ""}
                  </span>
                  <span className="t-caption md:text-right">{statusInWords(p)}</span>
                  <ArrowRight className="nudge hidden md:block w-4 h-4 self-center text-muted-quiet group-hover:text-foreground transition-colors" aria-hidden="true" />
                </TransitionLink>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Adjacent case studies">
        <Rule className="mb-10 md:mb-14" />
        <TransitionLink to={`/projects/${next.id}`} className="group block">
          <span className="flex items-center gap-3 t-caption mb-5">
            Next project
            <kbd className="kbd hidden md:inline-flex">]</kbd>
          </span>
          <span className="flex items-end justify-between gap-6">
            <span className="min-w-0">
              <span className="block t-display text-[clamp(2.5rem,1.2rem+5vw,5.5rem)] text-foreground transition-colors duration-500 group-hover:text-white">
                {next.title}
              </span>
              <span className="mt-4 block t-lede text-muted-foreground">{next.subtitle}</span>
            </span>
            <ArrowRight
              className="shrink-0 w-8 h-8 md:w-12 md:h-12 text-muted-foreground transition-[transform,color] duration-500 ease-out-expo group-hover:translate-x-2 group-hover:text-foreground mb-2"
              strokeWidth={1.25}
              aria-hidden="true"
            />
          </span>
        </TransitionLink>

        {/* No rule of its own: the site footer's rule follows it. */}
        <div className="mt-10 md:mt-12 flex flex-wrap items-center justify-between gap-4">
          <TransitionLink
            to={`/projects/${previous.id}`}
            className="group tap inline-flex items-center gap-2.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
            <span>
              Previous project: <span className="link-draw text-foreground">{previous.title}</span>
            </span>
            <kbd className="kbd hidden md:inline-flex">[</kbd>
          </TransitionLink>
          <TransitionLink
            to="/#projects"
            className="group tap inline-flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="link-draw">See all projects</span>
          </TransitionLink>
        </div>
      </nav>
    </footer>
  );
}
