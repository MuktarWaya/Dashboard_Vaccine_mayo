import { describe, expect, it } from "vitest";

import {
  AGGREGATES_SHEET_NAME,
  AGGREGATE_HEADERS,
  CONFIG_SHEET_NAME,
  CONFIG_HEADERS,
  INGESTION_LOG_HEADERS,
  INGESTION_LOG_SHEET_NAME,
  SheetsServiceUnitSettingsRepository,
  aggregateToRow,
  configToRow,
  rowToAggregate,
  rowToConfig,
} from "../../src/infrastructure/sheetsServiceUnitSettingsRepository";

describe("sheets service unit settings repository mapping", () => {
  it("defines exact sheet headers without raw aggregate tokens", () => {
    expect(CONFIG_HEADERS).toEqual([
      "service_unit_code",
      "service_unit_name",
      "spreadsheet_id",
      "sheet_name",
      "enabled",
      "token_hash",
      "last_submitted_at",
      "last_error",
    ]);
    expect(AGGREGATE_HEADERS).toEqual([
      "report_month",
      "service_unit_code",
      "total_children",
      "on_schedule",
      "delayed",
      "refused",
      "postponed",
      "not_found",
      "followed_up",
      "submitted_at",
      "received_at",
    ]);
    expect(AGGREGATE_HEADERS).not.toContain("token");
  });

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

  it("treats human-edited FALSE values with whitespace as disabled", () => {
    expect(rowToConfig(["09941", "ตรัง", "", "รายงานรายเดือน", " FALSE "]).enabled).toBe(false);
  });

  it("restores leading zeroes when Google Sheets returns service codes as numbers", () => {
    expect(rowToConfig([9941, "ตรัง", "", "รายงานรายเดือน", "TRUE"]).serviceUnitCode).toBe("09941");
    expect(rowToAggregate(["2026-07", 9941, 1, 1, 0, 0, 0, 0, 0, "submitted", "received"]).serviceUnitCode).toBe("09941");
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

  it("provisions expected sheets and preserves non-empty sheets", () => {
    const spreadsheet = new FakeSpreadsheet([
      new FakeSheet(CONFIG_SHEET_NAME, [["existing"]]),
    ]);

    new SheetsServiceUnitSettingsRepository(
      spreadsheet as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet,
    ).provision();

    expect(spreadsheet.sheetNames()).toEqual([
      CONFIG_SHEET_NAME,
      AGGREGATES_SHEET_NAME,
      INGESTION_LOG_SHEET_NAME,
    ]);
    expect(spreadsheet.sheet(CONFIG_SHEET_NAME).values).toEqual([["existing"]]);
    expect(spreadsheet.sheet(AGGREGATES_SHEET_NAME).values).toEqual([AGGREGATE_HEADERS]);
    expect(spreadsheet.sheet(INGESTION_LOG_SHEET_NAME).values).toEqual([INGESTION_LOG_HEADERS]);
  });
});

class FakeSpreadsheet {
  private readonly sheets = new Map<string, FakeSheet>();

  constructor(initialSheets: FakeSheet[] = []) {
    for (const sheet of initialSheets) {
      this.sheets.set(sheet.name, sheet);
    }
  }

  getSheetByName(name: string): FakeSheet | null {
    return this.sheets.get(name) ?? null;
  }

  insertSheet(name: string): FakeSheet {
    const sheet = new FakeSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }

  sheet(name: string): FakeSheet {
    const sheet = this.sheets.get(name);
    if (!sheet) {
      throw new Error(`Missing fake sheet: ${name}`);
    }
    return sheet;
  }

  sheetNames(): string[] {
    return [...this.sheets.keys()];
  }
}

class FakeSheet {
  constructor(
    readonly name: string,
    readonly values: unknown[][] = [],
  ) {}

  getLastRow(): number {
    return this.values.length;
  }

  getRange(_row: number, _column: number, _numRows: number, _numColumns: number): FakeRange {
    return new FakeRange(this);
  }
}

class FakeRange {
  constructor(private readonly sheet: FakeSheet) {}

  setValues(values: unknown[][]): void {
    this.sheet.values.splice(0, values.length, ...values);
  }
}
