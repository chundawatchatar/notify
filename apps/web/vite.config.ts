import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const uiSourcePath = fileURLToPath(new URL("../../packages/ui/src", import.meta.url));
const appSourcePath = fileURLToPath(new URL("./src", import.meta.url));
const webPort = Number(process.env.WEB_PORT ?? "3100");

export default defineConfig({
  server: {
    port: webPort,
  },
  preview: {
    port: webPort,
  },
  resolve: {
    alias: [
      {
        find: /^@notify\/ui$/,
        replacement: `${uiSourcePath}/index.ts`,
      },
      {
        find: /^@\//,
        replacement: `${appSourcePath}/`,
      },
    ],
  },
  plugins: [tanstackStart(), react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
