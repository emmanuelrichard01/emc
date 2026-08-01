import { useState, useEffect } from 'react';

// Components
import Hero from '../components/Hero';
import About from '../components/About';
import Projects from '../components/Projects';
import Experience from '../components/Experience';
import Contact from '../components/Contact';
import EasterEgg from '../components/EasterEgg';
import SEOHead from '../components/SEOHead';
import StructuredData from '../components/StructuredData';

// Hooks
import { useKonamiCode } from '../hooks/useKonamiCode';

// Types
import { SEOMetadata } from '../types';

const Index = () => {
  const [isEasterEggActive, setIsEasterEggActive] = useState(false);

  useKonamiCode(() => {
    setIsEasterEggActive(true);
  });

  // Console hint for developers who open DevTools
  useEffect(() => {
    console.log(
      "%c👋 Hey, you found the console.",
      "color: #8b5cf6; font-size: 14px; font-weight: bold;"
    );
    console.log(
      "%cTry the Konami Code. You know the one.",
      "color: #666; font-size: 11px;"
    );
  }, []);

  const seoMetadata: SEOMetadata = {
    title: "Emmanuel Moghalu | Data Engineer & System Architect",
    description: "Engineering resilient data pipelines and scalable software systems. Focusing on architecture, tradeoffs, and operational excellence.",
    keywords: [
      "Data Engineer", "System Architect", "Software Engineer",
      "Distributed Systems", "Pipeline Design", "React", "Next.js",
      "TypeScript", "Python", "Kafka", "AWS", "Apache Spark",
      "Docker", "Kubernetes", "Azure", "GCP", "Emmanuel Moghalu"
    ],
    canonical: typeof window !== 'undefined' ? window.location.href : undefined,
    openGraph: {
      title: "Emmanuel Moghalu | Data Engineer & System Architect",
      description: "Engineering resilient data pipelines, scalable cloud infrastructure, and production-grade software systems.",
      image: typeof window !== 'undefined' ? `${window.location.origin}/og-image.jpg` : 'https://www.builtbyem.dev/og-image.jpg',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://www.builtbyem.dev',
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      site: "@_mrebuka",
      creator: "@_mrebuka",
      title: "Emmanuel Moghalu - Engineering Logs",
      description: "System designs, architectural decisions, and production-grade software."
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

        <EasterEgg
          isActive={isEasterEggActive}
          onComplete={() => setIsEasterEggActive(false)}
        />
      </div>
    </div>
  );
};

export default Index;