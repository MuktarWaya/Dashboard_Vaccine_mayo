import type { BaselineBatch } from "../domain/baseline";
import type { BaselineRepository } from "../features/baseline/baselineService";

export const TABLES = {
  CFG_SERVICE_UNITS: "CFG_SERVICE_UNITS",
  CFG_BASELINE_USERS: "CFG_BASELINE_USERS",
  BASELINE_BATCHES: "BASELINE_BATCHES",
  BASELINE_STAGING: "BASELINE_STAGING",
  CHILD_REGISTRY: "CHILD_REGISTRY",
} as const;

const BATCH_HEADERS = [
  "batch_id",
  "service_unit_code",
  "state",
  "row_count",
  "issues_json",
  "staged_by",
  "staged_at",
  "approved_by",
  "approved_at",
  "confirmed_by",
  "confirmed_at",
] as const;

export function baselineBatchToRow(batch: BaselineBatch): unknown[] {
  return [
    batch.batchId,
    batch.serviceUnitCode,
    batch.state,
    batch.rowCount,
    JSON.stringify(batch.issues),
    batch.stagedBy,
    batch.stagedAt,
    batch.approvedBy ?? "",
    batch.approvedAt ?? "",
    batch.confirmedBy ?? "",
    batch.confirmedAt ?? "",
  ];
}

export function baselineRowToBatch(row: unknown[]): BaselineBatch {
  const batch: BaselineBatch = {
    batchId: String(row[0]),
    serviceUnitCode: String(row[1]),
    state: String(row[2]) as BaselineBatch["state"],
    rowCount: Number(row[3]),
    issues: JSON.parse(String(row[4] || "[]")) as BaselineBatch["issues"],
    stagedBy: String(row[5]),
    stagedAt: String(row[6]),
  };

  if (row[7]) {
    batch.approvedBy = String(row[7]);
  }
  if (row[8]) {
    batch.approvedAt = String(row[8]);
  }
  if (row[9]) {
    batch.confirmedBy = String(row[9]);
  }
  if (row[10]) {
    batch.confirmedAt = String(row[10]);
  }

  return batch;
}

export function approvedRegistryRows(batchId: string, stagedRows: unknown[][]): unknown[][] {
  return stagedRows.filter((row) => String(row[0]) === batchId);
}

export class SheetsBaselineRepository implements BaselineRepository {
  constructor(private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {}

  provision(): void {
    this.ensureSheet(TABLES.BASELINE_BATCHES, [...BATCH_HEADERS]);
    this.ensureSheet(TABLES.BASELINE_STAGING, ["batch_id", "cid", "service_unit_code", "record_json"]);
    this.ensureSheet(TABLES.CHILD_REGISTRY, ["approved_batch_id", "cid", "service_unit_code", "record_json"]);
    this.ensureSheet(TABLES.CFG_SERVICE_UNITS, ["service_unit_code", "service_unit_name", "active"]);
    this.ensureSheet(TABLES.CFG_BASELINE_USERS, ["email", "baseline_role", "service_unit_code", "active"]);
  }

  saveBatch(batch: BaselineBatch): void {
    const sheet = this.batchSheet();
    if (this.findBatchRowNumber(sheet, batch.batchId)) {
      throw new Error("Duplicate baseline batch");
    }

    sheet.appendRow(baselineBatchToRow(batch));
  }

  updateBatch(batch: BaselineBatch): void {
    const sheet = this.batchSheet();
    const rowNumber = this.findBatchRowNumber(sheet, batch.batchId);

    if (!rowNumber) {
      throw new Error("Unknown baseline batch");
    }

    sheet.getRange(rowNumber, 1, 1, BATCH_HEADERS.length).setValues([baselineBatchToRow(batch)]);
  }

  getBatch(id: string): BaselineBatch | undefined {
    return this.listBatches().find((batch) => batch.batchId === id);
  }

  listBatches(): BaselineBatch[] {
    const sheet = this.batchSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    return sheet
      .getRange(2, 1, lastRow - 1, BATCH_HEADERS.length)
      .getValues()
      .map((row) => baselineRowToBatch(row));
  }

  saveStagedRecords(batchId: string, rows: unknown[][]): void {
    if (rows.length === 0) {
      return;
    }

    const sheet = this.spreadsheet.getSheetByName(TABLES.BASELINE_STAGING);
    if (!sheet) {
      throw new Error("Baseline tables are not provisioned");
    }

    const stagedRows = rows.map((row) => [batchId, row[0], row[1], JSON.stringify(row)]);
    sheet.getRange(sheet.getLastRow() + 1, 1, stagedRows.length, 4).setValues(stagedRows);
  }

  promoteApprovedRecords(batchId: string): void {
    const staging = this.spreadsheet.getSheetByName(TABLES.BASELINE_STAGING);
    const registry = this.spreadsheet.getSheetByName(TABLES.CHILD_REGISTRY);
    if (!staging || !registry) {
      throw new Error("Baseline tables are not provisioned");
    }

    if (this.hasRegistryRows(registry, batchId)) {
      return;
    }

    const lastRow = staging.getLastRow();
    const stagedRows = lastRow < 2 ? [] : staging.getRange(2, 1, lastRow - 1, 4).getValues();
    const approvedRows = approvedRegistryRows(batchId, stagedRows);

    if (approvedRows.length === 0) {
      throw new Error("No staged records for approved batch");
    }

    registry.getRange(registry.getLastRow() + 1, 1, approvedRows.length, 4).setValues(approvedRows);
  }

  getApprovedServiceUnitCodes(): Set<string> {
    const sheet = this.spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS);
    if (!sheet) {
      throw new Error("Service unit configuration is missing");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return new Set();
    }

    return new Set(
      sheet
        .getRange(2, 1, lastRow - 1, 3)
        .getValues()
        .filter((row) => String(row[2]).trim().toUpperCase() === "TRUE")
        .map((row) => String(row[0]).trim()),
    );
  }

  private batchSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = this.spreadsheet.getSheetByName(TABLES.BASELINE_BATCHES);
    if (!sheet) {
      throw new Error("Baseline tables are not provisioned");
    }

    return sheet;
  }

  private ensureSheet(name: string, headers: string[]): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = this.spreadsheet.getSheetByName(name) ?? this.spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  private findBatchRowNumber(sheet: GoogleAppsScript.Spreadsheet.Sheet, batchId: string): number | undefined {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return undefined;
    }

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const index = ids.findIndex((row) => String(row[0]) === batchId);
    return index === -1 ? undefined : index + 2;
  }

  private hasRegistryRows(sheet: GoogleAppsScript.Spreadsheet.Sheet, batchId: string): boolean {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return false;
    }

    return sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getValues()
      .some((row) => String(row[0]) === batchId);
  }
}
