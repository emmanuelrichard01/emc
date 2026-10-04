// Relative imports only: api/ code bundles this module (see aiTools.ts).
import type { CaseSectionId } from './aiProtocol.js';

/* ==========================================================================
   AI ANSWER MARKUP

   What the model writes, and what every client renders. Deliberately tiny:
   enough structure for an answer to be scanned and checked, nothing that
   could carry styling, links or HTML the server did not produce.

     Paragraphs     separated by a blank line.
     Bullets        lines starting "- " (one list per block).
     Bold           **like this**, for the one phrase a reader should catch.
     Citation       [^project:mmr-engine] or [^project:mmr-engine#tradeoffs]
                    or [^role:medvax], straight after the claim it supports.
                    Rendered as a numbered chip that opens that exact place.
     Block          a line on its own: {{project:mmr-engine}},
                    {{compare:mmr-engine,vega-canva}}, {{role:medvax}},
                    {{code:mmr-engine}}, {{diagram:mmr-engine}}. Rendered from
                    the site's data, never from model text, so a block can
                    only ever show what the site actually says.

   The same parser runs on the server (to audit and to count what it drops)
   and in the browser (to render), including on half-streamed text, where a
   trailing fragment of markup is held back until it completes.
   ========================================================================== */

export type CiteRef =
  | { kind: 'project'; id: string; section?: CaseSectionId }
  | { kind: 'role'; id: string };

export type BlockRef =
  | { kind: 'project'; id: string }
  | { kind: 'compare'; ids: string[] }
  | { kind: 'role'; id: string }
  | { kind: 'code'; id: string }
  | { kind: 'diagram'; id: string };

export type Inline =
  | { type: 'text'; text: string; strong?: boolean }
  /** `n` is the citation's number, in order of first appearance. */
  | { type: 'cite'; ref: CiteRef; n: number };

export type AnswerNode =
  | { type: 'p'; inlines: Inline[] }
  | { type: 'list'; items: Inline[][] }
  | { type: 'block'; block: BlockRef };

export interface AnswerDoc {
  nodes: AnswerNode[];
  /** Unique citations in order; index + 1 is the number shown. */
  citations: CiteRef[];
}

const SECTIONS: readonly CaseSectionId[] = ['problem', 'approach', 'outcome', 'tradeoffs', 'decisions', 'field-notes', 'overview'];
const ID = '[a-z0-9][a-z0-9-]*';
/* A citation group: one reference, or several in one bracket the way models
   sometimes write them ("[^project:a, ^role:b]"). Any #section is accepted
   so the markup never leaks to the reader; one the case study does not have
   is dropped and the citation points at the project. */
const REF = `(?:project|role):${ID}(?:#[a-z][a-z-]*)?`;
const CITE = new RegExp(`\\[\\^${REF}(?:\\s*[,;]\\s*\\^?${REF})*\\]`, 'g');
const CITE_REF = new RegExp(`(project|role):(${ID})(?:#([a-z][a-z-]*))?`, 'g');
const BLOCK = new RegExp(`^\\{\\{(project|compare|role|code|diagram):(${ID}(?:\\s*,\\s*${ID})*)\\}\\}$`);

const citeKey = (ref: CiteRef) => (ref.kind === 'project' ? `p:${ref.id}#${ref.section ?? ''}` : `r:${ref.id}`);

/**
 * Removes a trailing fragment of markup that has not finished streaming, so
 * a half-written `[^proj` or `{{compa` or an unclosed `**` never flashes on
 * screen as literal text.
 */
export function holdBackPartial(text: string): string {
  let out = text;
  const lastCite = out.lastIndexOf('[^');
  if (lastCite !== -1 && !out.slice(lastCite).includes(']')) out = out.slice(0, lastCite);
  const lastBlock = out.lastIndexOf('{{');
  if (lastBlock !== -1 && !out.slice(lastBlock).includes('}}')) out = out.slice(0, lastBlock);
  // An odd number of ** means one is still open: drop the opener onward.
  const stars = out.match(/\*\*/g)?.length ?? 0;
  if (stars % 2 === 1) out = out.slice(0, out.lastIndexOf('**'));
  return out;
}

function parseInlines(text: string, citations: CiteRef[], seen: Map<string, number>): Inline[] {
  const out: Inline[] = [];
  // Bold first, by splitting on ** pairs; citations inside each run.
  const runs = text.split(/\*\*/);
  runs.forEach((run, i) => {
    const strong = i % 2 === 1;
    let last = 0;
    for (const match of run.matchAll(CITE)) {
      const before = run.slice(last, match.index);
      if (before) out.push({ type: 'text', text: before, ...(strong ? { strong } : {}) });
      for (const part of match[0].matchAll(CITE_REF)) {
        const section = SECTIONS.find((s) => s === part[3]);
        const ref: CiteRef =
          part[1] === 'project' ? { kind: 'project', id: part[2], ...(section ? { section } : {}) } : { kind: 'role', id: part[2] };
        const key = citeKey(ref);
        let n = seen.get(key);
        if (n === undefined) {
          citations.push(ref);
          n = citations.length;
          seen.set(key, n);
        }
        out.push({ type: 'cite', ref, n });
      }
      last = match.index! + match[0].length;
    }
    const tail = run.slice(last);
    if (tail) out.push({ type: 'text', text: tail, ...(strong ? { strong } : {}) });
  });
  // Tidy: a space left before a citation reads as "claim [1]" not "claim[1]".
  return out.filter((node) => node.type !== 'text' || node.text.length > 0);
}

function parseBlockRef(kind: string, raw: string): BlockRef {
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  switch (kind) {
    case 'compare':
      return { kind: 'compare', ids };
    case 'role':
      return { kind: 'role', id: ids[0] };
    case 'code':
      return { kind: 'code', id: ids[0] };
    case 'diagram':
      return { kind: 'diagram', id: ids[0] };
    default:
      return { kind: 'project', id: ids[0] };
  }
}

/** Parses answer markup. Pass `streaming` for text that is still arriving. */
export function parseAnswer(text: string, options: { streaming?: boolean } = {}): AnswerDoc {
  const source = (options.streaming ? holdBackPartial(text) : text).replace(/\r\n/g, '\n').trim();
  const citations: CiteRef[] = [];
  const seen = new Map<string, number>();
  const nodes: AnswerNode[] = [];
  if (!source) return { nodes, citations };

  for (const chunk of source.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
    if (!lines.length) continue;

    // A block directive on its own line; several may share a chunk.
    if (lines.every((l) => BLOCK.test(l.trim()))) {
      for (const line of lines) {
        const m = BLOCK.exec(line.trim())!;
        nodes.push({ type: 'block', block: parseBlockRef(m[1], m[2]) });
      }
      continue;
    }

    // A list: every line a bullet (continuation lines join the bullet above).
    if (/^\s*[-•]\s+/.test(lines[0])) {
      const items: string[] = [];
      for (const line of lines) {
        if (/^\s*[-•]\s+/.test(line)) items.push(line.replace(/^\s*[-•]\s+/, ''));
        else if (items.length) items[items.length - 1] += ` ${line.trim()}`;
      }
      nodes.push({ type: 'list', items: items.map((item) => parseInlines(item, citations, seen)) });
      continue;
    }

    // A paragraph; a stray directive inside one is kept as text by the
    // regex not matching mid-line, so nothing renders that was not asked for.
    nodes.push({ type: 'p', inlines: parseInlines(lines.map((l) => l.trim()).join(' '), citations, seen) });
  }
  return { nodes, citations };
}

/* ── Validation ─────────────────────────────────────────────────────────────
   Every citation and block must point at something real. The caller passes
   what exists (kept as plain data so this module needs no import of the
   site's data and stays pure). An unknown project or role is dropped; a
   citation to a section a project does not have keeps the project and
   loses the section. */

export interface KnownRefs {
  /** project id → the case-study sections it actually has. */
  projects: Map<string, ReadonlySet<CaseSectionId>>;
  roles: ReadonlySet<string>;
  /** Projects with at least one code block, and with an architecture diagram. */
  withCode: ReadonlySet<string>;
  withDiagram: ReadonlySet<string>;
}

export function validateAnswer(doc: AnswerDoc, known: KnownRefs): { doc: AnswerDoc; dropped: number } {
  let dropped = 0;
  const citations: CiteRef[] = [];
  const seen = new Map<string, number>();

  const fixCite = (ref: CiteRef): CiteRef | null => {
    if (ref.kind === 'role') return known.roles.has(ref.id) ? ref : null;
    const sections = known.projects.get(ref.id);
    if (!sections) return null;
    if (ref.section && !sections.has(ref.section)) return { kind: 'project', id: ref.id };
    return ref;
  };

  const fixInlines = (inlines: Inline[]): Inline[] =>
    inlines.flatMap((node): Inline[] => {
      if (node.type !== 'cite') return [node];
      const ref = fixCite(node.ref);
      if (!ref) {
        dropped++;
        return [];
      }
      const key = citeKey(ref);
      let n = seen.get(key);
      if (n === undefined) {
        citations.push(ref);
        n = citations.length;
        seen.set(key, n);
      }
      return [{ type: 'cite', ref, n }];
    });

  const blockOk = (block: BlockRef): BlockRef | null => {
    switch (block.kind) {
      case 'compare': {
        const ids = block.ids.filter((id) => known.projects.has(id));
        return ids.length >= 2 ? { kind: 'compare', ids: ids.slice(0, 4) } : null;
      }
      case 'role':
        return known.roles.has(block.id) ? block : null;
      case 'code':
        return known.withCode.has(block.id) ? block : null;
      case 'diagram':
        return known.withDiagram.has(block.id) ? block : null;
      default:
        return known.projects.has(block.id) ? block : null;
    }
  };

  const nodes = doc.nodes.flatMap((node): AnswerNode[] => {
    if (node.type === 'p') return [{ type: 'p', inlines: fixInlines(node.inlines) }];
    if (node.type === 'list') return [{ type: 'list', items: node.items.map(fixInlines) }];
    const block = blockOk(node.block);
    if (!block) {
      dropped++;
      return [];
    }
    return [{ type: 'block', block }];
  });

  return { doc: { nodes, citations }, dropped };
}

/* ── Plain text ─────────────────────────────────────────────────────────────
   For copying an answer, for screen-reader summaries and for anything that
   cannot render the markup: citations become [1], blocks become a line
   naming what they show. */

export function answerToPlainText(doc: AnswerDoc, titles: (ref: { kind: 'project' | 'role'; id: string }) => string): string {
  const inline = (inlines: Inline[]) =>
    inlines.map((node) => (node.type === 'text' ? node.text : `[${node.n}]`)).join('').replace(/\s+\[/g, ' [').trim();
  const lines: string[] = [];
  for (const node of doc.nodes) {
    if (node.type === 'p') lines.push(inline(node.inlines));
    else if (node.type === 'list') lines.push(node.items.map((item) => `- ${inline(item)}`).join('\n'));
    else {
      const b = node.block;
      const name = b.kind === 'compare' ? b.ids.map((id) => titles({ kind: 'project', id })).join(' vs ') : titles({ kind: b.kind === 'role' ? 'role' : 'project', id: b.id });
      lines.push(`(${b.kind === 'compare' ? 'Comparison' : b.kind === 'code' ? 'Code' : b.kind === 'diagram' ? 'Diagram' : 'Card'}: ${name})`);
    }
  }
  if (doc.citations.length) {
    lines.push(
      doc.citations
        .map((ref, i) => `[${i + 1}] ${titles(ref)}${ref.kind === 'project' && ref.section ? `, ${ref.section}` : ''}`)
        .join('\n')
    );
  }
  return lines.join('\n\n');
}

/** The markup with every directive removed: the text an audit should read. */
export function stripMarkup(text: string): string {
  return text
    .replace(CITE, '')
    .replace(new RegExp(BLOCK.source.slice(1, -1), 'g'), '')
    .replace(/\*\*/g, '');
}
