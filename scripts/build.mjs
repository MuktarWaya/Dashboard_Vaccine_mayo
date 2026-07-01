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
  footer: {
    js: `
function doGet(event) { return globalThis.doGet(event); }
function doPost(event) { return globalThis.doPost(event); }
function provisionBaselineTables() { return globalThis.provisionBaselineTables(); }
function stageBaselineRows(serviceUnitCode, headers, rows) { return globalThis.stageBaselineRows(serviceUnitCode, headers, rows); }
function approveBaselineBatch(batchId) { return globalThis.approveBaselineBatch(batchId); }
function confirmBaselineBatch(batchId) { return globalThis.confirmBaselineBatch(batchId); }
function getBaselineAdminModel() { return globalThis.getBaselineAdminModel(); }
function getPublicDashboardModel() { return globalThis.getPublicDashboardModel(); }
function getVaccineMonthlyPublicDashboard(reportMonth) { return globalThis.getVaccineMonthlyPublicDashboard(reportMonth); }
function getVaccineMonthlyAdminData(reportMonth) { return globalThis.getVaccineMonthlyAdminData(reportMonth); }
function fetchVaccineMonthlyData(event) { return globalThis.fetchVaccineMonthlyData(event); }
function adminLogin(password) { return globalThis.adminLogin(password); }
function getSettings(sessionToken) { return globalThis.getSettings(sessionToken); }
function saveSettings(sessionToken, settings) { return globalThis.saveSettings(sessionToken, settings); }
function testUnitConnection(sessionToken, serviceUnitCode) { return globalThis.testUnitConnection(sessionToken, serviceUnitCode); }
function generateUnitToken(sessionToken, serviceUnitCode) { return globalThis.generateUnitToken(sessionToken, serviceUnitCode); }
function submitUnitMonthly(payload) { return globalThis.submitUnitMonthly(payload); }
`,
  },
});

await copyFile(manifestPath, "dist/appsscript.json");
await copyFile("src/ui/adminBaseline.html", "dist/adminBaseline.html");
await copyFile("src/ui/publicDashboard.html", "dist/publicDashboard.html");
