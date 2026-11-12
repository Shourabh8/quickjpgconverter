// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import path from "path";
import { isExcludedRoute } from "./src/data/seoExclusions.mjs";

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
        if (page === "https://quickjpgconverter.com/tools" || page === "https://quickjpgconverter.com/tools/") return true;
        return !isExcludedRoute(page);
      },
    }),
  ],
});
