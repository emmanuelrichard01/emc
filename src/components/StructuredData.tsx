import { Helmet } from 'react-helmet-async';
import { StructuredDataPerson } from '@/types';

const StructuredData = () => {
  const personData: StructuredDataPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Emmanuel C. Moghalu",
    jobTitle: "Software Developer & Data Engineer",
    description: "Passionate software developer and data engineer with expertise in building scalable applications and robust data infrastructure. Specializes in full-stack development, cloud architecture, and machine learning.",
    url: window.location.origin,
    sameAs: [
      "https://github.com/emmanuelrichard01",
      "https://www.linkedin.com/in/e-mc/",
      "https://x.com/_mrebuka",
      "https://www.instagram.com/officialemmanuelrichard/"
    ],
    worksFor: {
      "@type": "Organization",
      name: "TechCorp Solutions"
    },
    knowsAbout: [
      "Software Development",
      "Data Engineering",
      "Full-Stack Development",
      "Cloud Architecture",
      "Machine Learning",
      "React",
      "TypeScript",
      "Python",
      "Node.js",
      "AWS",
      "Data Analytics",
      "Web Development"
    ],
    email: "emma.moghalu@gmail.com",
    telephone: "+2347086493145",
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Francisco",
      addressRegion: "CA",
      addressCountry: "US"
    }
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Emmanuel C. Moghalu - Portfolio",
    url: window.location.origin,
    logo: `${window.location.origin}/logo.png`,
    description: "Professional portfolio showcasing software development and data engineering expertise",
    founder: {
      "@type": "Person",
      name: "Emmanuel C. Moghalu"
    }
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "Website",
    name: "Emmanuel C. Moghalu - Portfolio",
    url: window.location.origin,
    description: "Software Developer & Data Engineer Portfolio",
    author: {
      "@type": "Person",
      name: "Emmanuel C. Moghalu"
    },
    inLanguage: "en-US"
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(personData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteData)}
      </script>
    </Helmet>
  );
};

export default StructuredData;