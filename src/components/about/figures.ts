import type { ExperienceItem, Project } from '@/types';

/* ==========================================================================
   FIGURES

   The three numbers at the top of About, each derived from the data the
   rest of the site renders rather than typed beside it, and each carrying
   its receipts: the parts it was added up from and where they are written.

     tests    the sum of every project's stated test count (Project.testCount),
              rounded DOWN to two significant figures, with "+" only when
              the true sum is above what is shown. Never rounded up.
     records  the warehouse's own "Records" metric, with the sentence that
              breaks it down
     users    the figure in the role summary or highlight that states it

   If a source stops saying what a figure rests on, the figure disappears
   (and a test fails) instead of the page asserting something it cannot show.
   ========================================================================== */

export interface Receipt {
  /** What this part is: a project title, or a role. */
  label: string;
  /** The part's own figure, as written: "4,076", "1.5M+". */
  value: string;
  /** A few words on what was counted. */
  note: string;
  /** Where it is shown on the site. */
  href: string | null;
}

export interface Figure {
  id: 'tests' | 'records' | 'users';
  /** The number the counter animates to, before the suffix. */
  value: number;
  suffix: string;
  label: string;
  /** One line under the label: where the figure came from. */
  source: string;
  /** The exact figure, when the shown one is rounded. */
  exact?: string;
  receipts: Receipt[];
}

export const formatCount = (n: number): string => n.toLocaleString('en-US');

/**
 * Rounds down to two significant figures: 4,589 → 4,500, 276 → 270, 36 → 36.
 * `plus` is true only when something was cut off, so "4,500+" is always true
 * and "36" is never written "36+".
 */
export function roundDown(n: number): { value: number; plus: boolean } {
  if (n < 100) return { value: n, plus: false };
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  const value = Math.floor(n / step) * step;
  return { value, plus: value < n };
}

/** Every built project that states a test count, largest first. */
export function testParts(projects: readonly Project[]): (Receipt & { count: number })[] {
  return projects
    .filter((p) => p.tier !== 'design' && p.testCount)
    .map((p) => ({
      label: p.title,
      count: p.testCount!.value,
      value: formatCount(p.testCount!.value),
      note: p.testCount!.source,
      href: `/projects/${p.id}`,
    }))
    .sort((a, b) => b.count - a.count);
}

/** The sentence in `text` that contains `needle`, or null. */
export function sentenceWith(text: string, needle: string): string | null {
  // Split after a stop followed by a space, so "1.5M+" and "5.7ms" stay whole.
  const sentences = text.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => s.includes(needle));
  return hit ? hit.trim() : null;
}

/** "1.5M+" → { value: 1.5, suffix: "M+" }; "50,000+" → { value: 50, suffix: "K+" }. */
export function readFigure(text: string): { value: number; suffix: string } | null {
  const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*([KkMm])?(\+)?/);
  if (!m) return null;
  const raw = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(raw)) return null;
  const plus = m[3] ?? '';
  if (m[2]) return { value: raw, suffix: `${m[2].toUpperCase()}${plus}` };
  if (raw >= 1_000_000 && raw % 100_000 === 0) return { value: raw / 1_000_000, suffix: `M${plus}` };
  if (raw >= 1_000 && raw % 1_000 === 0) return { value: raw / 1_000, suffix: `K${plus}` };
  return { value: raw, suffix: plus };
}

export function buildFigures(projects: readonly Project[], roles: readonly ExperienceItem[]): Figure[] {
  const out: Figure[] = [];

  /* ── Tests ── */
  const parts = testParts(projects);
  if (parts.length) {
    const sum = parts.reduce((n, p) => n + p.count, 0);
    const shown = roundDown(sum);
    out.push({
      id: 'tests',
      value: shown.value,
      suffix: shown.plus ? '+' : '',
      label: 'Automated tests',
      source: `Added up across ${parts.length} projects`,
      exact: formatCount(sum),
      receipts: parts.map(({ count: _count, ...receipt }) => receipt),
    });
  }

  /* ── Records ── */
  const warehouse = projects.find((p) => p.id === 'modern-warehouse');
  const records = warehouse?.metrics.find((m) => m.label === 'Records');
  const recordsFigure = records && readFigure(records.value);
  if (warehouse && records && recordsFigure) {
    const breakdown = [warehouse.caseStudy?.outcome, warehouse.description]
      .map((t) => t && sentenceWith(t, records.value))
      .find(Boolean);
    out.push({
      id: 'records',
      ...recordsFigure,
      label: 'Records processed',
      source: 'In one data warehouse',
      receipts: [
        {
          label: warehouse.title,
          value: records.value,
          note: breakdown ?? warehouse.subtitle,
          href: `/projects/${warehouse.id}`,
        },
      ],
    });
  }

  /* ── Users ── */
  for (const role of roles) {
    const line = [role.summary, ...role.highlights].find((h) => /\d[\d,]*\+?\s+people/.test(h));
    const match = line?.match(/(\d[\d,]*\+?)\s+people/);
    const figure = match && readFigure(match[1]);
    if (!line || !match || !figure) continue;
    out.push({
      id: 'users',
      ...figure,
      label: 'Users served',
      source: `At ${titleCase(role.company)}`,
      receipts: [
        {
          label: `${titleCase(role.company)}, ${role.role}`,
          value: match[1],
          note: sentenceWith(line, match[1]) ?? line,
          href: null,
        },
      ],
    });
    break;
  }

  return out;
}

/** "TAC AFRICA" → "TAC Africa": keeps a short acronym, softens a shouted word. */
function titleCase(name: string): string {
  return name
    .split(' ')
    .map((w) => (w.length <= 3 || w !== w.toUpperCase() ? w : w[0] + w.slice(1).toLowerCase()))
    .join(' ');
}
