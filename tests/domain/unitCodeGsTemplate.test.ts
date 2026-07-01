import { describe, expect, it } from "vitest";

import { generateUnitCodeGsTemplate } from "../../src/templates/unitCodeGsTemplate";

describe("unit Code.gs template", () => {
  it("generates a bound script for one service unit", () => {
    const code = generateUnitCodeGsTemplate({
      centralApiUrl: "https://script.google.com/macros/s/central/exec",
      serviceUnitCode: "09941",
      serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง",
      sheetName: "รายงานรายเดือน",
      token: "unit-token",
    });

    expect(code).toContain("Dashboard Vaccine");
    expect(code).toContain("09941");
    expect(code).toContain("โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง");
    expect(code).toContain("submitUnitMonthly");
    expect(code).toContain("UrlFetchApp.fetch");
    expect(code).not.toContain("cid");
    expect(code).not.toContain("ชื่อเด็ก");
  });
});
