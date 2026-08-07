import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { scrollToSection } from '../lib/scrollToSection';

// Components
import Hero from '../components/Hero';
import About from '../components/About';
import Projects from '../components/Projects';
import Experience from '../components/Experience';
import Contact from '../components/Contact';
import SEOHead from '../components/SEOHead';
import StructuredData from '../components/StructuredData';

// Types
import { SEOMetadata } from '../types';

const SITE_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'https://www.builtbyem.dev';

const Index = () => {
  const { hash } = useLocation();

  /* Honour a hash target on arrival — e.g. the case-study breadcrumb linking
     back to /#projects, or an external deep link. The sections mount with
     this page, so the scroll is deferred by a frame to let layout settle
     before the offset is measured. */
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const frame = requestAnimationFrame(() => scrollToSection(id));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  // Console hint for developers who open DevTools
  useEffect(() => {
    console.log(
      "%c👋 Hey, you found the console.",
      "color: #8b5cf6; font-size: 14px; font-weight: bold;"
    );
    console.log(
      "%cThree ways in: the Konami code, `konami` in the terminal, or just run __emc.unlock() right here.",
      "color: #666; font-size: 11px;"
    );
    console.log("%c__emc.status() // check your clearance", "color: #444; font-size: 11px;");
  }, []);

  const seoMetadata: SEOMetadata = {
    title: "Emmanuel Moghalu | Data Engineer & Backend Systems",
    description:
      "Data and backend engineer building event-driven pipelines, payment reconciliation systems, and analytics platforms — shipped with the test suites that prove them. Nigerian fintech: multi-PSP integration, CBN and NDPR compliance.",
    // Weighted toward the specific, searchable things this work actually
    // involves. Generic cloud keywords ("Azure", "GCP") competed against
    // millions of pages and described none of the projects on this site.
    keywords: [
      "Emmanuel Moghalu", "Data Engineer", "Backend Engineer", "Analytics Engineer",
      "Payment Reconciliation", "Nigerian Fintech", "Multi-PSP Integration",
      "CBN Compliance", "NDPR Compliance", "Paystack", "Flutterwave",
      "Event-Driven Architecture", "Stream Processing", "Kafka", "Redpanda",
      "dbt", "Dagster", "Prefect", "DuckDB", "PostgreSQL", "pgvector",
      "Medallion Architecture", "Data Warehousing", "ETL Pipelines",
      "Python", "TypeScript", "FastAPI", "Django", "NestJS", "React", "Next.js",
      "Docker", "Distributed Systems", "Abuja", "Nigeria",
    ],
    /* origin + pathname, deliberately not location.href.
       href carries the query string, so an inbound ?utm_source=… link
       self-canonicalised to the tagged URL instead of consolidating onto the
       clean one — the exact duplicate-content split canonical exists to fix. */
    canonical: `${SITE_ORIGIN}/`,
    openGraph: {
      title: "Emmanuel Moghalu | Data Engineer & Backend Systems",
      description: "Event-driven pipelines, payment reconciliation, and analytics platforms — shipped with the test suites that prove them.",
      image: `${SITE_ORIGIN}/og-image.jpg`,
      url: SITE_ORIGIN,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      site: "@mrebr",
      creator: "@mrebr",
      title: "Emmanuel Moghalu — Engineering Logs",
      description: "Payment reconciliation, streaming telemetry, and analytics platforms — with the architectural decisions and trade-offs behind them."
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen relative selection:bg-primary/20 selection:text-primary overflow-x-hidden max-w-full">
      {/* Global Background Grid for continuous flow */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-stretch">
        <SEOHead metadata={seoMetadata} />
        <StructuredData />

        <Hero />
        <About />
        <Projects />
        <Experience />
        <Contact />
      </div>
    </div>
  );
};

export default Index;