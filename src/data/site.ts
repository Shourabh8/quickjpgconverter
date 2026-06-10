export const site = {
  name: "Quick JPG Converter",
  domain: "quickjpgconverter.com",
  url: "https://quickjpgconverter.com",
  title: "Quick JPG Converter — Free Online Image Format Conversion",
  description:
    "Convert JPG, PNG, WebP, HEIC, and PDF images instantly with our free online JPG converter. Fast, private, and browser-based — no uploads required.",
  ogImage: "/og-default.svg",
  twitter: "@quickjpgconverter",
  lang: "en",
  locale: "en_US",
  themeColor: "#3366ff",
} as const;

export type SiteConfig = typeof site;
