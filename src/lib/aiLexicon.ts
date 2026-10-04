/* ==========================================================================
   AI LEXICON — the names an answer could get wrong.

   aiGrounding.ts checks figures. This checks names: technologies, platforms,
   clouds, databases, languages, frameworks and well-known employers. A name
   from this list that appears in an answer but nowhere in the evidence the
   model was given (the index, the tool results, the visitor's own words) is
   reported as unverified. "He used Kafka" when the data says Redpanda is the
   failure this exists to catch, and a model makes it with confidence.

   Deterministic and cheap, with the same honest limit as the figure check:
   it proves a name exists in the evidence, not that it is attached to the
   right claim. Project titles and company names from the site's own data
   are added by the caller, so they are counted as verified names.

   Each entry is one thing with its spellings; it is verified if ANY spelling
   is in the evidence ("Postgres" in an answer, "PostgreSQL" in the data).
   Words that are also ordinary English ("Go", "Spark", "Express") match only
   with their capital letter.
   ========================================================================== */

export interface LexiconEntry {
  /** How the name is shown when it is reported. */
  name: string;
  /** Other spellings of the same thing. */
  aliases?: string[];
  /** Match case-sensitively, for names that are also common words. */
  cased?: boolean;
}

const plain = (list: string): LexiconEntry[] =>
  list
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((group) => {
      const [name, ...aliases] = group.split('/').map((s) => s.trim());
      return aliases.length ? { name, aliases } : { name };
    });

const cased = (list: string): LexiconEntry[] => plain(list).map((entry) => ({ ...entry, cased: true }));

export const LEXICON: readonly LexiconEntry[] = [
  // Languages
  ...plain(
    'Python | TypeScript | JavaScript | Java | Kotlin | Scala | C++ | C# | Golang | PHP | Elixir | Erlang | Haskell | Clojure | Perl | Lua | Solidity | Zig | Objective-C | Bash | PowerShell | SQL | GraphQL | WebAssembly/Wasm'
  ),
  ...cased('Go | Rust | Ruby | Swift | Dart | Julia | Elm | OCaml'),
  // Frontend and app frameworks
  ...plain(
    'React | Next.js/NextJS | Vue/Vue.js | Nuxt | Angular | Svelte/SvelteKit | SolidJS | Gatsby | Redux | Zustand | TanStack Query/React Query | Tailwind/Tailwind CSS/TailwindCSS | Three.js | WebGL | D3/D3.js | Framer Motion | React Native | Flutter | Electron | Tauri | jQuery | Vite | Webpack | Storybook | shadcn'
  ),
  ...cased('Remix | Ember'),
  // Backend frameworks and runtimes
  ...plain(
    'Node.js/NodeJS | Deno | NestJS | Fastify | Koa | Django | FastAPI | Laravel | ASP.NET/.NET | Celery | gRPC | tRPC | Prisma | SQLAlchemy | Pydantic | Hibernate | Socket.IO | WebSocket/WebSockets | OpenAPI'
  ),
  ...cased('Express | Flask | Spring Boot/Spring | Rails/Ruby on Rails | Phoenix | Gin | Bun | Astro | Expo | Swagger | Drizzle'),
  // Data and streaming
  ...plain(
    'Apache Kafka/Kafka | Redpanda | RabbitMQ | NATS | Kinesis | Flink | Airflow | Dagster | dbt | Debezium | Pandas | Polars | NumPy | DuckDB | Trino | Presto | Hadoop | Delta Lake | Parquet | Avro | Protobuf/Protocol Buffers | Great Expectations | Fivetran | Airbyte | Metabase | Looker | Tableau | Power BI | Superset | Jupyter'
  ),
  ...cased('Spark/Apache Spark/PySpark | Hive | Apache Beam/Beam | Prefect | Pulsar | Iceberg'),
  // Databases and stores
  ...plain(
    'PostgreSQL/Postgres | MySQL | MariaDB | SQLite | MongoDB/Mongo | Redis | Valkey | Memcached | Cassandra | ScyllaDB | DynamoDB | CockroachDB | ClickHouse | TimescaleDB | InfluxDB | Elasticsearch | OpenSearch | Neo4j | Supabase | Firebase | Firestore | PlanetScale | BigQuery | Redshift | Pinecone | Weaviate | Qdrant | pgvector | IndexedDB | Oracle Database | SQL Server/MSSQL'
  ),
  ...cased('Snowflake | Couchbase | Neon | Chroma'),
  // Cloud and infrastructure
  ...plain(
    'AWS/Amazon Web Services | Azure | GCP/Google Cloud | Cloudflare | Vercel | Netlify | Heroku | Fly.io | DigitalOcean | Docker | Kubernetes/K8s | Terraform | Pulumi | Ansible | Nginx | Traefik | Istio | GitHub Actions | GitLab CI | CircleCI | Jenkins | ArgoCD/Argo CD | Prometheus | Grafana | Datadog | Sentry | OpenTelemetry | New Relic | PagerDuty | EC2 | S3 | ECS | EKS | Lambda functions/AWS Lambda | Cloud Run | Cloud Functions | App Engine | SQS | SNS | EventBridge | Step Functions | CloudFront | Upstash | Linux | Ubuntu'
  ),
  ...cased('Lambda | Glue | Render | Railway | Helm | Envoy'),
  // AI and ML
  ...plain(
    'OpenAI | GPT-4/GPT-4o | ChatGPT | Anthropic | Claude | Gemini | Llama | Mistral | Hugging Face/HuggingFace | LangChain | LlamaIndex | PyTorch | TensorFlow | Keras | scikit-learn/sklearn | XGBoost | LightGBM | spaCy | MLflow | Weights & Biases | Ollama | vLLM | RAG/retrieval-augmented generation | Groq'
  ),
  // Testing and quality
  ...cased('Jest | Mocha | Locust | Hypothesis'),
  ...plain('Vitest | Playwright | Cypress | Selenium | pytest | JUnit | Testing Library | k6 | ESLint | Prettier'),
  // Payments and fintech platforms
  ...cased('Square | Wise'),
  ...plain('Stripe | Paystack | Flutterwave | Interswitch | Monnify | Remita | Plaid | Adyen | PayPal | Moniepoint | Opay | Kuda'),
  // Well-known employers an answer could invent
  ...cased('Meta/Facebook | Apple | Intel | EY'),
  ...plain(
    'Google | Microsoft | Amazon | Netflix | Uber | Airbnb | Shopify | Twilio | IBM | Oracle | Salesforce | Deloitte | Accenture | Andela | Spotify | LinkedIn | Twitter | Palantir | Databricks | Snowflake Inc | Nvidia | Tesla | SpaceX | Bloomberg | Goldman Sachs | JPMorgan | McKinsey | PwC | KPMG'
  ),
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* A spelling stands alone: not inside a longer word ("Go" in "Google",
   "Java" in "JavaScript", "S3" in "S30"). `.` and `#` and `+` belong to some
   names (Node.js, C#, C++), so only letters and digits count as joined. */
function spellingPattern(spelling: string, isCased: boolean): RegExp {
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(spelling)}(?![A-Za-z0-9+#])`, isCased ? '' : 'i');
}

interface Compiled {
  entry: LexiconEntry;
  patterns: RegExp[];
}

const compile = (entries: readonly LexiconEntry[]): Compiled[] =>
  entries.map((entry) => ({
    entry,
    patterns: [entry.name, ...(entry.aliases ?? [])].map((s) => spellingPattern(s, Boolean(entry.cased))),
  }));

const BASE = compile(LEXICON);

export interface NameAudit {
  /** Names in the answer that the evidence contains. */
  verified: string[];
  /** Names in the answer that the evidence never mentions. */
  unverified: string[];
}

/**
 * Checks every lexicon name in `answer` against `evidence`. `extra` adds the
 * site's own names (project titles, company names), which always count.
 * Matched spans are consumed longest-name-first, so "Apache Kafka" is one
 * name, not also "Kafka", and "Google Cloud" is not also "Google".
 */
export function auditNames(answer: string, evidence: string[], extra: readonly LexiconEntry[] = []): NameAudit {
  const compiled = [...compile(extra), ...BASE];
  const haystack = evidence.join('\n');
  let remaining = answer;
  const verified: string[] = [];
  const unverified: string[] = [];

  // Longest spellings first: "Google Cloud" before "Google", "Next.js" before "Next".
  const bySpelling = compiled
    .flatMap((c) => c.patterns.map((pattern, i) => ({ c, pattern, length: [c.entry.name, ...(c.entry.aliases ?? [])][i].length })))
    .sort((a, b) => b.length - a.length);

  const seen = new Set<string>();
  for (const { c, pattern } of bySpelling) {
    if (!pattern.test(remaining)) continue;
    remaining = remaining.replace(new RegExp(pattern.source, pattern.flags + 'g'), ' ');
    if (seen.has(c.entry.name)) continue;
    seen.add(c.entry.name);
    const inEvidence = c.patterns.some((p) => p.test(haystack));
    if (inEvidence) verified.push(c.entry.name);
    // "The site does not mention Rust" names Rust to deny it: not a claim.
    else if (!onlyDenied(answer, c.patterns)) unverified.push(c.entry.name);
  }
  return { verified, unverified };
}

const DENIAL = /\b(?:no|not|never|none|without|neither|nor)\b|n['’]t\b/i;

/** True when every sentence naming this entry also denies something. */
function onlyDenied(answer: string, patterns: RegExp[]): boolean {
  const naming = answer
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => patterns.some((p) => p.test(sentence)));
  return naming.length > 0 && naming.every((sentence) => DENIAL.test(sentence.replace(/\bnot only\b/gi, '')));
}
