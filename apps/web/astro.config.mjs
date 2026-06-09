import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  devToolbar: {
    enabled: false
  },
  output: "server",
  adapter: cloudflare({
    imageService: "compile"
  }),
  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: true
    },
    optimizeDeps: {
      exclude: ["viem", "astro:transitions", "astro/virtual-modules/transitions.js"]
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@project-ball/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
      }
    },
    ssr: {
      noExternal: ["viem"]
    }
  }
});
