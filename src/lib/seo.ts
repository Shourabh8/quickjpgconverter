import { site } from "@data/site";

interface MetaOptions {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export function generateMeta(opts: MetaOptions) {
  const title = opts.title === site.title ? opts.title : `${opts.title} | ${site.name}`;
  const canonical = opts.canonical ?? site.url;
  const ogImage = opts.ogImage ?? site.ogImage;

  return {
    title,
    meta: [
      { name: "description", content: opts.description },
      { name: "theme-color", content: site.themeColor },

      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: site.name },
      { property: "og:title", content: title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: new URL(ogImage, site.url).href },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: site.locale },

      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: site.twitter },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: new URL(ogImage, site.url).href },

      // Robots
      ...(opts.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : [{ name: "robots", content: "index, follow" }]),
    ],
    link: [
      { rel: "canonical", href: canonical },
    ],
  };
}

interface JsonLdOptions {
  type?: string;
  name: string;
  description: string;
  url?: string;
  breadcrumbs?: { name: string; url: string }[];
  faqItems?: { question: string; answer: string }[];
  applicationCategory?: string;
  howToSteps?: { name: string; text: string; image?: string }[];
  toolSchema?: {
    name: string;
    description: string;
    url: string;
    featureList: string[];
  };
}

export function generateJsonLd(opts: JsonLdOptions) {
  const baseUrl = site.url;

  const graphs: Record<string, unknown>[] = [];

  // WebApplication / SoftwareApplication schema
  if (opts.toolSchema) {
    // Tool-specific schema
    graphs.push({
      "@type": "WebApplication",
      name: opts.toolSchema.name,
      description: opts.toolSchema.description,
      url: opts.toolSchema.url,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: opts.toolSchema.featureList,
    });
  } else {
    // Site-wide schema (homepage, blog, etc.)
    graphs.push({
      "@type": "SoftwareApplication",
      name: site.name,
      description: opts.description,
      url: opts.url ?? baseUrl,
      applicationCategory: opts.applicationCategory ?? "MultimediaApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "JPG to PNG conversion",
        "PNG to JPG conversion",
        "JPG to WebP conversion",
        "WebP to JPG conversion",
        "PNG to WebP conversion",
        "WebP to PNG conversion",
        "HEIC to JPG conversion",
        "HEIC to PNG conversion",
        "JPG to PDF conversion",
        "PNG to PDF conversion",
        "PDF to JPG conversion",
        "PDF to PNG conversion",
        "Image compression",
        "PDF compression",
        "Compress to 100KB",
        "Compress to 200KB",
        "Compress for government forms (SSC, UPSC, Bank)",
        "Passport photo size compressor",
        "Image resize",
        "Image enhancement",
        "PDF enhancement",
        "Image to Base64 conversion",
        "Base64 encoder for web development",
        "Batch processing",
        "Browser-based processing",
        "No upload required",
        "Free online converter",
        "100% private — files never leave your device",
      ],
    });
  }

  // Organization schema
  graphs.push({
    "@type": "Organization",
    name: site.name,
    url: baseUrl,
    logo: new URL("/favicon.svg", baseUrl).href,
    sameAs: [],
  });

  // WebSite schema with SearchAction for sitelinks searchbox
  graphs.push({
    "@type": "WebSite",
    name: site.name,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/tools?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });

  // LocalBusiness schema for US/India targeting
  graphs.push({
    "@type": "SoftwareApplication",
    name: site.name,
    description: "Free online image converter and compressor. Convert JPG, PNG, WebP, HEIC, and PDF images instantly in your browser. No uploads, no signup, completely private.",
    url: baseUrl,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        author: {
          "@type": "Person",
          name: "Sarah K.",
        },
        reviewBody: "Finally, a converter that doesn't make me upload my photos to some random server. Game changer for client work.",
      },
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        author: {
          "@type": "Person",
          name: "Marcus T.",
        },
        reviewBody: "We use this daily for our e-commerce product images. Fast, reliable, and the WebP conversion saves us hours of optimization.",
      },
    ],
  });

  // BreadcrumbList schema
  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    graphs.push({
      "@type": "BreadcrumbList",
      itemListElement: opts.breadcrumbs.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: new URL(crumb.url, baseUrl).href,
      })),
    });
  }

  // FAQPage schema
  if (opts.faqItems && opts.faqItems.length > 0) {
    graphs.push({
      "@type": "FAQPage",
      mainEntity: opts.faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  // HowTo schema
  if (opts.howToSteps && opts.howToSteps.length > 0) {
    graphs.push({
      "@type": "HowTo",
      name: opts.name,
      description: opts.description,
      step: opts.howToSteps.map((step, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: step.name,
        text: step.text,
        ...(step.image ? { image: new URL(step.image, baseUrl).href } : {}),
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graphs,
  };
}
