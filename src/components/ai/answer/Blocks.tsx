import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { EXPERIENCE } from '@/data/experience';
import type { BlockRef } from '@/lib/aiAnswer';
import { runAction } from '@/lib/aiActions';
import { projectStatus } from '@/lib/project';
import { STATUS_TEXT } from '@/components/projects/tiers';
import type { CaseBlock, Project } from '@/types';
import { projectById } from './answerModel';
import type { Register } from './Citation';

/* ==========================================================================
   ANSWER BLOCKS

   What an answer can show beside its sentences: a project, a comparison, a
   role, a piece of real code, the shape of a system. Every one is drawn from
   the site's own data by id. The model only names which; it never writes
   what a block says, so a block can only show what the site actually says.

   Two registers: reading (the dock and case-study panel, in the site's own
   type) and terminal (the hero's AI mode, compact and monospaced).
   ========================================================================== */

function firstBlock<K extends CaseBlock['kind']>(project: Project, kind: K): Extract<CaseBlock, { kind: K }> | undefined {
  const blocks = project.caseStudy?.blocks;
  if (!blocks) return undefined;
  for (const list of [blocks.problem, blocks.approach, blocks.outcome]) {
    const found = list?.find((b) => b.kind === kind);
    if (found) return found as Extract<CaseBlock, { kind: K }>;
  }
  return undefined;
}

const stackLine = (project: Project, max = 4) =>
  `${project.stack.slice(0, max).join(' · ')}${project.stack.length > max ? ` and ${project.stack.length - max} more` : ''}`;

/* ── Project ─────────────────────────────────────────────────────────── */

function ProjectCard({ project, register }: { project: Project; register: Register }) {
  const status = STATUS_TEXT[projectStatus(project)];
  if (register === 'terminal') {
    return (
      <TransitionLink
        to={`/projects/${project.id}`}
        className="group my-2 block border-l border-border pl-3 py-0.5 hover:border-primary/60 transition-colors"
      >
        <span className="text-foreground">{project.title}</span>
        <span className="text-muted-quiet"> · {status} · {project.timeline}</span>
        <span className="block text-muted-foreground">{project.subtitle}</span>
        <span className="block text-muted-quiet">{stackLine(project, 3)}</span>
        <span className="text-primary/80 group-hover:text-primary">→ open case study</span>
      </TransitionLink>
    );
  }
  return (
    <TransitionLink
      to={`/projects/${project.id}`}
      className="group my-4 grid grid-cols-[88px_1fr] gap-4 py-3 border-y border-border hover:border-rule-strong transition-colors"
    >
      <span className="block w-[88px] aspect-[16/10] overflow-hidden bg-card shadow-[inset_0_0_0_1px_hsl(var(--border))]">
        {project.image ? (
          <img src={project.image} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center font-display text-[10px] leading-tight text-muted-foreground">
            {project.title}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-3">
          <span className="t-subhead text-foreground truncate">{project.title}</span>
          <span className="shrink-0 text-[12px] text-muted-foreground">{status}</span>
        </span>
        <span className="block mt-0.5 text-[13px] text-muted-foreground truncate">{project.subtitle}</span>
        <span className="block mt-1.5 text-[12px] text-muted-quiet truncate">{stackLine(project)}</span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] text-foreground">
          <span className="link-draw">Read the case study</span>
          <ArrowRight className="nudge w-3 h-3" aria-hidden="true" />
        </span>
      </span>
    </TransitionLink>
  );
}

/* ── Compare ─────────────────────────────────────────────────────────── */

function Compare({ projects, register }: { projects: Project[]; register: Register }) {
  const rows: { label: string; value: (p: Project) => string }[] = [
    { label: 'Status', value: (p) => STATUS_TEXT[projectStatus(p)] },
    { label: 'Year', value: (p) => p.timeline },
    { label: 'Built with', value: (p) => p.stack.slice(0, 4).join(', ') },
    { label: 'Measured', value: (p) => p.metrics.slice(0, 2).map((m) => `${m.value} ${m.label.toLowerCase()}`).join('; ') || 'None listed' },
    {
      label: 'Write-up',
      value: (p) => {
        const t = p.caseStudy?.tradeoffs?.length ?? 0;
        const f = p.caseStudy?.fieldNotes?.length ?? 0;
        return p.caseStudy ? `${t} trade-off${t === 1 ? '' : 's'}, ${f} bug${f === 1 ? '' : 's'}` : 'Summary only';
      },
    },
  ];
  return (
    <div className={`my-4 overflow-x-auto ${register === 'terminal' ? 'text-[11.5px]' : 'text-[12.5px]'}`} data-lenis-prevent>
      <table className="w-full border-collapse min-w-[320px]">
        <caption className="sr-only">Comparison of {projects.map((p) => p.title).join(', ')}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="w-[84px]" />
            {projects.map((p) => (
              <th key={p.id} scope="col" className="text-left font-normal pb-2 pr-3 align-bottom">
                <TransitionLink to={`/projects/${p.id}`} className="text-foreground hover:text-primary transition-colors">
                  {p.title}
                </TransitionLink>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border">
              <th scope="row" className="text-left font-normal py-2 pr-3 align-top text-muted-quiet">
                {row.label}
              </th>
              {projects.map((p) => (
                <td key={p.id} className="py-2 pr-3 align-top text-muted-foreground tabular-nums">
                  {row.value(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Role ────────────────────────────────────────────────────────────── */

function RoleCard({ id, register }: { id: string; register: Register }) {
  const navigate = useNavigate();
  const role = EXPERIENCE.find((r) => r.id === id);
  if (!role) return null;
  const open = () => void runAction({ kind: 'open-role', label: role.company, id: role.id }, navigate);
  if (register === 'terminal') {
    return (
      <button type="button" onClick={open} className="group my-2 block w-full text-left border-l border-border pl-3 py-0.5 hover:border-primary/60 transition-colors">
        <span className="text-foreground">{role.company}</span>
        <span className="text-muted-quiet"> · {role.role} · {role.period}</span>
        <span className="block text-muted-foreground">{role.highlights[0]}</span>
        <span className="text-primary/80 group-hover:text-primary">→ show in career</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={open} className="group my-4 block w-full text-left py-3 border-y border-border hover:border-rule-strong transition-colors">
      <span className="flex items-baseline justify-between gap-3">
        <span className="t-subhead text-foreground">{role.company}</span>
        <span className="shrink-0 text-[12px] text-muted-quiet tabular-nums">{role.period}</span>
      </span>
      <span className="block mt-0.5 text-[13px] text-muted-foreground">{role.role}</span>
      <ul className="mt-2 space-y-1">
        {role.highlights.slice(0, 2).map((h) => (
          <li key={h} className="flex gap-2 text-[12.5px] leading-snug text-muted-foreground">
            <span className="mt-[0.6em] w-2 h-px shrink-0 bg-rule-strong" aria-hidden="true" />
            {h}
          </li>
        ))}
      </ul>
      <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-foreground">
        <span className="link-draw">Show in career</span>
        <ArrowRight className="nudge w-3 h-3" aria-hidden="true" />
      </span>
    </button>
  );
}

/* ── Code ────────────────────────────────────────────────────────────── */

function Code({ project, register }: { project: Project; register: Register }) {
  const block = firstBlock(project, 'code');
  if (!block) return null;
  const file = block.href ? block.href.split('/').slice(-1)[0] : block.lang;
  return (
    <figure className="my-4">
      <div className="bg-card shadow-[inset_0_0_0_1px_hsl(var(--border))]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2 text-[12px]">
          <span className="text-muted-foreground truncate">
            {project.title} <span className="text-muted-quiet">· {file}</span>
          </span>
          {block.href && (
            <a
              href={block.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group shrink-0 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="link-draw">View on GitHub</span>
              <ArrowUpRight className="nudge-up w-3 h-3" aria-hidden="true" />
            </a>
          )}
        </div>
        <pre
          className={`overflow-x-auto px-3.5 py-3 font-mono leading-[1.7] text-foreground/90 max-h-72 ${register === 'terminal' ? 'text-[11px]' : 'text-[11.5px]'}`}
          data-lenis-prevent
        >
          <code>{block.code}</code>
        </pre>
      </div>
      <figcaption className="mt-2 text-[12px] leading-snug text-muted-quiet">{block.caption}</figcaption>
    </figure>
  );
}

/* ── Diagram ─────────────────────────────────────────────────────────────
   The architecture block, as an outline: one column per stage, its parts
   beneath. The full drawn diagram lives on the case study, one click away;
   at a panel's width the outline is the readable form of the same data. */

function Diagram({ project, register }: { project: Project; register: Register }) {
  const block = firstBlock(project, 'architecture');
  if (!block) return null;
  return (
    <figure className={`my-4 ${register === 'terminal' ? 'border-l border-border pl-3' : 'border-y border-border py-3'}`}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(block.columns.length, 3)}, minmax(0, 1fr))` }}>
        {block.columns.map((col, i) => (
          <div key={col.label} className="min-w-0">
            <p className="text-[11.5px] text-muted-quiet flex items-center gap-1.5">
              {col.label}
              {i < block.columns.length - 1 && <ArrowRight className="w-3 h-3" aria-hidden="true" />}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {col.nodes.map((node) => (
                <li key={node.id} className="text-[12px] leading-snug">
                  <span className="block text-foreground">{node.label}</span>
                  {node.detail && <span className="block text-muted-quiet">{node.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-[12px] leading-snug text-muted-quiet">
        How {project.title} fits together.{' '}
        <TransitionLink to={`/projects/${project.id}#approach`} className="text-muted-foreground hover:text-foreground link-draw">
          See the full diagram
        </TransitionLink>
      </figcaption>
    </figure>
  );
}

/* ── Dispatcher ──────────────────────────────────────────────────────── */

export function AnswerBlock({ block, register }: { block: BlockRef; register: Register }) {
  switch (block.kind) {
    case 'compare': {
      const projects = block.ids.map(projectById).filter((p): p is Project => Boolean(p));
      return projects.length >= 2 ? <Compare projects={projects} register={register} /> : null;
    }
    case 'role':
      return <RoleCard id={block.id} register={register} />;
    default: {
      const project = projectById(block.id);
      if (!project) return null;
      if (block.kind === 'code') return <Code project={project} register={register} />;
      if (block.kind === 'diagram') return <Diagram project={project} register={register} />;
      return <ProjectCard project={project} register={register} />;
    }
  }
}
