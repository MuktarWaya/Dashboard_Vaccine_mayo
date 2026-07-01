import { describe, expect, it } from "vitest";

import { applicationInfo, routeDashboardApiAction } from "../../src/main";

describe("service unit API routing", () => {
  it("advertises service unit aggregate ingestion capability", () => {
    expect(applicationInfo()).toMatchObject({
      application: "Dashboard Vaccine",
      capability: "baseline-registry",
    });
  });

  it("routes known dashboard API actions", () => {
    expect(routeDashboardApiAction({ action: "publicDashboard" })).toBe("publicDashboard");
    expect(routeDashboardApiAction({ action: "adminLogin" })).toBe("adminLogin");
    expect(routeDashboardApiAction({ action: "getSettings" })).toBe("getSettings");
    expect(routeDashboardApiAction({ action: "saveSettings" })).toBe("saveSettings");
    expect(routeDashboardApiAction({ action: "testUnitConnection" })).toBe("testUnitConnection");
    expect(routeDashboardApiAction({ action: "generateUnitToken" })).toBe("generateUnitToken");
    expect(routeDashboardApiAction({ action: "submitUnitMonthly" })).toBe("submitUnitMonthly");
  });

  it("defaults legacy fetch action to public dashboard compatibility", () => {
    expect(routeDashboardApiAction({ action: "fetch" })).toBe("publicDashboard");
    expect(routeDashboardApiAction({})).toBe("publicDashboard");
  });
});
