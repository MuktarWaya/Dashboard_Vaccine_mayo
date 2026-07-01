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
});
