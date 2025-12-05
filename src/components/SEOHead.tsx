import { Helmet } from 'react-helmet-async';
import { SEOMetadata } from '@/types';

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

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph Meta Tags */}
      {openGraph && (
        <>
          <meta property="og:title" content={openGraph.title} />
          <meta property="og:description" content={openGraph.description} />
          <meta property="og:image" content={openGraph.image} />
          <meta property="og:url" content={openGraph.url} />
          <meta property="og:type" content={openGraph.type || 'website'} />
          <meta property="og:site_name" content="Emmanuel C. Moghalu - Portfolio" />
        </>
      )}
      
      {/* Twitter Card Meta Tags */}
      {twitter && (
        <>
          <meta name="twitter:card" content={twitter.card || 'summary_large_image'} />
          <meta name="twitter:site" content={twitter.site} />
          <meta name="twitter:creator" content={twitter.creator} />
          <meta name="twitter:title" content={openGraph?.title || title} />
          <meta name="twitter:description" content={openGraph?.description || description} />
          {openGraph?.image && (
            <meta name="twitter:image" content={openGraph.image} />
          )}
        </>
      )}
      
      {/* Additional Meta Tags */}
      <meta name="author" content="Emmanuel C. Moghalu" />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      
      {/* Favicon and App Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      
      {/* Performance Hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link 
        rel="preload" 
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
        as="style"
        onLoad={(e) => {
          const target = e.target as HTMLLinkElement;
          target.onload = null;
          target.rel = 'stylesheet';
        }}
      />
    </Helmet>
  );
};

export default SEOHead;