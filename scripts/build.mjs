import { createRequire } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const manifestFlagIndex = process.argv.indexOf("--manifest");
const manifestPath =
  manifestFlagIndex === -1 ? "appsscript.json" : process.argv[manifestFlagIndex + 1];

if (!manifestPath) {
  throw new Error("Missing manifest path after --manifest");
}

await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/Code.js",
  bundle: true,
  format: "iife",
  target: "es2020",
  banner: {
    js: "// Dashboard Vaccine Apps Script bundle",
  },
});

await copyFile(manifestPath, "dist/appsscript.json");
await copyFile("src/ui/adminBaseline.html", "dist/adminBaseline.html");
await copyFile("src/ui/publicDashboard.html", "dist/publicDashboard.html");
