import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PROJECTS } from '@/data/projects';

// Helper to safely get origin
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : 'https://www.builtbyem.dev';

// Bump this when profile/project content actually changes — not on every
// deploy — so dateModified stays a meaningful signal rather than noise.
const CONTENT_LAST_UPDATED = "2026-07-31";

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
    "jobTitle": "Data Engineer & Backend Systems Engineer",
    "url": origin,
    "image": `${origin}/profile.webp`,
    "description": "Data and backend engineer with 4+ years building production APIs, event-driven data pipelines, and analytics platforms — validated with automated test suites. Deep working knowledge of the Nigerian and broader African fintech ecosystem, including multi-PSP integration, CBN regulatory requirements, and NDPR compliance.",
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
      "Apache Spark",
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
    "name": "Emmanuel Moghalu — Engineering Portfolio",
    "url": origin,
    "description": "Portfolio and technical case studies of Emmanuel Moghalu, Data Engineer & System Architect.",
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
    "name": "Emmanuel Moghalu — Engineering Logs",
    "url": origin,
    "description": "Portfolio and technical case studies of Emmanuel Moghalu — Data Engineer & System Architect.",
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
          "text": "Emmanuel Moghalu specializes in data engineering and backend systems: event-driven data pipelines, payment reconciliation, stream processing, and analytics warehouses. He works extensively in the Nigerian and broader African fintech ecosystem, including multi-PSP integration (Paystack, Flutterwave, M-Pesa), CBN regulatory requirements, and NDPR compliance. His systems ship with automated test suites — a reconciliation engine with 160+ tests across 9 suites, and a distributed rate limiter verified by a concurrency test proving exactly 50 of 300 concurrent requests are admitted."
        }
      },
      {
        "@type": "Question",
        "name": "What tech stack does Emmanuel Moghalu use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emmanuel's primary stack is Python and TypeScript across FastAPI, Django, Django Ninja, NestJS, React and Next.js. For data he uses dbt, Dagster, Prefect, DuckDB, PostgreSQL (including pgvector for semantic search) and Apache Spark; for streaming, Kafka and Redpanda with Celery and Redis. Infrastructure runs on Docker and Terraform, with Prometheus and Grafana for observability."
        }
      },
      {
        "@type": "Question",
        "name": "How can I hire or contact Emmanuel Moghalu?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can reach Emmanuel Moghalu by email at emma.moghalu@gmail.com, through the contact form on his portfolio, or via LinkedIn at linkedin.com/in/e-mc. He is open to discussing data engineering challenges, architectural scaling, and new opportunities, and works remote or hybrid from Abuja, Nigeria."
        }
      },
      {
        "@type": "Question",
        "name": "What projects has Emmanuel Moghalu built?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Notable projects include: MMR Engine (cross-border mobile money reconciliation across Nigerian PSPs, using a two-tier exact-then-probabilistic matching engine over a Medallion pipeline, with 160+ tests); Global Rate Limiter (a distributed, cluster-safe token bucket using an atomic Redis Lua script, verified by 8 simulated nodes racing 300 concurrent requests and admitting exactly 50); Logistics Watchtower (real-time cold chain fleet monitoring on Redpanda and Quix Streams, sub-200ms end to end); Modern Data Warehouse (the complete 1.5M+ record Olist dataset through Dagster, dbt and DuckDB with 21 schema tests); ULTRA-NEWS V3 (story-centric news aggregation clustering 35+ sources with pgvector and local embeddings); and MedVax Health (production e-pharmacy and telemedicine platform). Separately, design-stage architecture work includes a CBN data residency migration reference architecture and a distributed smart meter telemetry blueprint — both clearly marked as not yet built."
        }
      },
      {
        "@type": "Question",
        "name": "Where is Emmanuel Moghalu based?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emmanuel Moghalu is based in Abuja, Nigeria (UTC+1). He works with teams globally and is available for remote positions and contracts."
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
    "description": "Portfolio of data engineering, full-stack, and cloud architecture projects.",
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