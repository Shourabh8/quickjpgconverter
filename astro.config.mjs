// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import path from "path";

export default defineConfig({
  site: "https://quickjpgconverter.com",
  trailingSlash: "always",

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@i18n": path.resolve("./src/i18n"),
      },
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          es: "es",
          pt: "pt",
          hi: "hi",
          fr: "fr",
          de: "de",
        },
      },
      filter: (page) => {
        // Always include main tools directory
        if (page === "https://quickjpgconverter.com/tools" || page === "https://quickjpgconverter.com/tools/") return true;

        // Exclude all /tools/* subpages across all languages
        if (page.includes("/tools/")) return false;

        const excluded = [
          "/admin",
          "/404",
          "/500",
          "/blog/webp-to-jpg-converter",
          "/free-pdf-to-jpg",
          "/online-pdf-to-jpg",
          "/free-online-pdf-to-jpg",
          "/free-heic-to-jpg",
          "/image-to-jpg-converter",
          "/jpg-converter",
        ];
        return !excluded.some((path) => page.endsWith(path) || page.endsWith(path + "/") || page.includes(path + "/"));
      },
    }),
  ],
});
