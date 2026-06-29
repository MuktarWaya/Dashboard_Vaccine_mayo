import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  applicationInfo,
  DEFAULT_DASHBOARD_SPREADSHEET_ID,
  DASHBOARD_SPREADSHEET_ID_PROPERTY,
  DISTRICT_SERVICE_UNIT_TOTAL,
  publicDashboardPageForRequest,
} from "../src/main";

describe("Dashboard Vaccine scaffold", () => {
  it("identifies the baseline registry capability", () => {
    expect(applicationInfo()).toEqual({
      application: "Dashboard Vaccine",
      capability: "baseline-registry",
      version: "0.1.0",
    });
  });

  it("keeps baseline coverage denominator district-wide during one-unit dry runs", () => {
    expect(DISTRICT_SERVICE_UNIT_TOTAL).toBe(14);
  });

  it("targets the configured shared Google Sheet datastore", () => {
    expect(DEFAULT_DASHBOARD_SPREADSHEET_ID).toBe("1H4ShB4fZCHt22J8coGXHn1KDgykjrxi3TueJDJ9ZoA8");
    expect(DASHBOARD_SPREADSHEET_ID_PROPERTY).toBe("DASHBOARD_VACCINE_SPREADSHEET_ID");
  });

  it("opens the public dashboard by default and routes staff explicitly", () => {
    expect(publicDashboardPageForRequest()).toBe("publicDashboard");
    expect(publicDashboardPageForRequest({ parameter: {} })).toBe("publicDashboard");
    expect(publicDashboardPageForRequest({ parameter: { page: "staff" } })).toBe("adminBaseline");
  });

  it("configures the default manifest for public aggregate access", () => {
    const manifest = JSON.parse(readFileSync("appsscript.json", "utf8")) as {
      webapp: { executeAs: string; access: string };
    };

    expect(manifest.webapp).toEqual({
      executeAs: "USER_DEPLOYING",
      access: "ANYONE_ANONYMOUS",
    });
  });

  it("keeps a separate staff manifest for organizational login", () => {
    const manifest = JSON.parse(readFileSync("appsscript.staff.json", "utf8")) as {
      webapp: { executeAs: string; access: string };
    };

    expect(manifest.webapp).toEqual({
      executeAs: "USER_ACCESSING",
      access: "DOMAIN",
    });
  });

  it("keeps public and staff push commands on matching build targets", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["push:public"]).toBe("npm run build && clasp -P .clasp.public.json push");
    expect(packageJson.scripts["push:staff"]).toBe("npm run build:staff && clasp -P .clasp.staff.json push");
    expect(packageJson.scripts.push).toBe("npm run push:public");
  });
});
