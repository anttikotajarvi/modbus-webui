import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        customElement: true // enable custom elements
      }
    }), // Svelte 5 compiler
    viteSingleFile() // inline JS & CSS → one HTML file
  ],
  build: {
    cssCodeSplit: false, // make sure CSS isn’t split out
    assetsInlineLimit: 1_000_000, // inline even large images/fonts
    sourcemap: false, // smaller output
    emptyOutDir: true
  },
  // keeps relative URLs working when you open the file directly
  base: './',
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      '@': path.resolve('./src')
    }
  }
});
