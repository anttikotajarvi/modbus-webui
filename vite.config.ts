import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type IndexHtmlTransformResult, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
    "import.meta.env.VITE_GH_PAGES": JSON.stringify(process.env.VITE_GH_PAGES ?? ""),
  },
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        customElement: true, // enable custom elements
      },
      onwarn(warning, handler) {
        if (warning.code === "custom_element_props_identifier") return;
        handler(warning);
      },
    }), // Svelte 5 compiler

    // Inject static SEO tags into <head> at build time
    createSeoHeadInjector(),

    viteSingleFile(), // inline JS & CSS → one HTML file
  ],
  build: {
    cssCodeSplit: false, // make sure CSS isn’t split out
    assetsInlineLimit: 1_000_000, // inline even large images/fonts
    sourcemap: false, // smaller output
    emptyOutDir: true,
    rollupOptions: {
      input: { app: path.resolve(__dirname, "modbus-webui.html") },
    },
  },
  server: { open: "/modbus-webui.html" },
  preview: { open: "/modbus-webui.html" },
  // keeps relative URLs working when you open the file directly
  base: "./",
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
      "@": path.resolve("./src"),
    },
  },
});

/** ---------- SEO head injector (build-time) ---------- */
function createSeoHeadInjector(): Plugin {
  return {
    name: "seo-head-injector",
    transformIndexHtml(html): IndexHtmlTransformResult {
      const SITE_URL =
        process.env.VITE_SITE_URL ||
        "https://anttikotajarvi.github.io/modbus-webui/";
      const GA_ID = process.env.VITE_GA_ID || "G-0HFN4G088N";

      // Ensure SITE_URL ends with a slash for simple concatenation
      const withSlash = SITE_URL.replace(/\/?$/, "/");
      const asset = (p: string) => `${withSlash}${p}`.replace(/([^:]\/)\/+/g, "$1");

      const tags = [
        // Canonical + icons + PWA
        { tag: "link", attrs: { rel: "canonical", href: SITE_URL } },
        { tag: "link", attrs: { rel: "icon", type: "image/svg+xml", href: asset("favicon.svg") } },
        { tag: "link", attrs: { rel: "apple-touch-icon", href: asset("icon-192.png") } },
        { tag: "link", attrs: { rel: "manifest", href: asset("manifest.webmanifest") } },

        // Core meta
        { tag: "meta", attrs: { name: "description", content: "Single-file Modbus Web UI with profiles, name tables, and shortcuts" } },
        { tag: "meta", attrs: { name: "robots", content: "index,follow" } },
        { tag: "meta", attrs: { name: "keywords", content: "modbus,webui,automation" } },
        { tag: "meta", attrs: { name: "author", content: "github.com/anttikotajarvi" } },
        { tag: "meta", attrs: { name: "theme-color", content: "#ffffff" } },

        // Open Graph
        { tag: "meta", attrs: { property: "og:site_name", content: "Modbus WebUI" } },
        { tag: "meta", attrs: { property: "og:locale", content: "en_US" } },
        { tag: "meta", attrs: { property: "og:title", content: "Modbus WebUI" } },
        { tag: "meta", attrs: { property: "og:description", content: "Single-file Modbus Web UI with profiles, name tables, and shortcuts" } },
        { tag: "meta", attrs: { property: "og:url", content: SITE_URL } },
        { tag: "meta", attrs: { property: "og:type", content: "website" } },

        // Twitter
        { tag: "meta", attrs: { name: "twitter:card", content: "summary" } },
        { tag: "meta", attrs: { name: "twitter:title", content: "Modbus WebUI" } },
        { tag: "meta", attrs: { name: "twitter:description", content: "Single-file Modbus Web UI with profiles, name tables, and shortcuts" } },
        { tag: "meta", attrs: { name: "twitter:site", content: "@anttikotajarvi" } },
        { tag: "meta", attrs: { name: "twitter:creator", content: "@anttikotajarvi" } },

        // JSON-LD
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Modbus WebUI",
            url: SITE_URL,
          }),
        },

        // Google Analytics
        { tag: "script", attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` } },
        {
          tag: "script",
          children: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `.trim(),
        },
      ];

      // Return unchanged HTML plus injected tags
      return { html, tags };
    },
  };
}
