import { describe, expect, it } from "vitest";

import { BASELINE_HEADERS } from "../../src/domain/baseline";
// @ts-expect-error Vitest/Vite loads this Apps Script helper as text for structural checks.
import code from "../../tools/baseline-dry-run/Code.gs?raw";

describe("baseline dry-run Apps Script helper", () => {
  it("keeps the sheet template aligned with BASELINE_HEADERS", () => {
    BASELINE_HEADERS.forEach((header) => {
      expect(code).toContain(`"${header}"`);
    });
  });

  it("preconfigures the dry-run service unit for Trang health promoting hospital", () => {
    expect(code).toContain('SERVICE_UNIT_CODE: "09941"');
    expect(code).toContain('SERVICE_UNIT_NAME: "รพ.สต.ตรัง"');
  });

  it("does not create registry or staging records outside the controlled importer", () => {
    expect(code).not.toContain("CHILD_REGISTRY");
    expect(code).not.toContain("BASELINE_STAGING");
    expect(code).not.toContain("BASELINE_BATCHES");
  });
});
