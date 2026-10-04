import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { PRINCIPLES } from '@/data/principles';
import { STATUS_LABEL, projectStatus } from '@/lib/project';
import type { CaseBlock, ExperienceItem, Project } from '@/types';

/* ==========================================================================
   VIRTUAL FILESYSTEM

   The site's own data, laid out as files you can cd into and cat:

     ~/projects/<id>/   readme  problem  approach  outcome  tradeoffs
                        debugging  stack  notice  code/<file>
     ~/career/<id>/     role  highlights  stack
     ~/about/           principles  stack
     ~/contact

   Built from the same arrays that render the page, and only with the files
   that exist: a project without a case study has a readme and a stack, not
   an empty `problem`. Home is the root, so the prompt reads `~/projects`.
   ========================================================================== */

export type FileBody =
  | { kind: 'prose'; paragraphs: string[] }
  | { kind: 'lines'; lines: string[] }
  | { kind: 'code'; lang: string; code: string; caption?: string; href?: string };

/** Where `open` takes you for a node. */
export type OpenTarget =
  | { kind: 'case'; id: string; section?: string }
  | { kind: 'section'; section: 'about' | 'projects' | 'experience' | 'contact' }
  | { kind: 'role'; id: string }
  | { kind: 'home' };

export interface FsFile {
  type: 'file';
  name: string;
  path: string;
  body: FileBody;
  open: OpenTarget;
}

export interface FsDir {
  type: 'dir';
  name: string;
  path: string;
  children: FsNode[];
  open: OpenTarget;
  /** One line shown by `ls -l`. */
  note?: string;
}

export type FsNode = FsFile | FsDir;

/* ── Building ───────────────────────────────────────────────────────────── */

const dir = (path: string, open: OpenTarget, children: FsNode[], note?: string): FsDir => ({
  type: 'dir',
  name: path === '/' ? '~' : path.slice(path.lastIndexOf('/') + 1),
  path,
  children,
  open,
  note,
});

const file = (path: string, body: FileBody, open: OpenTarget): FsFile => ({
  type: 'file',
  name: path.slice(path.lastIndexOf('/') + 1),
  path,
  body,
  open,
});

const prose = (...paragraphs: (string | undefined | false)[]): FileBody => ({
  kind: 'prose',
  paragraphs: paragraphs.filter((p): p is string => Boolean(p)),
});

export function readmeLines(project: Project): string[] {
  const width = Math.max(8, ...project.metrics.map((m) => m.label.length)) + 2;
  const out = [
    project.title,
    project.subtitle,
    `[${project.category} · ${project.timeline} · ${STATUS_LABEL[projectStatus(project)]}]`,
  ];
  if (project.metrics.length) out.push('', ...project.metrics.map((m) => `${m.label.padEnd(width)}${m.value}`));
  out.push('', project.description);
  if (!project.caseStudy && project.decisions.length) {
    out.push('', 'decisions:', ...project.decisions.map((d) => `  ${d.title}: ${d.detail}`));
  }
  return out;
}

const EXT: Record<string, string> = { python: 'py', typescript: 'ts', ts: 'ts', tsx: 'tsx', sql: 'sql', javascript: 'js' };

function codeFileName(block: Extract<CaseBlock, { kind: 'code' }>, section: string, n: number, taken: Set<string>): string {
  let name = block.href ? block.href.slice(block.href.lastIndexOf('/') + 1) : `${section}-${n}.${EXT[block.lang] ?? 'txt'}`;
  if (taken.has(name)) name = `${section}-${n}-${name}`;
  taken.add(name);
  return name;
}

function projectDir(project: Project): FsDir {
  const base = `/projects/${project.id}`;
  const at = (section?: string): OpenTarget => ({ kind: 'case', id: project.id, section });
  const study = project.caseStudy;
  const children: FsNode[] = [file(`${base}/readme`, { kind: 'lines', lines: readmeLines(project) }, at())];

  if (study) {
    children.push(
      file(`${base}/problem`, prose(study.problem), at('problem')),
      file(`${base}/approach`, prose(study.approach), at('approach')),
      file(`${base}/outcome`, prose(study.outcome, ...(study.highlights ?? []).map((h) => `· ${h}`)), at('outcome'))
    );
    if (study.tradeoffs?.length) {
      children.push(
        file(
          `${base}/tradeoffs`,
          prose(...study.tradeoffs.map((t) => `${t.decision}: chose ${t.chose} over ${t.rejected}. ${t.why}`)),
          at('tradeoffs')
        )
      );
    }
    if (study.fieldNotes?.length) {
      children.push(
        file(
          `${base}/debugging`,
          prose(
            ...study.fieldNotes.flatMap((note) => [
              note.title.toUpperCase(),
              `Symptom: ${note.symptom}`,
              ...(note.wrongTurns ?? []).map((w) => `Tried: ${w}`),
              `Root cause: ${note.rootCause}`,
              `Fix: ${note.fix}`,
              ...(note.guard ? [`Guard: ${note.guard}`] : []),
            ])
          ),
          at('field-notes')
        )
      );
    }
  }

  children.push(file(`${base}/stack`, { kind: 'lines', lines: [...project.stack] }, at()));
  if (study?.notice) children.push(file(`${base}/notice`, prose(study.notice), at()));

  const taken = new Set<string>();
  const code: FsNode[] = [];
  for (const section of ['problem', 'approach', 'outcome'] as const) {
    (study?.blocks?.[section] ?? []).forEach((block, n) => {
      if (block.kind !== 'code') return;
      const name = codeFileName(block, section, n + 1, taken);
      code.push(
        file(`${base}/code/${name}`, { kind: 'code', lang: block.lang, code: block.code, caption: block.caption, href: block.href }, at(section))
      );
    });
  }
  if (code.length) children.push(dir(`${base}/code`, at(), code, 'excerpts from the repository'));

  return dir(base, at(), children, `${project.tier} · ${project.title}`);
}

function roleDir(role: ExperienceItem): FsDir {
  const base = `/career/${role.id}`;
  const open: OpenTarget = { kind: 'role', id: role.id };
  return dir(
    base,
    open,
    [
      file(`${base}/role`, prose(`${role.role}, ${role.company}`, `${role.type} · ${role.period}`, role.summary, role.note), open),
      file(`${base}/highlights`, { kind: 'lines', lines: role.highlights.map((h) => `· ${h}`) }, open),
      file(`${base}/stack`, { kind: 'lines', lines: [...role.stack] }, open),
    ],
    `${role.period} · ${role.company}`
  );
}

export const CONTACT_EMAIL = 'emma.moghalu@gmail.com';
export const CORE_STACK = ['Python', 'TypeScript', 'React', 'PostgreSQL', 'Redpanda', 'dbt', 'Docker', 'Redis'];
/** What this site itself is built with, for `whoami` and ~/about/stack. */
export const SITE_STACK = ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion'];

function build(): FsDir {
  const about: OpenTarget = { kind: 'section', section: 'about' };
  return dir('/', { kind: 'home' }, [
    dir('/projects', { kind: 'section', section: 'projects' }, PROJECTS.map(projectDir), `${PROJECTS.length} systems`),
    dir('/career', { kind: 'section', section: 'experience' }, EXPERIENCE.map(roleDir), `${EXPERIENCE.length} roles`),
    dir(
      '/about',
      about,
      [
        file('/about/principles', prose(...PRINCIPLES.map((p) => `${p.title}. ${p.gist} ${p.example}`)), about),
        file(
          '/about/stack',
          { kind: 'lines', lines: [...CORE_STACK, '', 'this site:', ...SITE_STACK.map((s) => `  ${s}`)] },
          about
        ),
      ],
      'how the work is done'
    ),
    file(
      '/contact',
      {
        kind: 'lines',
        lines: [
          `email    ${CONTACT_EMAIL}`,
          'cv       run `resume` to download it',
          '',
          'Open to new roles and projects. Run `email` to copy the address.',
        ],
      },
      { kind: 'section', section: 'contact' }
    ),
  ]);
}

export const ROOT: FsDir = build();

/* ── Paths ──────────────────────────────────────────────────────────────── */

/**
 * Resolves `input` against `cwd` into an absolute path. Handles `~`, `.`,
 * `..` (which stops at the root, as it does in a real shell) and trailing
 * slashes. Does not check that the path exists; `lookup` does.
 */
export function resolvePath(cwd: string, input: string): string {
  let raw = input.trim();
  if (raw === '' || raw === '~') return '/';
  if (raw.startsWith('~/')) raw = raw.slice(1);
  const parts = raw.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

export function lookup(path: string, root: FsDir = ROOT): FsNode | null {
  let node: FsNode = root;
  for (const part of path.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return null;
    const next: FsNode | undefined = node.children.find((c) => c.name.toLowerCase() === part.toLowerCase());
    if (!next) return null;
    node = next;
  }
  return node;
}

/** `/projects/x` → `~/projects/x`, `/` → `~`. */
export function displayPath(path: string): string {
  return path === '/' ? '~' : `~${path}`;
}

/** Every node, depth first, root included. */
export function walk(node: FsNode = ROOT): FsNode[] {
  return node.type === 'dir' ? [node, ...node.children.flatMap((c) => walk(c))] : [node];
}

export function bodyText(body: FileBody): string[] {
  if (body.kind === 'prose') return body.paragraphs;
  if (body.kind === 'lines') return body.lines;
  return body.code.split('\n');
}

/* ── Tree and find ──────────────────────────────────────────────────────── */

export function tree(node: FsDir, depth = Infinity): { lines: string[]; paths: string[]; dirs: number; files: number } {
  const lines = [displayPath(node.path)];
  const paths = [node.path];
  let dirs = 0;
  let files = 0;

  const visit = (current: FsDir, prefix: string, level: number) => {
    current.children.forEach((child, i) => {
      const last = i === current.children.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${child.name}${child.type === 'dir' ? '/' : ''}`);
      paths.push(child.path);
      if (child.type === 'dir') {
        dirs++;
        if (level < depth) visit(child, `${prefix}${last ? '    ' : '│   '}`, level + 1);
      } else files++;
    });
  };
  visit(node, '', 1);
  return { lines, paths, dirs, files };
}

/** `*` and `?` glob, matched against the whole name, case-insensitive. */
export function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

export function find(start: FsNode, options: { name?: string; grep?: string; type?: 'f' | 'd' }): FsNode[] {
  const nameRe = options.name ? globToRegExp(options.name) : null;
  const needle = options.grep?.toLowerCase();
  return walk(start).filter((node) => {
    if (node === start && node.type === 'dir') return false;
    if (options.type === 'f' && node.type !== 'file') return false;
    if (options.type === 'd' && node.type !== 'dir') return false;
    if (nameRe && !nameRe.test(node.name)) return false;
    if (needle) {
      if (node.type !== 'file') return false;
      return bodyText(node.body).some((line) => line.toLowerCase().includes(needle));
    }
    return true;
  });
}

/* ── Projects listing ───────────────────────────────────────────────────── */

export const ALL_TECHS: string[] = [...new Set(PROJECTS.flatMap((p) => p.stack))].sort((a, b) => a.localeCompare(b));
export const TIERS = ['flagship', 'production', 'system', 'design'] as const;

/** `ls /projects --stack=Redis,Python --tier=system`: every given filter must hold. */
export function filterProjects(options: { stack?: string; tier?: string }): Project[] {
  const wanted = (options.stack ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const tier = options.tier?.toLowerCase();
  return PROJECTS.filter(
    (p) =>
      (!tier || p.tier === tier) &&
      wanted.every((w) => p.stack.some((s) => s.toLowerCase() === w || s.toLowerCase().includes(w)))
  );
}
