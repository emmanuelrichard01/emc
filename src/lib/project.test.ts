import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import type { Project } from '@/types';

/* ==========================================================================
   STATUS DERIVATION + DATA INTEGRITY

   Status is derived from the links a project actually has, so a card can
   never claim more than the data supports — the UI previously printed
   "ONLINE" on every project including those with neither a live URL nor a
   repository. These tests pin that guarantee.

   The data assertions matter because PROJECTS is the single source of truth
   for the rendered cards, the routes, the sitemap and the JSON-LD. A bad id
   or a design study carrying a live URL propagates to all four at once.
   ========================================================================== */

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'test',
  tier: 'system',
  title: 'Test',
  subtitle: 'Test',
  category: 'Test',
  timeline: '2026',
  github: null,
  liveUrl: null,
  metrics: [],
  description: '',
  decisions: [],
  stack: [],
  ...overrides,
});

describe('projectStatus', () => {
  it('reports a live URL as live', () => {
    expect(projectStatus(project({ liveUrl: 'https://example.com' }))).toBe('live');
  });

  it('prefers live over source when both exist', () => {
    expect(
      projectStatus(project({ liveUrl: 'https://example.com', github: 'https://github.com/x/y' }))
    ).toBe('live');
  });

  it('reports a repository alone as source-available', () => {
    expect(projectStatus(project({ github: 'https://github.com/x/y' }))).toBe('source-available');
  });

  it('reports no links as private rather than online', () => {
    expect(projectStatus(project())).toBe('private');
  });

  it('lets the design tier win over any link, so a blueprint never reads as shipped', () => {
    expect(projectStatus(project({ tier: 'design', liveUrl: 'https://example.com' }))).toBe('design');
  });

  it('has a label and a class for every status it can return', () => {
    for (const status of ['live', 'source-available', 'private', 'design'] as const) {
      expect(STATUS_LABEL[status]).toBeTruthy();
      expect(STATUS_CLASS[status]).toBeTruthy();
    }
  });
});

describe('project data', () => {
  it('has unique ids', () => {
    const ids = PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses url-safe ids, since they are route segments', () => {
    for (const p of PROJECTS) expect(p.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('never presents design-stage work as built', () => {
    for (const p of PROJECTS.filter((p) => p.tier === 'design')) {
      expect(p.liveUrl, `${p.id} is design-stage but has a live URL`).toBeNull();
      expect(p.github, `${p.id} is design-stage but has a repository`).toBeNull();
    }
  });

  it('gives every project the fields the cards and detail page render', () => {
    for (const p of PROJECTS) {
      expect(p.title).toBeTruthy();
      expect(p.subtitle).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.timeline).toBeTruthy();
      expect(p.description).toBeTruthy();
    }
  });

  it('names a rejected alternative in every trade-off', () => {
    // A "trade-off" without a rejected option is just a decision; the schema
    // separates the two precisely so the distinction stays honest.
    for (const p of PROJECTS) {
      for (const tradeoff of p.caseStudy?.tradeoffs ?? []) {
        expect(tradeoff.chose).toBeTruthy();
        expect(tradeoff.rejected).toBeTruthy();
        expect(tradeoff.why).toBeTruthy();
      }
    }
  });

  it('uses absolute paths for screenshots, matching the public/ layout', () => {
    for (const p of PROJECTS.filter((p) => p.image)) {
      expect(p.image).toMatch(/^\/images\/[\w-]+\.(png|jpg|webp)$/);
    }
  });

  it('has at least one flagship, since the spotlight renders the first', () => {
    expect(PROJECTS.filter((p) => p.tier === 'flagship').length).toBeGreaterThan(0);
  });
});

describe('experience data', () => {
  it('has unique ids', () => {
    const ids = EXPERIENCE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every role the fields the ledger renders', () => {
    for (const role of EXPERIENCE) {
      expect(role.company).toBeTruthy();
      expect(role.role).toBeTruthy();
      expect(role.period).toBeTruthy();
      expect(role.summary).toBeTruthy();
    }
  });
});
