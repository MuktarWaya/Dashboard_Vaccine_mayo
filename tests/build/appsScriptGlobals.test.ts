import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Apps Script bundle globals", () => {
  it("emits web app handlers as top-level functions Apps Script can discover", () => {
    const bundle = readFileSync("dist/Code.js", "utf8");

    expect(bundle).toMatch(/^function doGet\(event\)/m);
    expect(bundle).toMatch(/^function doPost\(event\)/m);
    expect(bundle).toMatch(/^function generateUnitToken\(sessionToken, serviceUnitCode\)/m);
  });
});
