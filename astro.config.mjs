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
      filter: (page) => !page.includes("/admin"),
    }),
  ],
});
