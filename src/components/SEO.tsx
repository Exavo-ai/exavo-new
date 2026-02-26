import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string;
}

const SEO = ({ 
  title = 'Exavo AI - Empowering Businesses with Intelligent AI Solutions',
  description = 'Exavo AI delivers cutting-edge AI tools, business automation, and digital transformation services. Making AI accessible for every business.',
  image = 'https://lovable.dev/opengraph-image-p98pqg.png',
  keywords = 'AI solutions, business automation, digital transformation, artificial intelligence, machine learning, AI consulting'
}: SEOProps) => {
  const location = useLocation();

  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:type', 'website', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    // Add JSON-LD structured data - Organization
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Exavo AI",
      "url": "https://exavo.ai",
      "description": "Exavo is an AI infrastructure & implementation partner specializing in business AI implementation, AI automation, and custom AI development. We provide structured end-to-end AI solutions for growth-stage companies.",
      "areaServed": "Global",
      "foundingDate": "2026",
      "logo": image,
      "sameAs": [
        "https://twitter.com/ExavoAI",
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "availableLanguage": ["English", "Arabic"]
      }
    };

    let scriptTag = document.querySelector('script[data-ld="organization"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      scriptTag.setAttribute('data-ld', 'organization');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Add JSON-LD structured data - Service types
    const serviceData = {
      "@context": "https://schema.org",
      "@type": "Service",
      "provider": {
        "@type": "Organization",
        "name": "Exavo AI"
      },
      "serviceType": [
        "AI Infrastructure & Implementation Partner",
        "AI Automation",
        "Custom AI Development",
        "Business AI Implementation"
      ],
      "areaServed": "Global",
      "description": "Exavo is an AI infrastructure & implementation partner specializing in business AI implementation, AI automation, and custom AI development. We provide structured end-to-end AI solutions for growth-stage companies."
    };

    let serviceScriptTag = document.querySelector('script[data-ld="service"]');
    if (!serviceScriptTag) {
      serviceScriptTag = document.createElement('script');
      serviceScriptTag.setAttribute('type', 'application/ld+json');
      serviceScriptTag.setAttribute('data-ld', 'service');
      document.head.appendChild(serviceScriptTag);
    }
    serviceScriptTag.textContent = JSON.stringify(serviceData);

  }, [title, description, image, keywords, location]);

  return null;
};

export default SEO;
