import fs from 'fs';
import path from 'path';

import { PROJECTS } from '../src/data/projects.ts';
import { EXPERIENCE } from '../src/data/experience.ts';

/* ==========================================================================
   AI CONTEXT PACK

   Emits api/_context.json — the compact index the answering endpoint embeds
   in its system prompt.

   Deliberately an *index*, not a dump. Every case study inlined would be
   ~20k tokens on every question, most of it irrelevant; this carries one
   line per project and role, and the model pulls full detail through the
   get_project tool only when a question actually needs it. That is the whole
   retrieval strategy, and at this corpus size it does not need to be more.

   Generated rather than hand-written for the same reason the sitemap is: the
   endpoint must describe the projects that exist, not the ones that existed
   when someone last remembered to update a prompt.

   Run by `npm run build` via prebuild. The output is committed so the
   function always has it, even if a build step is reordered.
   ========================================================================== */

const OUT = path.join(process.cwd(), 'api', '_context.json');

/** Mirrors lib/project.ts, which cannot be imported here (it uses @/ aliases). */
function statusOf(project) {
  if (project.tier === 'design') return 'design-stage, not built';
  if (project.liveUrl) return 'live';
  if (project.github) return 'source available';
  return 'private build';
}

const projects = PROJECTS.map((p) => ({
  id: p.id,
  title: p.title,
  subtitle: p.subtitle,
  tier: p.tier,
  category: p.category,
  timeline: p.timeline,
  status: statusOf(p),
  stack: p.stack,
  metrics: p.metrics.map((m) => `${m.label}: ${m.value}`),
  // The problem statement is the single most useful line for answering
  // "what is this?" — the rest of the case study is available on demand.
  summary: p.caseStudy?.problem ?? p.description,
  hasCaseStudy: Boolean(p.caseStudy),
  tradeoffCount: p.caseStudy?.tradeoffs?.length ?? 0,
  links: {
    ...(p.github ? { github: p.github } : {}),
    ...(p.liveUrl ? { live: p.liveUrl } : {}),
  },
}));

const experience = EXPERIENCE.map((e) => ({
  id: e.id,
  company: e.company,
  role: e.role,
  type: e.type,
  period: e.period,
  summary: e.summary,
  stack: e.stack,
  ...(e.note ? { note: e.note } : {}),
}));

const context = {
  generatedAt: new Date().toISOString(),
  person: {
    name: 'Emmanuel Moghalu',
    role: 'Data & Backend Engineer',
    location: 'Abuja, Nigeria',
    timezone: 'UTC+1',
    availability: 'open to opportunities, remote or hybrid',
    email: 'emma.moghalu@gmail.com',
    links: {
      github: 'https://github.com/emmanuelrichard01',
      linkedin: 'https://www.linkedin.com/in/e-mc/',
      x: 'https://x.com/mrebr',
      site: 'https://www.builtbyem.dev',
    },
    focus: [
      'event-driven data pipelines',
      'payment reconciliation and multi-PSP integration',
      'stream processing',
      'analytics warehouses',
      'Nigerian fintech (CBN, NDPR compliance)',
    ],
  },
  counts: {
    builtSystems: PROJECTS.filter((p) => p.tier !== 'design').length,
    designStudies: PROJECTS.filter((p) => p.tier === 'design').length,
    caseStudies: PROJECTS.filter((p) => p.caseStudy).length,
    roles: EXPERIENCE.length,
  },
  projects,
  experience,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(context, null, 2)}\n`, 'utf8');

const bytes = fs.statSync(OUT).size;
console.log(
  `ai context: ${projects.length} projects, ${experience.length} roles → api/_context.json (${(bytes / 1024).toFixed(1)} KB, ~${Math.round(bytes / 4)} tokens)`
);
