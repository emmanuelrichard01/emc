import { PROJECTS } from '@/data/projects';
import { COMMIT_SHA, IS_DEV_BUILD, formatRelativeBuildTime } from '@/lib/buildInfo';

/* ==========================================================================
   MESSAGE OF THE DAY

   What the shell prints when you log in.

   Every line is derived from live data or build-time constants. That is the
   whole point of replacing what was here before: the hero used to play a
   scripted boot log —

     $ systemctl status ingestion-worker
     ● active (running) — 3/3 replicas healthy
     $ dbt run --select marts.core
     {"models":18,"ok":18,"rows":2400000,"elapsed":"11.3s"}

   — describing replicas, a broker and a dbt run that do not exist. It was
   the one piece of theatre left on a site whose own telemetry hook argues
   that "a console that claims 143K evt/s from a Kafka cluster that does not
   exist is set-dressing".

   A real login prints a real MOTD. Counting the actual projects and naming
   the actual deployed commit is both honest and a better demonstration —
   the numbers move when the work moves, because they are the work.
   ========================================================================== */

export type MotdTone = 'identity' | 'meta' | 'stat' | 'hint';

export interface MotdLine {
  text: string;
  tone: MotdTone;
}

const NAME = 'emmanuel moghalu';
const ROLE = 'data & backend engineer';

/** Where he is, and the offset a caller actually needs to schedule a call. */
const LOCATION = 'abuja, nigeria · utc+1';

/* Matches the Contact section's wording rather than inventing a stronger
   claim. "open to work" would be a status this site cannot verify; "open to
   opportunities" is what the page already says. */
const AVAILABILITY = 'open to opportunities';

/** `2 systems`, `1 case study` — explicit plural, since English is irregular. */
function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Builds the login banner.
 *
 * Called at render rather than memoised at module scope so the relative
 * deploy time is correct on a long-lived tab.
 */
export function buildMotd(): MotdLine[] {
  const built = PROJECTS.filter((p) => p.tier !== 'design').length;
  const studies = PROJECTS.filter((p) => p.caseStudy).length;
  const designs = PROJECTS.filter((p) => p.tier === 'design').length;

  const lines: MotdLine[] = [
    { text: `${NAME} — ${ROLE}`, tone: 'identity' },
    { text: `${LOCATION} · ${AVAILABILITY}`, tone: 'meta' },
  ];

  const inventory = [
    count(built, 'system', 'systems'),
    count(studies, 'case study', 'case studies'),
    designs > 0 ? count(designs, 'design study', 'design studies') : null,
  ].filter((part): part is string => part !== null);

  lines.push({ text: inventory.join(' · '), tone: 'stat' });

  // A local build has no commit to name, so the line is omitted rather than
  // printing "build dev" as though that meant something.
  if (!IS_DEV_BUILD) {
    const deployed = formatRelativeBuildTime();
    lines.push({
      text: `build ${COMMIT_SHA}${deployed ? ` · deployed ${deployed}` : ''}`,
      tone: 'stat',
    });
  }

  /* No "type help" line here on purpose. The prompt carries that instruction
     directly beneath it, where the reference puts it and where a reader is
     already looking; printing it in the banner as well said the same thing
     twice, four lines apart. */

  return lines;
}
