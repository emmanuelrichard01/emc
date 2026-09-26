import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import ProjectArt from '@/components/projects/ProjectArt';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import { trackPointer } from '@/lib/pointer';
import { navigateWithTransition } from '@/lib/viewTransition';
import type { Project } from '@/types';
import { relatedProjects } from './caseModel';

/* ==========================================================================
   CASE FOOTER — where to go from here

   The end of a case study is the one moment a reader has proven they read
   case studies. The old footer offered "previous" and "next" in authored
   order, which is an order only the author knows. This keeps them — with a
   picture, so the next page is a thing you recognise rather than a name —
   and adds the more useful question: what else did he build with this?
   Related is by shared stack, weighted toward rare technologies, and says
   what is shared, so the link explains itself.

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
    <footer className="mt-24 pt-10 border-t border-border">
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mb-12">
          <h2 id="related-title" className="flex items-center gap-3 mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
            <span className="text-primary">//</span> built with the same tools
            <span className="flex-1 h-px bg-border" aria-hidden="true" />
          </h2>
          <ul className="grid sm:grid-cols-3 gap-4">
            {related.map(({ project: p, shared }) => {
              const status = projectStatus(p);
              return (
                <li key={p.id}>
                  <TransitionLink
                    to={`/projects/${p.id}`}
                    onPointerMove={trackPointer}
                    className="pointer-glow group flex flex-col h-full border border-border bg-card/30 hover:border-primary/40 transition-colors"
                  >
                    <ProjectArt project={p} compact className="aspect-[16/8] border-b border-border" />
                    <span className="flex flex-col flex-1 p-4">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[13px] text-foreground group-hover:text-primary transition-colors truncate">
                          {p.title}
                        </span>
                        <span className={`font-mono text-[9px] uppercase tracking-wider shrink-0 ${STATUS_CLASS[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </span>
                      <span className="mt-1 text-[12px] text-muted-foreground line-clamp-1">{p.subtitle}</span>
                      <span className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        shares <span className="text-primary/90">{shared.slice(0, 3).join(' · ')}</span>
                        {shared.length > 3 ? ` +${shared.length - 3}` : ''}
                      </span>
                    </span>
                  </TransitionLink>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <nav aria-label="Adjacent case studies" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { p: previous, dir: 'previous', key: '[' },
          { p: next, dir: 'next', key: ']' },
        ].map(({ p, dir, key }) => (
          <TransitionLink
            key={dir}
            to={`/projects/${p.id}`}
            className={`group flex items-center gap-4 p-4 border border-border bg-card/30 hover:border-primary/40 transition-colors ${
              dir === 'next' ? 'sm:flex-row-reverse sm:text-right' : ''
            }`}
          >
            <span className="relative w-24 shrink-0 border border-border overflow-hidden">
              <ProjectArt project={p} thumb className="aspect-[4/3]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 ${dir === 'next' ? 'sm:justify-end' : ''}`}>
                {dir === 'previous' && <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />}
                {dir}
                <kbd className="hidden md:inline border border-border px-1 text-[9px]">{key}</kbd>
                {dir === 'next' && <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />}
              </span>
              <span className="block text-[17px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{p.title}</span>
              <span className="block text-[12px] text-muted-foreground truncate">{p.subtitle}</span>
            </span>
          </TransitionLink>
        ))}
      </nav>
    </footer>
  );
}
