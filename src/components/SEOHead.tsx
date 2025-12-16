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

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://emmanuelmoghalu.com';

  return (
    <Helmet>
      {/* 1. Core Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="application-name" content="Emmanuel Moghalu" />
      <meta name="apple-mobile-web-app-title" content="Emmanuel Moghalu" />
      <meta name="theme-color" content="#000000" />

      {/* 2. Indexing & Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="googlebot" content="index, follow" />
      <meta name="revisit-after" content="7 days" />
      <meta name="language" content="English" />
      <meta name="author" content="Emmanuel C. Moghalu" />

      {/* 3. Keywords */}
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}

      {/* 4. Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* 5. Open Graph (Facebook/LinkedIn) */}
      <meta property="og:type" content={openGraph?.type || 'website'} />
      <meta property="og:site_name" content="Emmanuel C. Moghalu — Engineering Logs" />
      <meta property="og:title" content={openGraph?.title || title} />
      <meta property="og:description" content={openGraph?.description || description} />
      <meta property="og:url" content={openGraph?.url || canonical || siteUrl} />
      {openGraph?.image && <meta property="og:image" content={openGraph.image} />}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Emmanuel Moghalu Portfolio Cover" />

      {/* 6. Twitter Card */}
      <meta name="twitter:card" content={twitter?.card || 'summary_large_image'} />
      <meta name="twitter:site" content={twitter?.site || '@_mrebuka'} />
      <meta name="twitter:creator" content={twitter?.creator || '@_mrebuka'} />
      <meta name="twitter:title" content={twitter?.title || title} />
      <meta name="twitter:description" content={twitter?.description || description} />
      {openGraph?.image && <meta name="twitter:image" content={openGraph.image} />}

      {/* 7. Favicons & Manifest */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* 8. Fonts Preloading (Inter Variable) */}
      <link rel="preconnect" href="https://rsms.me/" />
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    </Helmet>
  );
};

export default SEOHead;