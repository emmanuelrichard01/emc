import { Helmet } from 'react-helmet-async';
import { PROJECTS } from '@/data/projects';

// Helper to safely get origin
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : 'https://www.builtbyem.dev';

// Bump this when profile/project content actually changes — not on every
// deploy — so dateModified stays a meaningful signal rather than noise.
const CONTENT_LAST_UPDATED = "2026-10-03";

const StructuredData = () => {
  const origin = getOrigin();

  // 1. Person Schema — the engineer (valid schema.org type)
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Emmanuel Moghalu",
    "givenName": "Emmanuel",
    "familyName": "Moghalu",
    "alternateName": "Emmanuel Richard Moghalu",
    // "Lead" was not supported by any role on the CV; the title now matches
    // the positioning used everywhere else on the site.
    "jobTitle": "Software & Data Engineer",
    "url": origin,
    "image": `${origin}/profile.webp`,
    "description": "Software and data engineer who has been building live APIs, data pipelines and analytics systems since 2018, each backed by automated tests. Knows the Nigerian and wider African fintech world well, including working with several payment providers at once, CBN rules and NDPR data protection.",
    "knowsAbout": [
      "Data Engineering",
      "Backend Engineering",
      "Payment Reconciliation",
      "Nigerian Fintech",
      "Multi-PSP Integration",
      "CBN Regulatory Compliance",
      "NDPR Compliance",
      "Event-Driven Architecture",
      "Distributed Systems",
      "Stream Processing",
      "ETL Pipeline Design",
      "Medallion Architecture",
      "Data Warehousing",
      "Apache Kafka",
      "Redpanda",
      "Dagster",
      "Prefect",
      "dbt",
      "DuckDB",
      "PostgreSQL",
      "pgvector",
      "Redis",
      "Python",
      "TypeScript",
      "FastAPI",
      "Django",
      "NestJS",
      "React",
      "Next.js",
      "Docker",
      "Terraform"
    ],
    "sameAs": [
      "https://github.com/emmanuelrichard01",
      "https://www.linkedin.com/in/e-mc/",
      "https://x.com/mrebr"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Abuja",
      "addressCountry": "NG"
    },
    "email": "emma.moghalu@gmail.com",
    "alumniOf": [
      {
        "@type": "EducationalOrganization",
        "name": "Caritas University",
        "address": {
          "@type": "PostalAddress",
          "addressRegion": "Enugu State",
          "addressCountry": "NG"
        }
      },
      {
        "@type": "EducationalOrganization",
        "name": "AfriHUB ICT Solutions",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Abuja",
          "addressCountry": "NG"
        }
      }
    ],
    "hasCredential": [
      {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "degree",
        "name": "B.Eng. Computer Engineering",
        "educationalLevel": "Bachelor's Degree",
        "recognizedBy": { "@type": "EducationalOrganization", "name": "Caritas University" }
      },
      {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "diploma",
        "name": "National Innovative Diploma, Software Engineering",
        "recognizedBy": { "@type": "EducationalOrganization", "name": "AfriHUB ICT Solutions" }
      },
      {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "certification",
        "name": "DataCamp Data Engineer Certification",
        "recognizedBy": { "@type": "Organization", "name": "DataCamp" }
      }
    ]
  };

  // 2. ProfilePage Schema — correct type for a portfolio page
  const profilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": "Emmanuel Moghalu, engineering portfolio",
    "url": origin,
    "description": "The work and case studies of Emmanuel Moghalu, software and data engineer.",
    "mainEntity": {
      "@type": "Person",
      "name": "Emmanuel Moghalu",
      "url": origin
    },
    "dateModified": CONTENT_LAST_UPDATED,
    "inLanguage": "en",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["#home h1", "#about h2", "#about p", "#contact h2"]
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": origin },
        { "@type": "ListItem", "position": 2, "name": "About", "item": `${origin}/#about` },
        { "@type": "ListItem", "position": 3, "name": "Projects", "item": `${origin}/#projects` },
        { "@type": "ListItem", "position": 4, "name": "Experience", "item": `${origin}/#experience` },
        { "@type": "ListItem", "position": 5, "name": "Contact", "item": `${origin}/#contact` }
      ]
    }
  };

  // 3. WebSite Schema (no invalid SearchAction)
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Emmanuel Moghalu, software and data engineer",
    "url": origin,
    "description": "The work and case studies of Emmanuel Moghalu, software and data engineer.",
    "author": {
      "@type": "Person",
      "name": "Emmanuel Moghalu"
    },
    "inLanguage": "en"
  };

  // 4. FAQPage Schema — surfaces in AI chatbots, voice assistants, and zero-click results
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What does Emmanuel Moghalu specialize in?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emmanuel Moghalu works on data engineering and backend systems: data pipelines that react to events as they happen, payment reconciliation (checking that payment records agree), live data streams and analytics warehouses. Much of his work is in Nigerian and African fintech, including working with several payment providers at once (Paystack, Flutterwave), CBN rules and NDPR data protection. His systems come with automated tests. One example is a payment reconciliation engine with 276 tests, 23 of them against a real PostgreSQL database. Another is a shared rate limiter, where a test fires 300 requests at once and proves exactly 50 get through."
        }
      },
      {
        "@type": "Question",
        "name": "What tech stack does Emmanuel Moghalu use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emmanuel mainly works in Python and TypeScript, with FastAPI, Django, Django Ninja, NestJS, React and Next.js. For data he uses dbt, Dagster, Prefect, DuckDB and PostgreSQL, including pgvector for search by meaning. For streaming he uses Redpanda, with Celery and Redis for background work. He runs things on Docker and Terraform, and watches them with Prometheus and Grafana. Every tool listed here appears in a finished project or a past role."
        }
      },
      {
        "@type": "Question",
        "name": "How can I hire or contact Emmanuel Moghalu?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can reach Emmanuel Moghalu by email at emma.moghalu@gmail.com, through the contact form on his portfolio, or on LinkedIn at linkedin.com/in/e-mc. He is open to new roles and to projects, and works remotely or hybrid from Abuja, Nigeria."
        }
      },
      {
        "@type": "Question",
        "name": "What projects has Emmanuel Moghalu built?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Projects include: MMR Engine, which checks that Paystack and Flutterwave payment records agree, takes in each payment notification exactly once, matches records in two rounds with the database allowing only one match per payment, and has 276 tests. Global Rate Limiter keeps many servers inside one shared API quota using an atomic Redis Lua script, and a test with 8 instances firing 300 requests at once lets exactly 50 through. Logistics Watchtower monitors refrigerated trucks live on Redpanda and Quix Streams, with alerts in under 200ms. Modern Data Warehouse runs the full 1.5M+ record Olist dataset through Dagster, dbt and DuckDB, with 21 schema tests. ULTRA-NEWS V3 groups articles from 41 feeds into stories by meaning (pgvector and local embeddings), counts how many independent publishers confirmed each one, and adds an hourly cited Briefing, streamed answers to questions, and 180 tests. MedVax Health is a live online pharmacy and telemedicine platform. There are also two design studies, clearly marked as not yet built: a plan for moving payment data onto storage in Nigeria for the CBN, and a design for collecting live data from smart meters and solar inverters."
        }
      },
      {
        "@type": "Question",
        "name": "Where is Emmanuel Moghalu based?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emmanuel Moghalu is based in Abuja, Nigeria (UTC+1). He works with teams around the world and is available for remote roles and contracts."
        }
      }
    ]
  };

  // 5. ItemList Schema — enumerates projects for AI engines.
  // Generated from PROJECTS (src/data/projects.ts) so this can never drift
  // out of sync with the actual project list rendered on the page.
  const projectListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Engineering Projects by Emmanuel Moghalu",
    "description": "Data engineering, backend and full-stack projects, plus two design studies.",
    "numberOfItems": PROJECTS.length,
    "itemListElement": PROJECTS.map((project, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": project.title,
      "description": project.subtitle,
      "url": project.liveUrl || project.github || `${origin}/projects/${project.id}`
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(personSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(profilePageSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(projectListSchema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;