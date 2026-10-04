/* ==========================================================================
   CAPABILITIES

   The same work as the stack index, read the other way round: by what it
   does for someone rather than what it was built with. A client rarely asks
   "do you know Redpanda?"; they ask "can you build us a live dashboard?".

   Every project is listed against a capability with its `proof`: a phrase
   that must appear in that project's own data (title, subtitle, category,
   description, case study or stack). A test fails the build if it stops
   appearing, so a row can never claim work the site does not show. Design
   studies are never listed here, because they were not built.
   ========================================================================== */

export interface CapabilityProof {
  /** Project id. */
  id: string;
  /** Words from the project's own data that show it belongs here. */
  proof: string;
}

export interface Capability {
  id: string;
  title: string;
  /** What it means for the person asking, in one plain sentence. */
  gist: string;
  projects: CapabilityProof[];
}

export const CAPABILITIES: readonly Capability[] = [
  {
    id: 'pipelines',
    title: 'Data pipelines',
    gist: 'Moving data from where it starts to where it is useful, on a schedule, with checks that catch bad data before anyone relies on it.',
    projects: [
      { id: 'modern-warehouse', proof: 'Dagster runs the pipeline' },
      { id: 'crypto-pipeline', proof: 'checks the data with dbt schema tests' },
      { id: 'cloud-bill-hunter', proof: 'Airflow pipeline' },
      { id: 'logistics-watchtower', proof: 'live pipeline' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments and money',
    gist: 'Taking payments and making sure every one is recorded once and adds up, even when a provider is late, wrong or sends it twice.',
    projects: [
      { id: 'mmr-engine', proof: 'Paystack and Flutterwave' },
      { id: 'medvax', proof: 'Paystack payments' },
      { id: 'evanty', proof: 'pay with Stripe checkout' },
      { id: 'cloud-bill-hunter', proof: 'wasted cloud spending' },
    ],
  },
  {
    id: 'backends',
    title: 'APIs and backends',
    gist: 'The server side of a product: logins and permissions, background jobs, and APIs that keep their limits under heavy use.',
    projects: [
      { id: 'global-rate-limiter', proof: 'atomic Lua script' },
      { id: 'medvax', proof: 'role-based access' },
      { id: 'ultra-news', proof: 'Django' },
      { id: 'caritas-scholar', proof: 'Deno edge functions' },
    ],
  },
  {
    id: 'realtime',
    title: 'Live and real-time systems',
    gist: 'Screens that update the moment something changes, for many people at once, and keep working when the connection drops.',
    projects: [
      { id: 'vega-canva', proof: 'at the same time' },
      { id: 'logistics-watchtower', proof: 'Redpanda' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics and reporting',
    gist: 'Turning raw records into figures a team can trust, with dashboards that show where each number came from.',
    projects: [
      { id: 'modern-warehouse', proof: 'interactive Plotly charts' },
      { id: 'crypto-pipeline', proof: 'Streamlit' },
      { id: 'cloud-bill-hunter', proof: 'React dashboard' },
    ],
  },
];
