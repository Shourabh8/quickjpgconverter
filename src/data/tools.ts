export interface Tool {
  slug: string;
  title: string;
  description: string;
  from: string;
  to: string;
  icon: string;
  keywords: string[];
  isCompressor?: boolean;
}

export const tools: Tool[] = [
  {
    slug: "jpg-to-png",
    title: "JPG to PNG",
    description: "Convert JPG images to PNG format with transparency support.",
    from: "JPG",
    to: "PNG",
    icon: "🖼️",
    keywords: ["jpg to png", "convert jpg to png", "jpeg to png"],
  },
  {
    slug: "png-to-jpg",
    title: "PNG to JPG",
    description: "Convert PNG images to JPG format with optimized compression.",
    from: "PNG",
    to: "JPG",
    icon: "📸",
    keywords: ["png to jpg", "convert png to jpeg", "png to jpeg"],
  },
  {
    slug: "jpg-to-webp",
    title: "JPG to WebP",
    description: "Convert JPG images to WebP for smaller file sizes and faster loading.",
    from: "JPG",
    to: "WebP",
    icon: "⚡",
    keywords: ["jpg to webp", "convert jpg to webp", "jpeg to webp"],
  },
  {
    slug: "webp-to-jpg",
    title: "WebP to JPG",
    description: "Convert WebP images back to JPG for wider compatibility.",
    from: "WebP",
    to: "JPG",
    icon: "🔄",
    keywords: ["webp to jpg", "convert webp to jpeg", "webp to jpeg"],
  },
  {
    slug: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Convert JPG images into PDF documents for easy sharing.",
    from: "JPG",
    to: "PDF",
    icon: "📄",
    keywords: ["jpg to pdf", "convert jpg to pdf", "image to pdf"],
  },
  {
    slug: "resize-jpg",
    title: "Resize JPG",
    description: "Resize JPG images to any dimension while maintaining quality.",
    from: "JPG",
    to: "JPG",
    icon: "📐",
    keywords: ["resize jpg", "resize jpeg", "resize image"],
  },
  {
    slug: "heic-to-jpg",
    title: "HEIC to JPG",
    description: "Convert iPhone HEIC photos to JPG for universal compatibility.",
    from: "HEIC",
    to: "JPG",
    icon: "📱",
    keywords: ["heic to jpg", "convert heic to jpg", "heic to jpeg", "iphone to jpg"],
  },
  {
    slug: "image-compressor",
    title: "Image Compressor",
    description: "Compress JPG, PNG, WebP, and AVIF images without quality loss.",
    from: "IMG",
    to: "IMG",
    icon: "🗜️",
    keywords: ["image compressor", "compress image", "reduce image size", "compress jpg", "compress png", "compress webp"],
    isCompressor: true,
  },
  {
    slug: "pdf-compressor",
    title: "PDF Compressor",
    description: "Compress PDF files to reduce size while preserving quality.",
    from: "PDF",
    to: "PDF",
    icon: "📑",
    keywords: ["pdf compressor", "compress pdf", "reduce pdf size", "compress pdf online"],
    isCompressor: true,
  },
] as const;

export type ToolSlug = (typeof tools)[number]["slug"];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
