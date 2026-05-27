import { describe, expect, it } from "vitest";

import { applicationInfo } from "../src/main";

describe("Dashboard Vaccine scaffold", () => {
  it("identifies the baseline registry capability", () => {
    expect(applicationInfo()).toEqual({
      application: "Dashboard Vaccine",
      capability: "baseline-registry",
      version: "0.1.0",
    });
  });
});
