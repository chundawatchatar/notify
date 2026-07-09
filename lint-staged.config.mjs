import path from "node:path";

const biomeFiles = "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx,json,jsonc,css}";
const sourceFiles = "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx,json,jsonc,css,md,mdx,yml,yaml}";
const scriptFiles = "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}";
const elixirFiles = "*.{ex,exs}";
const generatedFiles = ["/src/routeTree.gen.ts"];
const elixirProjects = ["apps/api", "libs/domain"];

const quote = (file) => JSON.stringify(file);
const withoutGeneratedFiles = (files) =>
  files.filter((file) => !generatedFiles.some((generatedFile) => file.endsWith(generatedFile)));
const runOnSourceFiles = (command) => (files) => {
  const filteredFiles = withoutGeneratedFiles(files);

  return filteredFiles.length > 0 ? `${command} ${filteredFiles.map(quote).join(" ")}` : [];
};
const runElixirFormat = (files) => {
  const workspaceRoot = process.cwd();
  const relativeFiles = files.map((file) => path.relative(workspaceRoot, file));

  return elixirProjects.flatMap((projectRoot) => {
    const projectFiles = relativeFiles
      .filter(
        (file) =>
          file === `${projectRoot}/mix.exs` ||
          file.startsWith(`${projectRoot}/lib/`) ||
          file.startsWith(`${projectRoot}/test/`),
      )
      .map((file) => path.relative(projectRoot, file));

    return projectFiles.length > 0
      ? [`cd ${quote(projectRoot)} && mix format ${projectFiles.map(quote).join(" ")}`]
      : [];
  });
};

export default {
  [biomeFiles]: runOnSourceFiles("biome check --write --files-ignore-unknown=true"),
  [sourceFiles]: runOnSourceFiles("oxfmt --write --no-error-on-unmatched-pattern"),
  [scriptFiles]: runOnSourceFiles("oxlint --no-error-on-unmatched-pattern"),
  [elixirFiles]: runElixirFormat,
};
