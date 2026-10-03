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
      "%c👋 Hi, you found the console.",
      "color: #e8a33d; font-size: 14px; font-weight: bold;"
    );
    console.log(
      "%cThere's a hidden layer. Three ways in: the Konami code, typing `konami` in the terminal, or running __emc.unlock() right here.",
      "color: #666; font-size: 11px;"
    );
    console.log("%c__emc.status() shows whether you're in.", "color: #666; font-size: 11px;");
  }, []);

  const seoMetadata: SEOMetadata = {
    title: "Emmanuel Moghalu | Data Engineer & Backend Systems",
    description:
      "Data and backend engineer in Abuja, Nigeria. I build data pipelines, payment reconciliation and analytics systems, and ship them with the tests that prove they work. Nigerian fintech experience with Paystack, Flutterwave, CBN and NDPR rules.",
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
      description: "Data pipelines, payment reconciliation and analytics systems, shipped with the tests that prove they work.",
      image: `${SITE_ORIGIN}/og-image.jpg`,
      url: SITE_ORIGIN,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      site: "@mrebr",
      creator: "@mrebr",
      title: "Emmanuel Moghalu, data and backend engineer",
      description: "Payment reconciliation, live data pipelines and analytics systems, with the decisions and trade-offs behind each one."
    }
  };

  return (
    <div className="bg-background min-h-dvh relative selection:bg-primary/20 selection:text-primary overflow-x-clip max-w-full">
      <div className="relative z-10 w-full flex flex-col items-stretch">
        <SEOHead metadata={seoMetadata} />
        <StructuredData />

        {/* About is the hero's child: it waits beneath the pinned hero and
            emerges as the dive into the event horizon completes. */}
        <Hero>
          <About />
        </Hero>
        {/* Sections open on their own drawn rule (SectionHead); the space
            between them is the transition. */}
        <Projects />
        <Experience />
        <Contact />
      </div>
    </div>
  );
};

export default Index;