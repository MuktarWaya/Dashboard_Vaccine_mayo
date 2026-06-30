import { describe, expect, it } from "vitest";

import {
  CANONICAL_SERVICE_UNITS,
  DEFAULT_MONTHLY_SHEET_NAME,
  serviceUnitByCode,
} from "../../src/domain/serviceUnitSettings";

describe("service unit settings domain", () => {
  it("defines the canonical 13 รพ.สต. plus 1 PCU service-unit list", () => {
    expect(CANONICAL_SERVICE_UNITS).toHaveLength(14);
    expect(CANONICAL_SERVICE_UNITS.map((unit) => unit.serviceUnitCode)).toEqual([
      "09940",
      "09941",
      "09942",
      "09943",
      "09944",
      "09945",
      "09946",
      "09947",
      "09948",
      "09949",
      "09950",
      "09951",
      "41083",
      "77483",
    ]);
    expect(serviceUnitByCode("09941")?.serviceUnitName).toBe("โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง");
    expect(serviceUnitByCode("77483")?.serviceUnitName).toBe("ศูนย์สุขภาพชุมชนตำบลมายอ");
    expect(DEFAULT_MONTHLY_SHEET_NAME).toBe("รายงานรายเดือน");
  });

  it("does not include old prototype service units", () => {
    expect(serviceUnitByCode("09954")).toBeUndefined();
    expect(CANONICAL_SERVICE_UNITS.map((unit) => unit.serviceUnitName).join("|")).not.toContain("โคกโต๊ะ");
  });
});
