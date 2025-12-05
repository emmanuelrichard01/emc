import { useState, useRef } from 'react';
import DynamicNavigation from '@/components/DynamicNavigation';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Projects from '@/components/Projects';
import Experience from '@/components/Experience';
import Projects2 from '@/components/ptext';
import BlogSection from '@/components/BlogSection';
import Contact from '@/components/Contact';
import Resume from '@/components/Resume';
import Footer from '@/components/Footer';
import CommandPalette from '@/components/CommandPalette';
import EasterEgg from '@/components/EasterEgg';
import SEOHead from '@/components/SEOHead';
import StructuredData from '@/components/StructuredData';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useKeyboardShortcuts, useKonamiCode } from '@/hooks/useKeyboardShortcuts';
import { useThemeMemory } from '@/hooks/useThemeMemory';
import { SEOMetadata } from '@/types';


const Index = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEasterEggActive, setIsEasterEggActive] = useState(false);
  const aboutRef = useRef(null);
  // Initialize theme memory
  useThemeMemory();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+k': () => setIsCommandPaletteOpen(true),
    '/': () => setIsCommandPaletteOpen(true),
  });

  // Konami code easter egg
  useKonamiCode(() => {
    setIsEasterEggActive(true);
  });

  // SEO metadata for the homepage
  const seoMetadata: SEOMetadata = {
    title: "Emmanuel C. Moghalu | Software Developer & Data Engineer",
    description: "Passionate software developer and data engineer specializing in full-stack development, cloud architecture, and machine learning. Building scalable applications that make a meaningful impact.",
    keywords: [
      "software developer",
      "data engineer",
      "full-stack developer",
      "react developer",
      "typescript developer",
      "cloud architecture",
      "machine learning",
      "Emmanuel Moghalu",
      "web development",
      "python developer"
    ],
    canonical: typeof window !== 'undefined' ? window.location.href : undefined,
    openGraph: {
      title: "Emmanuel C. Moghalu - Software Developer & Data Engineer Portfolio",
      description: "Explore my portfolio showcasing expertise in software development, data engineering, and innovative technology solutions.",
      image: `${typeof window !== 'undefined' ? window.location.origin : ''}/og-image.jpg`,
      url: typeof window !== 'undefined' ? window.location.origin : '',
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      site: "@_mrebuka",
      creator: "@_mrebuka"
    }
  };

  return (
    <>
      <SEOHead metadata={seoMetadata} />
      <StructuredData />

      <div className="min-h-screen bg-background font-inter">
        <DynamicNavigation onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
        {/* <Navigation /> */}
        <main>
          <ErrorBoundary fallback={
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-lg text-muted-foreground">Sorry, the hero section failed to load.</p>
            </div>
          }>
            <Hero />
          </ErrorBoundary>

          <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">About section temporarily unavailable.</p>
            </div>
          }>
            <About />
          </ErrorBoundary>

          <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Projects section temporarily unavailable.</p>
            </div>
          }>
            <Projects />
          </ErrorBoundary>

          {/* <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Second Projects section temporarily unavailable.</p>
            </div>
          }>
            <Projects2 />
          </ErrorBoundary> */}

          <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Experience section temporarily unavailable.</p>
            </div>
          }>
            <Experience />
          </ErrorBoundary>

          {/* <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Tech stack section temporarily unavailable.</p>
            </div>
          }>
            <TechStackRadar />
          </ErrorBoundary> */}
          {/*
          <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Blog section temporarily unavailable.</p>
            </div>
          }>
            <BlogSection />
          </ErrorBoundary>

          <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Resume section temporarily unavailable.</p>
            </div>
          }>
            <Resume />
          </ErrorBoundary> */}

          <ErrorBoundary fallback={
            <div className="py-20 text-center">
              <p className="text-muted-foreground">Contact section temporarily unavailable.</p>
            </div>
          }>
            <Contact />
          </ErrorBoundary>
        </main>
        <Footer />

        {/* Global Features */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
        <EasterEgg
          isActive={isEasterEggActive}
          onComplete={() => setIsEasterEggActive(false)}
        />
      </div>
    </>
  );
};

export default Index;
