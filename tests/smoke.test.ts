import { describe, expect, it } from "vitest";

import { applicationInfo, DISTRICT_SERVICE_UNIT_TOTAL } from "../src/main";

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
});
