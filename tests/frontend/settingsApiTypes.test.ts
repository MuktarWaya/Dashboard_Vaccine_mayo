import { describe, expect, it } from "vitest";

import { buildGasGetRequest, buildSettingsPayload, generateUnitCodeGsTemplate } from "../../frontend/src/services/gasApi";

describe("frontend settings API helpers", () => {
  it("builds a settings payload without placing the admin password in query params", () => {
    const payload = buildSettingsPayload("session-1", {
      action: "getSettings",
    });

    expect(payload.method).toBe("POST");
    expect(payload.body).toContain("session-1");
    expect(payload.body).not.toContain("009941");
  });

  it("uses a CORS safelisted content type for Google Apps Script POST requests", () => {
    const payload = buildSettingsPayload("session-1", {
      action: "getSettings",
    });

    expect(payload.headers).toEqual({ "Content-Type": "text/plain;charset=utf-8" });
  });

  it("builds public dashboard GET requests without headers that trigger GAS preflight", () => {
    const request = buildGasGetRequest();

    expect(request.method).toBe("GET");
    expect(request.mode).toBe("cors");
    expect(request.headers).toBeUndefined();
  });

  it("builds a token generation request through the POST body", () => {
    const payload = buildSettingsPayload("session-1", {
      action: "generateUnitToken",
      serviceUnitCode: "09941",
    });

    expect(payload.body).toContain("generateUnitToken");
    expect(payload.body).toContain("09941");
    expect(payload.body).toContain("session-1");
  });

  it("generates unit Code.gs without child-level fields", () => {
    const code = generateUnitCodeGsTemplate({
      centralApiUrl: "https://script.google.com/macros/s/central/exec",
      serviceUnitCode: "09941",
      serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง",
      sheetName: "baseline_import_template_09941_v2",
      token: "unit-token",
    });

    expect(code).toContain("submitUnitMonthly");
    expect(code).toContain("UrlFetchApp.fetch");
    expect(code).toContain("สถานะวัคซีน");
    expect(code).not.toContain("cid");
    expect(code).not.toContain("ชื่อเด็ก");
  });
});
