export function applicationInfo() {
  return {
    application: "Dashboard Vaccine",
    capability: "baseline-registry",
    version: "0.1.0",
  } as const;
}

function doGet() {
  return HtmlService.createHtmlOutput("Dashboard Vaccine baseline registry");
}

Object.assign(globalThis, { doGet });
