import { describe, expect, it } from "vitest";

import { buildSettingsPayload } from "../../frontend/src/services/gasApi";

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
});
