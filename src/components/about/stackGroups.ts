import type { ElementType } from 'react';
import { Database, Radio, Workflow } from 'lucide-react';
import {
  SiApacheairflow,
  SiDbt,
  SiDjango,
  SiDocker,
  SiDuckdb,
  SiFastapi,
  SiGrafana,
  SiNestjs,
  SiNextdotjs,
  SiPostgresql,
  SiPrometheus,
  SiPython,
  SiReact,
  SiRedis,
  SiTerraform,
  SiTypescript,
} from 'react-icons/si';

/* The About section's stack, grouped by role.

   Derived from what the work actually contains, never from memory: an audit
   once found Kafka, Spark, Snowflake and AWS listed here while appearing in
   zero projects and zero roles — and Kafka was the option two case studies
   explicitly *rejected*, for Redpanda. stackUsage.test.ts now fails the
   build if any entry below is used by no built project and no role. */

export interface StackGroup {
  label: string;
  items: { name: string; icon: ElementType }[];
}

export const STACK_GROUPS: StackGroup[] = [
  {
    label: 'Languages',
    items: [
      { name: 'Python', icon: SiPython },
      { name: 'TypeScript', icon: SiTypescript },
      { name: 'SQL', icon: Database },
    ],
  },
  {
    label: 'Data & pipelines',
    items: [
      { name: 'PostgreSQL', icon: SiPostgresql },
      { name: 'dbt', icon: SiDbt },
      { name: 'Dagster', icon: Workflow },
      { name: 'Airflow', icon: SiApacheairflow },
      { name: 'Redpanda', icon: Radio },
      { name: 'DuckDB', icon: SiDuckdb },
    ],
  },
  {
    label: 'Services & APIs',
    items: [
      { name: 'FastAPI', icon: SiFastapi },
      { name: 'Django', icon: SiDjango },
      { name: 'NestJS', icon: SiNestjs },
    ],
  },
  {
    label: 'Interface',
    items: [
      { name: 'Next.js', icon: SiNextdotjs },
      { name: 'React', icon: SiReact },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { name: 'Docker', icon: SiDocker },
      { name: 'Redis', icon: SiRedis },
      { name: 'Prometheus', icon: SiPrometheus },
      { name: 'Grafana', icon: SiGrafana },
      { name: 'Terraform', icon: SiTerraform },
    ],
  },
];
