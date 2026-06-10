import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig, sessionDrivers } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  devToolbar: {
    enabled: false
  },
  // Project Ball stores app sessions in D1 via project_ball_session; this keeps
  // Astro's unused session layer from provisioning a Cloudflare KV namespace.
  session: {
    driver: sessionDrivers.lruCache()
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
