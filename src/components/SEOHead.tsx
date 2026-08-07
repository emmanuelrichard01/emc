import React from 'react';
import { Helmet } from 'react-helmet-async';

import { SEOMetadata } from '../types';

/* ==========================================================================
   SEO HEAD

   The single owner of every per-route head tag.

   That exclusivity is the point, not tidiness. The static tags in index.html
   are marked data-rh="true" so react-helmet-async adopts them instead of
   rendering a second copy alongside — which is how a project page ended up
   serving two canonicals, one pointing at "/" and one at "/projects/x", and
   search engines resolved the conflict by ignoring both.

   Adoption only works if it is total. Helmet clears the tags it owns before
   writing the new set, so a route rendering a partial set would silently drop
   whatever it left out. Every route therefore goes through this component and
   gets the whole set, always. Tags that must survive independently of the
   router — viewport, favicons, preconnect — live in index.html unmarked and
   are deliberately absent here.

   The remaining limit is inherent to a client-rendered SPA: scrapers that do
   not execute JS only ever see index.html's baseline, so /projects/:id still
   previews with the homepage card. Prerendering the routes is the only real
   fix for that; this component makes everything downstream of JS correct.
   ========================================================================== */

const FALLBACK_ORIGIN = 'https://www.builtbyem.dev';

const getOrigin = () => (typeof window !== 'undefined' ? window.location.origin : FALLBACK_ORIGIN);

/** Resolves a possibly-relative image path against the current origin. */
function absoluteImage(image: string | undefined, origin: string): string {
  if (!image) return `${origin}/og-image.jpg`;
  if (image.startsWith('http')) return image;
  return `${origin}${image.startsWith('/') ? '' : '/'}${image}`;
}

interface SEOHeadProps {
  metadata: SEOMetadata;
  /** Route-specific JSON-LD. Rendered inside the same Helmet. */
  children?: React.ReactNode;
}

const SEOHead = ({ metadata, children }: SEOHeadProps) => {
  const { title, description, keywords = [], canonical, robots, openGraph, twitter } = metadata;

  const origin = getOrigin();
  const imageUrl = absoluteImage(openGraph?.image, origin);
  const imageAlt = openGraph?.imageAlt ?? 'Emmanuel Moghalu — Data Engineer & System Architect';
  const url = openGraph?.url || canonical || origin;

  return (
    <Helmet>
      {/* Core */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="author" content="Emmanuel C. Moghalu" />

      {/* Indexing. Defaults to indexable; a 404 passes noindex explicitly. */}
      <meta
        name="robots"
        content={robots ?? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />

      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}

      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={openGraph?.type || 'website'} />
      <meta property="og:site_name" content="Emmanuel Moghalu Portfolio" />
      <meta property="og:title" content={openGraph?.title || title} />
      <meta property="og:description" content={openGraph?.description || description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:type" content={imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg'} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter / X */}
      <meta name="twitter:card" content={twitter?.card || 'summary_large_image'} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:site" content={twitter?.site || '@mrebr'} />
      <meta name="twitter:creator" content={twitter?.creator || '@mrebr'} />
      <meta name="twitter:title" content={twitter?.title || title} />
      <meta name="twitter:description" content={twitter?.description || description} />
      <meta name="twitter:image" content={twitter?.image || imageUrl} />

      {/* Appearance */}
      <meta name="theme-color" content="#050505" />
      <meta name="color-scheme" content="dark" />

      {children}
    </Helmet>
  );
};

export default SEOHead;
