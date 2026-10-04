import { site } from "@data/site";

interface MetaOptions {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export function generateMeta(opts: MetaOptions) {
  let canonical = opts.canonical ?? site.url;
  // Normalize canonical URL to always include a trailing slash (matches Cloudflare Pages routing and sitemap)
  // unless pointing to a file with an extension (.xml, .html, .png, etc.)
  try {
    const parsed = new URL(canonical);
    if (!parsed.pathname.endsWith("/")) {
      const lastSegment = parsed.pathname.split("/").pop() || "";
      if (!lastSegment.includes(".")) {
        parsed.pathname += "/";
      }
    }
    canonical = parsed.href;
  } catch {
    // fallback if not a valid URL
    if (!canonical.endsWith("/")) {
      canonical += "/";
    }
  }

  // Skip brand suffix on blog posts — titles are already descriptive and would exceed 60 chars
  const isBlog = canonical.includes("/blog/");
  const title = opts.title === site.title || opts.title.includes(site.name) || isBlog
    ? opts.title
    : `${opts.title} | ${site.name}`;
  const ogImage = opts.ogImage ?? site.ogImage;

  return {
    title,
    canonical,
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
      ...(opts.noindex
        ? [{ name: "robots", content: "noindex, nofollow" }]
        : [{ name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" }]),
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
  articleSchema?: {
    headline: string;
    datePublished: string;
    dateModified?: string;
    author?: string;
    authorName?: string;
    image?: string;
  };
}

export function generateJsonLd(opts: JsonLdOptions) {
  const baseUrl = site.url;
  const pageUrl = opts.url ?? baseUrl;
  const isHomepage = !opts.url || opts.url === baseUrl || opts.url === `${baseUrl}/`;

  const graphs: Record<string, unknown>[] = [];

  // Organization schema (consistent across all pages with persistent @id)
  graphs.push({
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: site.name,
    url: baseUrl,
    logo: new URL("/favicon.svg", baseUrl).href,
  });

  // WebSite schema with SearchAction ONLY on the root homepage per Google guidelines
  if (isHomepage) {
    graphs.push({
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      name: site.name,
      url: baseUrl,
      publisher: {
        "@id": `${baseUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/tools/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    });

    // Site-wide SoftwareApplication schema for homepage
    graphs.push({
      "@type": "SoftwareApplication",
      name: site.name,
      description: opts.description,
      url: baseUrl,
      applicationCategory: opts.applicationCategory ?? "MultimediaApplication",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires HTML5 Canvas and WebAssembly support",
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
  } else if (opts.toolSchema) {
    // Explicit tool schema
    graphs.push({
      "@type": "WebApplication",
      name: opts.toolSchema.name,
      description: opts.toolSchema.description,
      url: opts.toolSchema.url,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires HTML5 Canvas and WebAssembly support",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: opts.toolSchema.featureList,
    });
  } else if (opts.articleSchema) {
    // Blog/Article schema
    graphs.push({
      "@type": "BlogPosting",
      headline: opts.articleSchema.headline,
      description: opts.description,
      url: pageUrl,
      datePublished: opts.articleSchema.datePublished,
      dateModified: opts.articleSchema.dateModified ?? opts.articleSchema.datePublished,
      author: opts.articleSchema.authorName
        ? { "@type": "Person", name: opts.articleSchema.authorName }
        : { "@type": "Organization", name: opts.articleSchema.author ?? site.name },
      publisher: {
        "@id": `${baseUrl}/#organization`,
      },
      ...(opts.articleSchema.image ? { image: opts.articleSchema.image } : {}),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
    });
  } else {
    // Determine whether this subpage is an individual tool page or standard content page
    const isUtilityOrDocPage = [
      "/about",
      "/contact",
      "/faq",
      "/privacy",
      "/terms",
      "/disclaimer",
      "/why-browser-based",
      "/blog",
    ].some((path) => pageUrl.includes(path));

    if (!isUtilityOrDocPage && !pageUrl.endsWith("/tools/")) {
      // It is an active tool page without explicit toolSchema; emit tailored WebApplication schema
      graphs.push({
        "@type": "WebApplication",
        name: opts.name.split("—")[0].trim(),
        description: opts.description,
        url: pageUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web Browser",
        browserRequirements: "Requires HTML5 Canvas and WebAssembly support",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      });
    } else {
      // Standard informational WebPage
      graphs.push({
        "@type": "WebPage",
        name: opts.name,
        description: opts.description,
        url: pageUrl,
        isPartOf: {
          "@id": `${baseUrl}/#website`,
        },
      });
    }
  }

  // BreadcrumbList schema with normalized trailing slash URLs
  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    graphs.push({
      "@type": "BreadcrumbList",
      itemListElement: opts.breadcrumbs.map((crumb, i) => {
        let itemUrl = crumb.url;
        if (!itemUrl.startsWith("http")) {
          const clean = itemUrl.endsWith("/") || itemUrl.includes("?") || itemUrl.includes("#") ? itemUrl : `${itemUrl}/`;
          itemUrl = new URL(clean, baseUrl).href;
        }
        return {
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          item: itemUrl,
        };
      }),
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
