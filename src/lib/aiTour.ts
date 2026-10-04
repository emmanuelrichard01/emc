import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { projectStatus } from './project';
import { usesTech } from './techFamily';
import type { AiAction } from './aiProtocol';
import type { ExperienceItem, Project } from '@/types';

/* ==========================================================================
   GUIDED TOUR

   A two-minute walk through the site for one kind of visitor, run by the
   tour bar (components/ai/modes/TourBar.tsx). Deliberately not a model
   call: the stops are a script, and every caption is assembled from the
   same data the page renders, so a number in a caption is always the number
   on the page it points at. Nothing here can be wrong in a way the page
   beside it is not.

   Each audience gets five to seven stops and ends on the door that fits it:
   hiring on the CV and the role door, clients on the project door.
   ========================================================================== */

export type TourAudience = 'hiring' | 'engineer' | 'client';

export interface TourStop {
  /** Stable key for the stop, for React and for tests. */
  id: string;
  /** Short name of the place, shown above the caption. */
  place: string;
  action: AiAction;
  /** One plain sentence, at most 25 words, built from the data. */
  caption: string;
}

export const TOUR_AUDIENCES: readonly { id: TourAudience; label: string; hint: string }[] = [
  { id: 'hiring', label: 'Hiring', hint: 'What he has built, where he has worked, and how to reach him.' },
  { id: 'engineer', label: 'Engineer', hint: 'How the systems work, what was turned down, and what broke.' },
  { id: 'client', label: 'Client', hint: 'What is live today, what it does, and how to start a project.' },
];

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** A Title Case subtitle as a phrase inside a sentence: "Real-Time Collaborative Canvas" to "real-time collaborative canvas". Acronyms (AI, PSP, IoT) keep their capitals. */
export function asPhrase(title: string): string {
  return title
    .split(/(\s+)/)
    .map((word) => (/[A-Z].*[A-Z]/.test(word.replace(/-[A-Z]/g, '-x')) ? word : word.toLowerCase()))
    .join('')
    .replace(/\s&\s/g, ' and ');
}

function metric(project: Project, label: string): string {
  return project.metrics.find((m) => m.label.toLowerCase() === label.toLowerCase())?.value ?? '';
}

function firstYear(roles: readonly ExperienceItem[]): number {
  const years = roles.flatMap((r) => (r.period.match(/\d{4}/g) ?? []).map(Number));
  return years.length ? Math.min(...years) : new Date().getFullYear();
}

function host(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function buildTour(
  audience: TourAudience,
  projects: readonly Project[] = PROJECTS,
  roles: readonly ExperienceItem[] = EXPERIENCE
): TourStop[] {
  const find = (id: string) => projects.find((p) => p.id === id);
  const built = projects.filter((p) => p.tier !== 'design');
  const live = built.filter((p) => projectStatus(p) === 'live');
  const since = firstYear(roles);
  const latest = roles[0];
  const stops: TourStop[] = [];

  const add = (stop: TourStop | null | false | undefined) => {
    if (stop) stops.push(stop);
  };

  const mmr = find('mmr-engine');
  const vega = find('vega-canva');
  const grl = find('global-rate-limiter');
  const news = find('ultra-news');
  const medvax = find('medvax');

  if (audience === 'hiring') {
    add({
      id: 'about',
      place: 'About',
      action: { kind: 'go-to', section: 'about', label: 'About' },
      caption: `Emmanuel Moghalu, software and data engineer: ${roles.length} roles since ${since}, and the habits behind the work.`,
    });
    add(
      mmr && {
        id: 'mmr',
        place: mmr.title,
        action: { kind: 'open-case', id: mmr.id, section: 'outcome', label: mmr.title },
        caption: `${mmr.title}: payment reconciliation with ${metric(mmr, 'Automated Tests')} automated tests, ${metric(mmr, 'Against Real Postgres')} of them against a real database.`,
      }
    );
    add(
      vega && {
        id: 'vega',
        place: vega.title,
        action: { kind: 'open-case', id: vega.id, section: 'outcome', label: vega.title },
        caption: `${vega.title}: a ${asPhrase(vega.subtitle)}, live at ${host(vega.liveUrl)}, with ${metric(vega, 'Automated Tests')} automated tests.`,
      }
    );
    add({
      id: 'career',
      place: 'Career',
      action: { kind: 'go-to', section: 'experience', label: 'Career' },
      caption: `The career on one timeline: ${roles.length} roles since ${since}, with the overlaps counted once.`,
    });
    add(
      latest && {
        id: 'latest-role',
        place: latest.company,
        action: { kind: 'open-role', id: latest.id, label: latest.company },
        caption: `Most recently at ${latest.company}, ${latest.period}: ${latest.role}.`,
      }
    );
    add({
      id: 'contact',
      place: 'Contact',
      action: { kind: 'go-to', section: 'contact', label: 'Contact' },
      caption: 'Hiring? Download the CV here, or write about the role. Every reply comes from Emmanuel himself.',
    });
  }

  if (audience === 'engineer') {
    add(
      mmr && {
        id: 'mmr-tradeoffs',
        place: `${mmr.title} trade-offs`,
        action: { kind: 'open-case', id: mmr.id, section: 'tradeoffs', label: `${mmr.title} trade-offs` },
        caption: `${mmr.title}: ${mmr.caseStudy?.tradeoffs?.length ?? 0} trade-offs, each with the option that was turned down and why.`,
      }
    );
    add(
      vega && {
        id: 'vega-bugs',
        place: `${vega.title} debugging`,
        action: { kind: 'open-case', id: vega.id, section: 'field-notes', label: `${vega.title} debugging` },
        caption: `${vega.title}: ${vega.caseStudy?.fieldNotes?.length ?? 0} debugging stories, wrong first guesses included, and what now stops each bug coming back.`,
      }
    );
    add(
      grl && {
        id: 'limiter',
        place: grl.title,
        action: { kind: 'open-case', id: grl.id, section: 'outcome', label: grl.title },
        caption: `${grl.title}: ${lower(metric(grl, 'Admission'))} requests admitted under concurrent load, and a ${metric(grl, 'Check Latency')} check.`,
      }
    );
    add(
      news && {
        id: 'news',
        place: news.title,
        action: { kind: 'open-case', id: news.id, section: 'approach', label: news.title },
        caption: `${news.title}: ${metric(news, 'Ingestion').toLowerCase()} grouped into stories, with confirmation counted by publisher, not by article.`,
      }
    );
    const python = built.filter((p) => usesTech(p.stack, 'Python')).length;
    add({
      id: 'python',
      place: 'Work, filtered',
      action: { kind: 'show-work', stack: ['Python'], label: 'Work built with Python' },
      caption: `The index, filtered in place: ${python} systems built with Python. Any technology in the stack works the same way.`,
    });
    add({
      id: 'contact',
      place: 'Contact',
      action: { kind: 'go-to', section: 'contact', label: 'Contact' },
      caption: 'Questions about how any of it works? Write here, or ask the assistant, which cites the page behind every answer.',
    });
  }

  if (audience === 'client') {
    add({
      id: 'about',
      place: 'About',
      action: { kind: 'go-to', section: 'about', label: 'About' },
      caption: `Data pipelines and the backends behind them: ${built.length} systems built, ${live.length} of them live right now.`,
    });
    const production = built.filter((p) => p.tier === 'production').length;
    add({
      id: 'production',
      place: 'In production',
      action: { kind: 'show-work', tier: 'production', label: 'Systems in production' },
      caption: `${production} systems in production, used by real people today. Each has a write-up of how it was built.`,
    });
    add(
      medvax && {
        id: 'medvax',
        place: medvax.title,
        action: { kind: 'open-case', id: medvax.id, section: 'outcome', label: medvax.title },
        caption: `${medvax.title}: ${asPhrase(medvax.subtitle)}, live at ${host(medvax.liveUrl)}.`,
      }
    );
    add(
      news && {
        id: 'news',
        place: news.title,
        action: { kind: 'open-case', id: news.id, section: 'outcome', label: news.title },
        caption: `${news.title}: ${metric(news, 'Ingestion').toLowerCase()} grouped into stories, live at ${host(news.liveUrl)}, with ${metric(news, 'Tests')} automated tests.`,
      }
    );
    add(
      mmr && {
        id: 'mmr',
        place: mmr.title,
        action: { kind: 'open-case', id: mmr.id, section: 'problem', label: mmr.title },
        caption: `${mmr.title}: finding where two payment records disagree, automatically, instead of by hand in a spreadsheet.`,
      }
    );
    add({
      id: 'contact',
      place: 'Contact',
      action: { kind: 'go-to', section: 'contact', label: 'Contact' },
      caption: 'Have a project in mind? Describe it here, or draft a brief with the assistant and send it in one click.',
    });
  }

  return stops;
}

/** Seconds a stop stays on screen during autoplay. */
export const TOUR_STOP_SECONDS = 7;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
