import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SEOMetadata } from '../types'; // Relative import fix

interface SEOHeadProps {
  metadata: SEOMetadata;
}

const SEOHead = ({ metadata }: SEOHeadProps) => {
  const {
    title,
    description,
    keywords = [],
    canonical,
    openGraph,
    twitter
  } = metadata;

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://em-webapp.vercel.app';

  return (
    <Helmet>
      {/* 1. Core Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="application-name" content="Emmanuel Moghalu" />
      <meta name="apple-mobile-web-app-title" content="Emmanuel Moghalu" />
      <meta name="theme-color" content="#050505" />
      <meta name="color-scheme" content="dark" />

      {/* 2. Indexing & Robots — rich snippet optimization */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1" />
      <meta name="bingbot" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="Emmanuel C. Moghalu" />

      {/* 3. Keywords */}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}

      {/* 4. AI Engine & Attribution Meta */}
      <meta name="generator" content="Vite + React" />



      {/* 5. Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* 6. Open Graph (Facebook/LinkedIn/AI previews) */}
      <meta property="og:type" content={openGraph?.type || 'website'} />
      <meta property="og:site_name" content="Emmanuel C. Moghalu — Engineering Logs" />
      <meta property="og:title" content={openGraph?.title || title} />
      <meta property="og:description" content={openGraph?.description || description} />
      <meta property="og:url" content={openGraph?.url || canonical || siteUrl} />
      {openGraph?.image && <meta property="og:image" content={openGraph.image} />}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Emmanuel Moghalu — Data Engineer & System Architect Portfolio" />
      <meta property="og:locale" content="en_US" />

      {/* 7. Twitter Card */}
      <meta name="twitter:card" content={twitter?.card || 'summary_large_image'} />
      <meta name="twitter:site" content={twitter?.site || '@_mrebuka'} />
      <meta name="twitter:creator" content={twitter?.creator || '@_mrebuka'} />
      <meta name="twitter:title" content={twitter?.title || title} />
      <meta name="twitter:description" content={twitter?.description || description} />
      {openGraph?.image && <meta name="twitter:image" content={openGraph.image} />}
      <meta name="twitter:image:alt" content="Emmanuel Moghalu Portfolio" />

      {/* 8. Favicons & Manifest */}
      <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />



      {/* 10. DNS Prefetch for external resources */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
    </Helmet>
  );
};

export default SEOHead;