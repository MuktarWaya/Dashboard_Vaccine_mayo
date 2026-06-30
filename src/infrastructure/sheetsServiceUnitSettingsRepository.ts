import type { ServiceUnitSetting } from "../domain/serviceUnitSettings";
import type { MonthlyUnitAggregate } from "../domain/unitAggregate";

export const CONFIG_SHEET_NAME = "CONFIG_SERVICE_UNITS";
export const AGGREGATES_SHEET_NAME = "MONTHLY_UNIT_AGGREGATES";
export const INGESTION_LOG_SHEET_NAME = "INGESTION_LOG";

export const CONFIG_HEADERS = [
  "service_unit_code",
  "service_unit_name",
  "spreadsheet_id",
  "sheet_name",
  "enabled",
  "token_hash",
  "last_submitted_at",
  "last_error",
] as const;

export const AGGREGATE_HEADERS = [
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
] as const;

export const INGESTION_LOG_HEADERS = ["at", "event", "service_unit_code", "report_month", "message"] as const;

export function configToRow(config: ServiceUnitSetting): string[] {
  return [
    config.serviceUnitCode,
    config.serviceUnitName,
    config.spreadsheetId,
    config.sheetName,
    config.enabled ? "TRUE" : "FALSE",
    config.tokenHash ?? "",
    config.lastSubmittedAt ?? "",
    config.lastError ?? "",
  ];
}

export function rowToConfig(row: readonly unknown[]): ServiceUnitSetting {
  return {
    serviceUnitCode: String(row[0] ?? ""),
    serviceUnitName: String(row[1] ?? ""),
    spreadsheetId: String(row[2] ?? ""),
    sheetName: String(row[3] ?? ""),
    enabled: String(row[4] ?? "").toUpperCase() !== "FALSE",
    tokenHash: String(row[5] ?? ""),
    lastSubmittedAt: String(row[6] ?? ""),
    lastError: String(row[7] ?? ""),
  };
}

export function aggregateToRow(aggregate: MonthlyUnitAggregate): string[] {
  return [
    aggregate.reportMonth,
    aggregate.serviceUnitCode,
    String(aggregate.totalChildren),
    String(aggregate.onSchedule),
    String(aggregate.delayed),
    String(aggregate.refused),
    String(aggregate.postponed),
    String(aggregate.notFound),
    String(aggregate.followedUp),
    aggregate.submittedAt,
    aggregate.receivedAt,
  ];
}

export function rowToAggregate(row: readonly unknown[]): MonthlyUnitAggregate {
  return {
    reportMonth: String(row[0] ?? ""),
    serviceUnitCode: String(row[1] ?? ""),
    totalChildren: Number(row[2] ?? 0),
    onSchedule: Number(row[3] ?? 0),
    delayed: Number(row[4] ?? 0),
    refused: Number(row[5] ?? 0),
    postponed: Number(row[6] ?? 0),
    notFound: Number(row[7] ?? 0),
    followedUp: Number(row[8] ?? 0),
    submittedAt: String(row[9] ?? ""),
    token: "",
    receivedAt: String(row[10] ?? ""),
  };
}

export class SheetsServiceUnitSettingsRepository {
  constructor(private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {}

  provision(): void {
    this.ensureSheet(CONFIG_SHEET_NAME, CONFIG_HEADERS);
    this.ensureSheet(AGGREGATES_SHEET_NAME, AGGREGATE_HEADERS);
    this.ensureSheet(INGESTION_LOG_SHEET_NAME, INGESTION_LOG_HEADERS);
  }

  private ensureSheet(name: string, headers: readonly string[]): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = this.spreadsheet.getSheetByName(name) ?? this.spreadsheet.insertSheet(name);

    if (sheet.getLastRow() === 0 && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    return sheet;
  }
}
