// Canonical list of thin, redundant, or utility routes excluded from indexing and sitemap-0.xml.
// Routes remain live (200 OK) for visitors and internal navigation so zero links break.

export const excludedPaths = [
  "/admin",
  "/404",
  "/500",
  "/testimonials",
  "/author/team",
  "/blog/webp-to-jpg-converter",
  "/free-pdf-to-jpg",
  "/online-pdf-to-jpg",
  "/free-online-pdf-to-jpg",
  "/free-heic-to-jpg",
  "/image-to-jpg-converter",
  "/jpg-converter",
  // Overlapping / thin programmatic tool variants consolidated under flagship converters & compressors
  "/png-to-pdf",
  "/pdf-to-png",
  "/webp-to-png",
  "/png-to-webp",
  "/heic-to-png",
  "/crop-image",
  "/resize-jpg",
  "/image-enhancer",
  "/pdf-enhancer",
  "/png-to-avif",
  "/svg-to-jpg",
  "/avif-to-png",
  "/cr2-to-jpg",
  "/raw-to-jpg",
  "/word-to-jpg",
  "/compress-image-to-20kb",
  "/compress-image-to-50kb",
  "/compress-to-200kb",
  "/compress-image-for-email",
  "/jpg-compressor",
  "/png-compressor",
  "/image-to-jpg",
  "/jfif-to-jpg",
  // Thin / overlapping blog posts superseded by comprehensive guides
  "/blog/jpg-to-pdf-converter-guide",
  "/blog/resize-photo-to-35x45mm",
  "/blog/heic-to-jpg-iphone-photos",
  "/blog/compress-image-to-100kb",
  "/blog/best-free-image-compressor-online",
  "/blog/compress-image-for-upsc-form",
];

/**
 * Check whether a URL or pathname matches any excluded route.
 * @param {string} target
 * @returns {boolean}
 */
export function isExcludedRoute(target) {
  let pathname = target;
  try {
    if (target.startsWith("http")) {
      pathname = new URL(target).pathname;
    }
  } catch {
    // keep raw target
  }
  if (pathname.includes("/tools/") && pathname !== "/tools/" && pathname !== "/tools") {
    return true;
  }
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return excludedPaths.some((p) => normalized === p || normalized.endsWith(p));
}

