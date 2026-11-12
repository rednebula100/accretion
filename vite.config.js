import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
// The whole game ships as ONE self-contained index.html (scripts, shader, fonts and the matter atlas inlined).
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  server: { port: 4173, strictPort: true },
  build: { target: "es2022", chunkSizeWarningLimit: 4000, assetsInlineLimit: 100000000, cssCodeSplit: false },
});
