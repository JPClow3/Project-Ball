import { fileURLToPath } from "node:url";
import node from "@astrojs/node";
import { defineConfig, sessionDrivers } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  devToolbar: {
    enabled: false
  },
  session: {
    driver: sessionDrivers.lruCache()
  },
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: true
    },
    optimizeDeps: {
      exclude: ["viem", "astro:transitions", "astro/virtual-modules/transitions.js", "@project-ball/shared"]
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
