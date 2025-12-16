import React from 'react';
import { Helmet } from 'react-helmet-async';

// Helper to safely get origin
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : 'https://em-webapp.vercel.app';

const StructuredData = () => {
  const origin = getOrigin();

  // 1. Person Schema (The Engineer)
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Data Engineer", // More specific than "Person"
    "name": "Emmanuel Moghalu",
    "givenName": "Emmanuel",
    "familyName": "Moghalu",
    "jobTitle": "Lead Data Engineer & System Architect",
    "url": origin,
    "image": `${origin}/avatar.jpg`,
    "description": "Specialist in distributed data systems, cloud architecture, and high-performance software engineering.",
    "knowsAbout": [
      "Distributed Systems",
      "Data Engineering",
      "Apache Kafka",
      "React",
      "TypeScript",
      "Python",
      "AWS Architecture"
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
    "email": "emma.moghalu@gmail.com"
  };

  // 2. WebSite Schema (The Portfolio)
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Emmanuel (Richard) Moghalu — Engineering Logs",
    "url": origin,
    "description": "Portfolio and technical case studies of Emmanuel Moghalu.",
    "author": {
      "@type": "Person",
      "name": "Emmanuel Moghalu"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  // 3. Organization Schema (Your 'Brand' as a Freelancer/Consultant)
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Emmanuel Moghalu Engineering",
    "url": origin,
    "logo": `${origin}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "emma.moghalu@gmail.com",
      "contactType": "professional service",
      "areaServed": "Global"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(personSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;