import { fileURLToPath, URL } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (config) => {
    const uiSourcePath = fileURLToPath(new URL("../../../packages/ui/src", import.meta.url));
    const existingAliases = Array.isArray(config.resolve?.alias)
      ? config.resolve.alias
      : Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({
          find,
          replacement,
        }));
    const plugins = config.plugins?.filter((plugin) => {
      if (!plugin || Array.isArray(plugin)) {
        return true;
      }

      return plugin.name !== "unplugin-dts";
    });

    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: [
          ...existingAliases,
          {
            find: /^@notify\/ui$/,
            replacement: `${uiSourcePath}/index.ts`,
          },
          {
            find: /^@\//,
            replacement: `${uiSourcePath}/`,
          },
        ],
      },
      plugins: [...(plugins ?? []), tailwindcss()],
    };
  },
};

export default config;
