import React from 'react';
import { Helmet } from 'react-helmet-async';

// Helper to safely get origin
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : 'https://em-webapp.vercel.app';

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
    "jobTitle": "Lead Data Engineer & System Architect",
    "url": origin,
    "image": `${origin}/avatar.jpg`,
    "description": "Data Engineer & System Architect specializing in distributed data systems, cloud architecture (AWS, GCP, Azure), and high-performance software engineering. 4+ years building production infrastructure, ETL pipelines, and scalable backend systems.",
    "knowsAbout": [
      "Data Engineering",
      "Distributed Systems",
      "Cloud Architecture",
      "ETL Pipeline Design",
      "Apache Kafka",
      "Apache Spark",
      "Apache Airflow",
      "React",
      "TypeScript",
      "Python",
      "AWS Architecture",
      "Docker",
      "Kubernetes",
      "Terraform",
      "PostgreSQL",
      "Redis",
      "Snowflake",
      "dbt",
      "Stream Processing",
      "Data Warehousing"
    ],
    "sameAs": [
      "https://github.com/emmanuelrichard01",
      "https://www.linkedin.com/in/e-mc/",
      "https://x.com/_mrebuka"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Abuja",
      "addressCountry": "NG"
    },
    "email": "emma.moghalu@gmail.com",
    "alumniOf": {
      "@type": "EducationalOrganization",
      "name": "Caritas University"
    }
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
    "dateModified": new Date().toISOString().split('T')[0],
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
          "text": "Emmanuel Moghalu specializes in data engineering and system architecture. He builds resilient data pipelines, scalable cloud infrastructure on AWS/GCP/Azure, stream processing systems with Kafka, and production-grade backend APIs. His core stack includes Python, TypeScript, PostgreSQL, Docker, Terraform, and Apache Spark."
        }
      },
      {
        "@type": "Question",
        "name": "What tech stack does Emmanuel Moghalu use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Emmanuel's primary tech stack includes Python, TypeScript, React, PostgreSQL, AWS, Docker, Apache Kafka, Terraform, Redis, Snowflake, Apache Spark, Apache Airflow, dbt, and Kubernetes. He focuses on infrastructure-as-code, event-driven architectures, and data warehouse design."
        }
      },
      {
        "@type": "Question",
        "name": "How can I hire or contact Emmanuel Moghalu?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can reach Emmanuel Moghalu via email at emma.moghalu@gmail.com, through the contact form on his portfolio site, or via LinkedIn at linkedin.com/in/e-mc/. He is currently available for work and open to data engineering, cloud architecture, and full-stack development roles."
        }
      },
      {
        "@type": "Question",
        "name": "What projects has Emmanuel Moghalu built?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Notable projects include: Logistics Watchtower (real-time cold chain fleet monitoring with Redpanda and Quix Streams), Modern Data Warehouse (1.5M+ record analytics platform with Dagster, dbt, and DuckDB), MedVax Health (production telemedicine platform with NestJS), and ULTRA-NEWS V2 (news aggregation engine with Django and Next.js). All projects emphasize production-grade engineering, observability, and architectural decision-making."
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

  // 5. ItemList Schema — enumerates projects for AI engines
  const projectListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Engineering Projects by Emmanuel Moghalu",
    "description": "Portfolio of data engineering, full-stack, and cloud architecture projects.",
    "numberOfItems": 8,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Logistics Watchtower",
        "description": "Real-time cold chain fleet monitoring with event-driven streaming pipeline",
        "url": "https://github.com/emmanuelrichard01/logistics-watchtower"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Modern Data Warehouse",
        "description": "1.5M+ record analytics platform with Medallion Architecture",
        "url": "https://github.com/emmanuelrichard01/modern-warehouse"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "MedVax Health",
        "description": "Production telemedicine and e-pharmacy platform",
        "url": "https://medvaxhealth.com"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "ULTRA-NEWS V2",
        "description": "Production-grade news aggregation with full-text search",
        "url": "https://ultra-news.vercel.app/"
      },
      {
        "@type": "ListItem",
        "position": 5,
        "name": "Cloud Bill Hunter",
        "description": "FinOps intelligence platform for AWS cost optimization",
        "url": "https://github.com/emmanuelrichard01/cloud-bill-hunter"
      },
      {
        "@type": "ListItem",
        "position": 6,
        "name": "Crypto Data Pipeline",
        "description": "Market analytics ETL with dbt testing and Grafana dashboards",
        "url": "https://github.com/emmanuelrichard01/crypto-data-pipeline"
      },
      {
        "@type": "ListItem",
        "position": 7,
        "name": "CARITAS AI Scholar",
        "description": "RAG-based intelligent academic platform",
        "url": "https://caritas-ai-scholar.vercel.app/"
      },
      {
        "@type": "ListItem",
        "position": 8,
        "name": "Evanty",
        "description": "Event management platform with Stripe and Clerk",
        "url": "https://evanty.vercel.app/"
      }
    ]
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