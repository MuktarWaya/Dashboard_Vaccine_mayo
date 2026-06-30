import { describe, expect, it } from "vitest";

import {
  CONFIG_HEADERS,
  aggregateToRow,
  configToRow,
  rowToAggregate,
  rowToConfig,
} from "../../src/infrastructure/sheetsServiceUnitSettingsRepository";

describe("sheets service unit settings repository mapping", () => {
  it("maps service-unit config rows without exposing raw token values", () => {
    const row = configToRow({
      serviceUnitCode: "09941",
      serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง",
      spreadsheetId: "spreadsheet-1",
      sheetName: "รายงานรายเดือน",
      enabled: true,
      tokenHash: "hash-1",
      lastSubmittedAt: "2026-06-30T10:00:00+07:00",
      lastError: "",
    });

    expect(CONFIG_HEADERS).toContain("token_hash");
    expect(row).not.toContain("unit-token");
    expect(rowToConfig(row)).toEqual({
      serviceUnitCode: "09941",
      serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง",
      spreadsheetId: "spreadsheet-1",
      sheetName: "รายงานรายเดือน",
      enabled: true,
      tokenHash: "hash-1",
      lastSubmittedAt: "2026-06-30T10:00:00+07:00",
      lastError: "",
    });
  });

  it("maps monthly aggregate rows", () => {
    const aggregate = {
      serviceUnitCode: "09941",
      reportMonth: "2026-06",
      totalChildren: 120,
      onSchedule: 100,
      delayed: 12,
      refused: 3,
      postponed: 0,
      notFound: 5,
      followedUp: 0,
      submittedAt: "2026-06-30T10:00:00+07:00",
      token: "unit-token",
      receivedAt: "2026-06-30T10:01:00+07:00",
    };

    const row = aggregateToRow(aggregate);

    expect(row).not.toContain("unit-token");
    expect(rowToAggregate(row)).toEqual({
      ...aggregate,
      token: "",
    });
  });
});
