import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Relative imports to bypass alias resolution issues
// Assuming file structure:
// src/pages/Index.tsx
// src/components/Hero.tsx
import Hero from '../components/Hero';
import About from '../components/About';
import Projects from '../components/Projects';
import Experience from '../components/Experience';
import Contact from '../components/Contact';
import EasterEgg from '../components/EasterEgg';
import SEOHead from '../components/SEOHead';
import StructuredData from '../components/StructuredData';

// Types
import { SEOMetadata } from '../types'; // Adjusted import path to match type file location

// Simple inline hook for Konami Code to ensure stability
const useKonamiCode = (callback: () => void) => {
  const [keys, setKeys] = useState<string[]>([]);

  React.useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    const down = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = [...prev, e.key].slice(-konamiCode.length);
        if (JSON.stringify(newKeys) === JSON.stringify(konamiCode)) {
          callback();
        }
        return newKeys;
      });
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [callback]);
};

// Page Transition
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.1 } },
  exit: { opacity: 0 }
};

const Index = () => {
  const [isEasterEggActive, setIsEasterEggActive] = useState(false);

  // Activate Easter Egg via Konami Code
  useKonamiCode(() => {
    setIsEasterEggActive(true);
  });

  // 2026-Ready Metadata
  const seoMetadata: SEOMetadata = {
    title: "Emmanuel Moghalu | Data Engineer & System Architect",
    description: "Engineering resilient data pipelines and scalable software systems. Focusing on architecture, tradeoffs, and operational excellence.",
    keywords: [
      "Data Engineer",
      "System Architect",
      "Software Engineer",
      "Distributed Systems",
      "Pipeline Design",
      "React",
      "Next.js",
      "TypeScript",
      "Python",
      "Kafka",
      "AWS",
      "Apache Spark",
      "Docker",
      "Kubernetes",
      "Azure",
      "GCP",
      "Emmanuel Moghalu"
    ],
    canonical: typeof window !== 'undefined' ? window.location.href : undefined,
    openGraph: {
      title: "Emmanuel Moghalu - Engineering Logs",
      description: "A portfolio of system designs, architectural decisions, and production-grade software.",
      image: `${typeof window !== 'undefined' ? window.location.origin : ''}/og-image.jpg`,
      url: typeof window !== 'undefined' ? window.location.origin : '',
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
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="bg-background min-h-screen"
    >
      {/* SEO Components */}
      <SEOHead metadata={seoMetadata} />
      <StructuredData />

      {/* Sections - Clean Composition (Layout handled by App.tsx) */}
      <Hero />
      <About />
      <Projects />
      <Experience />
      <Contact />

      {/* Hidden Features */}
      <EasterEgg
        isActive={isEasterEggActive}
        onComplete={() => setIsEasterEggActive(false)}
      />
    </motion.div>
  );
};

export default Index;