import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const external = [
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-slot",
  "@radix-ui/react-tabs",
  "class-variance-authority",
  "clsx",
  "lucide-react",
  "next-themes",
  "react",
  "react-dom",
  "react/jsx-runtime",
  "sonner",
  "tailwind-merge",
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      entryRoot: "src",
      exclude: ["src/test/**"],
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external,
    },
  },
  test: {
    coverage: {
      exclude: ["dist/**", "src/**/*.test.{ts,tsx}", "src/test/**", "vite.config.ts"],
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
    },
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
