import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type IndexHtmlTransformResult, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import pkg from "./package.json" with { type: "json" };

const isDeployment = Boolean(process.env.VITE_GH_PAGES);
const siteURL = "https://modbuswebui.dev/"
const githubURL = "https://github.com/anttikotajarvi/modbus-webui";

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
    isDeployment ? createSeoHeadInjector() : null,
    
    createHtmlTokenReplace({ // This is mainly used for the footer.
      APP_VERSION: pkg.version,
      SITE_URL: siteURL,
      GITHUB_URL: githubURL
    }),
    

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

// SEO head injector (build-time)
// SEO head injector (build-time)
function createSeoHeadInjector(): Plugin {
  return {
    name: "seo-head-injector",
    transformIndexHtml(html): IndexHtmlTransformResult {
      const SITE_URL = process.env.VITE_SITE_URL || siteURL;

      // Content strings (Option 1: add technical keywords)
      const DESC =
        "Browser-based Modbus RTU client over RS-485 via Web Serial (USB-to-RS485). Profiles, name tables, and write shortcuts.";
      const KEYWORDS =
        "modbus,modbus rtu,rs-485,rs485,web serial,usb-to-rs485,serial,modbus client,modbus master,automation";

      const GA_ID = process.env.VITE_GA_ID || "G-0HFN4G088N";

      // Ensure SITE_URL ends with a slash for simple concatenation
      const withSlash = SITE_URL.replace(/\/?$/, "/");
      const asset = (p: string) => `${withSlash}${p}`.replace(/([^:]\/)\/+/g, "$1");

      // Single social image you provide
      const OG_IMAGE = asset("og-1200-630.png");

      const tags = [
        // Canonical + icons + PWA
        { tag: "link", attrs: { rel: "canonical", href: SITE_URL } },
        { tag: "link", attrs: { rel: "icon", type: "image/svg+xml", href: asset("favicon.svg") } },
        { tag: "link", attrs: { rel: "apple-touch-icon", href: asset("icon-192.png") } },
        { tag: "link", attrs: { rel: "manifest", href: asset("manifest.webmanifest") } },

        // Core meta (with stronger robots + technical keywords)
        { tag: "meta", attrs: { name: "description", content: DESC } },
        { tag: "meta", attrs: { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" } },
        { tag: "meta", attrs: { name: "keywords", content: KEYWORDS } },
        { tag: "meta", attrs: { name: "author", content: "github.com/anttikotajarvi" } },
        { tag: "meta", attrs: { name: "theme-color", content: "#ffffff" } },

        // Open Graph
        { tag: "meta", attrs: { property: "og:site_name", content: "Modbus WebUI" } },
        { tag: "meta", attrs: { property: "og:locale", content: "en_US" } },
        { tag: "meta", attrs: { property: "og:title", content: "Modbus WebUI – Modbus RTU/RS-485 in the browser" } },
        { tag: "meta", attrs: { property: "og:description", content: DESC } },
        { tag: "meta", attrs: { property: "og:url", content: SITE_URL } },
        { tag: "meta", attrs: { property: "og:type", content: "website" } },
        // OG image
        { tag: "meta", attrs: { property: "og:image", content: OG_IMAGE } },
        { tag: "meta", attrs: { property: "og:image:secure_url", content: OG_IMAGE } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:type", content: "image/png" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: "Modbus WebUI — browser-based Modbus RTU client over RS-485" } },

        // Twitter
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        { tag: "meta", attrs: { name: "twitter:title", content: "Modbus WebUI – Modbus RTU/RS-485 in the browser" } },
        { tag: "meta", attrs: { name: "twitter:description", content: DESC } },
        { tag: "meta", attrs: { name: "twitter:image", content: OG_IMAGE } },
        { tag: "meta", attrs: { name: "twitter:site", content: "@anttikotajarvi" } },
        { tag: "meta", attrs: { name: "twitter:creator", content: "@anttikotajarvi" } },

        // JSON-LD (WebSite) with keywords
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Modbus WebUI",
            url: SITE_URL,
            keywords: KEYWORDS
          }),
        },

        // JSON-LD (SoftwareApplication) with keywords
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Modbus WebUI",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: SITE_URL,
            softwareVersion: process.env.npm_package_version || "1.0.0",
            keywords: KEYWORDS
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



/**
 * Replace %TOKENS% inside index.html at build time.
 * Usage: createHtmlTokenReplace({ APP_VERSION: "1.0.2" })
 * By default it looks for %KEY% (e.g., %APP_VERSION%), but you can change the delimiters.
 */
function createHtmlTokenReplace(
  tokens: Record<string, string>,
  opts: { delimStart?: string; delimEnd?: string } = {}
): Plugin {
  const { delimStart = "%", delimEnd = "%" } = opts;

  // Escape for RegExp
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Build a single regex like /%(APP_VERSION|SITE_URL)%/g
  const keys = Object.keys(tokens);
  const pattern =
    keys.length > 0
      ? new RegExp(
          `${esc(delimStart)}(${keys.map(esc).join("|")})${esc(delimEnd)}`,
          "g"
        )
      : null;

  return {
    name: "html-token-replace",
    apply: "build",
    transformIndexHtml(html) {
      if (!pattern) return html;
      return html.replace(pattern, (_m, key: string) => tokens[key] ?? _m);
    },
  };
}