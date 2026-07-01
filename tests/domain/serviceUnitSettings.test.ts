import { describe, expect, it } from "vitest";

import {
  ADMIN_PASSWORD_PROPERTY,
  DEFAULT_ADMIN_PASSWORD,
  CANONICAL_SERVICE_UNITS,
  DEFAULT_MONTHLY_SHEET_NAME,
  createAdminSession,
  serviceUnitByCode,
  verifyAdminPassword,
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

  it("validates the initial admin password server-side", () => {
    expect(DEFAULT_ADMIN_PASSWORD).toBe("009941");
    expect(ADMIN_PASSWORD_PROPERTY).toBe("DASHBOARD_ADMIN_PASSWORD");
    expect(verifyAdminPassword("009941", undefined)).toBe(true);
    expect(verifyAdminPassword("bad", undefined)).toBe(false);
    expect(verifyAdminPassword("secret", "secret")).toBe(true);
  });

  it("creates short-lived opaque admin sessions", () => {
    const session = createAdminSession("2026-06-30T10:00:00+07:00", () => "uuid-1");
    expect(session.sessionToken).toBe("uuid-1");
    expect(session.expiresInSeconds).toBe(1800);
  });
});
