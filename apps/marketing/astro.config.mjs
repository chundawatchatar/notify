// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const marketingPort = Number(process.env.MARKETING_PORT ?? "3200");

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  server: {
    port: marketingPort,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
