import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { STACK_GROUPS } from './stackGroups';
import { stackUsage } from './stackUsage';

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
});
