import { SheetsBaselineRepository } from "./infrastructure/sheetsBaselineRepository";

export function applicationInfo() {
  return { application: "Dashboard Vaccine", capability: "baseline-registry", version: "0.1.0" } as const;
}

function provisionBaselineTables(): { status: string } {
  const repository = new SheetsBaselineRepository(SpreadsheetApp.getActive());
  repository.provision();
  return { status: "BASELINE_TABLES_READY" };
}

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutput("Dashboard Vaccine baseline registry");
}

Object.assign(globalThis, { doGet, provisionBaselineTables });
