// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import path from "path";

export default defineConfig({
  site: "https://quickjpgconverter.com",

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
      filter: (page) => {
        // Always include main tools directory
        if (page === "https://quickjpgconverter.com/tools" || page === "https://quickjpgconverter.com/tools/") return true;

        // Exclude English /tools/* redirect pages
        if (page.startsWith("https://quickjpgconverter.com/tools/")) return false;

        const excluded = [
          "/admin",
          "/free-heic-to-jpg",
          "/free-pdf-to-jpg",
          "/free-online-pdf-to-jpg",
          "/online-pdf-to-jpg",
          "/jpg-converter",
          "/image-to-jpg-converter",
          "/jpg-compressor",
          "/png-compressor",
          "/compress-image",
          "/compress-pdf",
          "/why",
          "/blog/webp-to-jpg-converter",
        ];
        return !excluded.some((path) => page.endsWith(path) || page.endsWith(path + "/") || page.includes(path + "/"));
      },
    }),
  ],
});
