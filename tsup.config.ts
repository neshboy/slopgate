import { defineConfig } from "tsup";

// Both entrypoints are bundled fully (no external deps left unbundled) so
// dist/ is standalone: the GitHub Action runtime does not run `npm install`,
// it just executes dist/action.cjs directly, and the CLI should work the
// same way if someone runs `node dist/cli.cjs` without node_modules present.
export default defineConfig([
  {
    entry: { action: "src/action.ts" },
    format: ["cjs"],
    outDir: "dist",
    outExtension: () => ({ js: ".cjs" }),
    target: "node20",
    platform: "node",
    clean: true,
    splitting: false,
    sourcemap: false,
    minify: false,
    noExternal: [/.*/],
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["cjs"],
    outDir: "dist",
    outExtension: () => ({ js: ".cjs" }),
    target: "node20",
    platform: "node",
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: false,
    noExternal: [/.*/],
    banner: { js: "#!/usr/bin/env node" },
  },
]);
