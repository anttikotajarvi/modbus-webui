import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import pkg from "./package.json" assert { type: "json" };

export default defineConfig({
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version) },
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
