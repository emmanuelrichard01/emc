import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { STACK_GROUPS } from './stackGroups';
import { stackUsage, timelineEnd } from './stackUsage';
import { parsePeriod } from '@/lib/tenure';

const NAMES = STACK_GROUPS.flatMap((g) => g.items.map((i) => i.name));

describe('stackUsage', () => {
  it('backs every technology the About section lists with at least one project or role', () => {
    for (const usage of stackUsage(NAMES, PROJECTS, EXPERIENCE)) {
      expect(usage.count, `${usage.name} is listed but used nowhere`).toBeGreaterThan(0);
    }
  });

  it('never counts a design study, which built nothing', () => {
    const designIds = PROJECTS.filter((p) => p.tier === 'design').map((p) => p.id);
    for (const usage of stackUsage(NAMES, PROJECTS, EXPERIENCE)) {
      for (const p of usage.projects) expect(designIds).not.toContain(p.id);
    }
  });

  it('counts projects and roles exactly', () => {
    const [python] = stackUsage(['Python'], PROJECTS, EXPERIENCE);
    const built = PROJECTS.filter((p) => p.tier !== 'design' && p.stack.includes('Python')).length;
    const roles = EXPERIENCE.filter((r) => r.stack.includes('Python')).length;
    expect(python.count).toBe(built + roles);
  });

  it('counts SQL wherever a SQL database or tool was used, not only where "SQL" is written', () => {
    const [sql, postgres] = stackUsage(['SQL', 'PostgreSQL'], PROJECTS, EXPERIENCE);
    // Everything built on PostgreSQL wrote SQL, so SQL can never count fewer.
    for (const p of postgres.projects) expect(sql.projects.map((x) => x.id)).toContain(p.id);
    for (const r of postgres.roles) expect(sql.roles).toContain(r);
    expect(sql.implied).toContain('PostgreSQL');
  });
});

describe('stack tenure', () => {
  const now = new Date(2026, 9, 4);

  it('counts months at work as a union, so overlapping jobs are not added twice', () => {
    const [python] = stackUsage(['Python'], PROJECTS, EXPERIENCE, now);
    const sum = EXPERIENCE.filter((r) => r.stack.includes('Python'))
      .map((r) => parsePeriod(r.period, now)?.months ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(python.months).toBeGreaterThan(0);
    expect(python.months).toBeLessThan(sum);
  });

  it('has no time at work for a tool only used in projects', () => {
    const [dagster] = stackUsage(['Dagster'], PROJECTS, EXPERIENCE, now);
    expect(dagster.roles).toHaveLength(0);
    expect(dagster.months).toBe(0);
    expect(dagster.lastUsed).toBe(2025);
  });

  it('reads the latest year from a job or a project, with "Present" as this year', () => {
    expect(timelineEnd('2025 – Present', now)).toBe(2026);
    expect(timelineEnd('Jan – Feb 2026', now)).toBe(2026);
    expect(timelineEnd('Someday', now)).toBeNull();
    const [php] = stackUsage(['PHP'], PROJECTS, EXPERIENCE, now);
    expect(php.lastUsed).toBe(2019);
  });
});
