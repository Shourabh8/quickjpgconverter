export const site = {
  name: "Quick JPG Converter",
  domain: "quickjpgconverter.com",
  url: "https://quickjpgconverter.com",
  title: "QuickJPG — Free Online Image Converter & Compressor",
  description:
    "Convert JPG, PNG, WebP, HEIC, and PDF images instantly with our free online JPG converter. Fast, private, and browser-based — no uploads required.",
  ogImage: "/og-default.svg",
  twitter: "@quickjpgconverter",
  lang: "en",
  locale: "en_US",
  themeColor: "#3b82f6",
} as const;

export type SiteConfig = typeof site;
