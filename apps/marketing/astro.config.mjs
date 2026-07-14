// @ts-check
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const marketingPort = Number(process.env.MARKETING_PORT ?? "3200");

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  publicDir: fileURLToPath(new URL("../../packages/ui/src/assets", import.meta.url)),
  server: {
    port: marketingPort,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
