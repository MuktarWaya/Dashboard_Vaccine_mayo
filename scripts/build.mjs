import { createRequire } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");

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

await copyFile("appsscript.json", "dist/appsscript.json");
await copyFile("src/ui/adminBaseline.html", "dist/adminBaseline.html");
