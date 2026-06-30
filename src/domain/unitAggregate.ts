import { CANONICAL_SERVICE_UNITS, serviceUnitByCode } from "./serviceUnitSettings";
import type { PublicVaccineDashboardModel, ServiceUnitReportStatus } from "./vaccineMonthly";

export interface UnitAggregateSubmission {
  serviceUnitCode: string;
  reportMonth: string;
  totalChildren: number;
  onSchedule: number;
  delayed: number;
  refused: number;
  postponed: number;
  notFound: number;
  followedUp: number;
  submittedAt: string;
  token: string;
}

export interface MonthlyUnitAggregate extends UnitAggregateSubmission {
  receivedAt: string;
}

export type AggregateValidationResult =
  | { ok: true; value: UnitAggregateSubmission }
  | {
      ok: false;
      error: "UNKNOWN_SERVICE_UNIT" | "INVALID_REPORT_MONTH" | "MISSING_FIELD" | "NEGATIVE_COUNT";
    };

const NUMERIC_FIELDS = [
  "totalChildren",
  "onSchedule",
  "delayed",
  "refused",
  "postponed",
  "notFound",
  "followedUp",
] as const;

const FORBIDDEN_PUBLIC_KEYS = ["cid", "name", "address", "worker", "notes", "raw", "record_json"];

type NumericField = (typeof NUMERIC_FIELDS)[number];

type PublicServiceUnitProgress = NonNullable<
  PublicVaccineDashboardModel["vaccineProgress"]["serviceUnits"]
>[number];

type PublicServiceUnitQuality = PublicVaccineDashboardModel["dataQuality"]["serviceUnits"][number];

interface PublicAggregateRow {
  serviceUnitCode: string;
  serviceUnitName: string;
  reportStatus: ServiceUnitReportStatus;
  coverage: number;
  totalChildren: number;
  needFollowUp: number;
  lastUpdated: string;
  aggregate?: MonthlyUnitAggregate;
}

export function validateUnitAggregateSubmission(value: unknown): AggregateValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "MISSING_FIELD" };
  }

  const serviceUnitCode = value.serviceUnitCode;
  if (typeof serviceUnitCode !== "string" || !serviceUnitByCode(serviceUnitCode)) {
    return { ok: false, error: "UNKNOWN_SERVICE_UNIT" };
  }

  const reportMonth = value.reportMonth;
  if (typeof reportMonth !== "string" || !/^\d{4}-\d{2}$/.test(reportMonth)) {
    return { ok: false, error: "INVALID_REPORT_MONTH" };
  }

  for (const field of NUMERIC_FIELDS) {
    const count = value[field];
    if (typeof count !== "number" || !Number.isFinite(count)) {
      return { ok: false, error: "MISSING_FIELD" };
    }
    if (count < 0) {
      return { ok: false, error: "NEGATIVE_COUNT" };
    }
  }

  if (typeof value.submittedAt !== "string" || value.submittedAt === "") {
    return { ok: false, error: "MISSING_FIELD" };
  }

  if (typeof value.token !== "string" || value.token === "") {
    return { ok: false, error: "MISSING_FIELD" };
  }

  return { ok: true, value: value as unknown as UnitAggregateSubmission };
}

export function upsertMonthlyAggregate(
  existing: readonly MonthlyUnitAggregate[],
  next: MonthlyUnitAggregate
): MonthlyUnitAggregate[] {
  return [
    ...existing.filter(
      (aggregate) =>
        aggregate.reportMonth !== next.reportMonth ||
        aggregate.serviceUnitCode !== next.serviceUnitCode
    ),
    next,
  ].sort((a, b) => a.serviceUnitCode.localeCompare(b.serviceUnitCode));
}

export function buildPublicDashboardFromAggregates(
  reportMonth: string,
  aggregates: readonly MonthlyUnitAggregate[]
): PublicVaccineDashboardModel {
  const aggregateByUnit = new Map<string, MonthlyUnitAggregate>();
  for (const aggregate of aggregates) {
    if (aggregate.reportMonth === reportMonth) {
      aggregateByUnit.set(aggregate.serviceUnitCode, aggregate);
    }
  }

  const rows = CANONICAL_SERVICE_UNITS.map((unit): PublicAggregateRow => {
    const aggregate = aggregateByUnit.get(unit.serviceUnitCode);
    if (!aggregate) {
      return {
        serviceUnitCode: unit.serviceUnitCode,
        serviceUnitName: unit.serviceUnitName,
        reportStatus: "ยังไม่ส่ง",
        coverage: 0,
        totalChildren: 0,
        needFollowUp: 0,
        lastUpdated: "",
      };
    }

    const needFollowUp = aggregate.delayed + aggregate.refused;
    const coverage =
      aggregate.totalChildren > 0
        ? roundToOneDecimal(((aggregate.onSchedule + aggregate.delayed) / aggregate.totalChildren) * 100)
        : 0;

    return {
      serviceUnitCode: unit.serviceUnitCode,
      serviceUnitName: unit.serviceUnitName,
      reportStatus: needFollowUp > 0 ? "ส่งแต่ยังติดตาม" : "ส่งครบ",
      coverage,
      totalChildren: aggregate.totalChildren,
      needFollowUp,
      lastUpdated: aggregate.receivedAt,
      aggregate,
    };
  });

  const submittedRows = rows.filter((row) => row.aggregate);
  const unitsReported = submittedRows.length;
  const unitsCompleted = rows.filter((row) => row.reportStatus === "ส่งครบ").length;
  const unitsNeedFollowUp = rows.filter((row) => row.reportStatus === "ส่งแต่ยังติดตาม").length;
  const totalChildren = sumAggregateField(submittedRows, "totalChildren");
  const totalOnSchedule = sumAggregateField(submittedRows, "onSchedule");
  const totalDelayed = sumAggregateField(submittedRows, "delayed");
  const totalRefused = sumAggregateField(submittedRows, "refused");
  const lastUpdatedAt = latestTimestamp(submittedRows.map((row) => row.lastUpdated));
  const districtCoverage =
    totalChildren > 0 ? roundToOneDecimal(((totalOnSchedule + totalDelayed) / totalChildren) * 100) : 0;

  return {
    lastUpdatedAt,
    reportMonth,
    vaccineProgress:
      unitsReported > 0
        ? {
            state: "READY",
            district: {
              name: "อำเภอมายอ",
              totalChildren,
              coverage: districtCoverage,
              onSchedule: totalOnSchedule,
              delayed: totalDelayed,
              refused: totalRefused,
              needFollowUp: totalDelayed + totalRefused,
            },
            serviceUnits: rows.map(toPublicProgressRow),
          }
        : {
            state: "NOT_READY",
            message: "กำลังเตรียมข้อมูลรายเดือน",
          },
    dataQuality: {
      unitsReported,
      totalUnits: CANONICAL_SERVICE_UNITS.length,
      unitsCompleted,
      unitsNeedFollowUp,
      serviceUnits: rows.map(toPublicQualityRow),
    },
  };
}

export function publicAggregateContainsForbiddenKeys(value: unknown): boolean {
  return containsForbiddenKey(value, new WeakSet<object>());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function sumAggregateField(rows: readonly PublicAggregateRow[], field: NumericField): number {
  return rows.reduce((sum, row) => sum + (row.aggregate?.[field] ?? 0), 0);
}

function latestTimestamp(timestamps: readonly string[]): string {
  return timestamps.reduce((latest, timestamp) => {
    if (timestamp === "") {
      return latest;
    }
    if (latest === "" || timestamp > latest) {
      return timestamp;
    }
    return latest;
  }, "");
}

function toPublicProgressRow(row: PublicAggregateRow): PublicServiceUnitProgress {
  return {
    serviceUnitCode: row.serviceUnitCode,
    serviceUnitName: row.serviceUnitName,
    reportStatus: row.reportStatus,
    coverage: row.coverage,
    totalChildren: row.totalChildren,
    needFollowUp: row.needFollowUp,
  };
}

function toPublicQualityRow(row: PublicAggregateRow): PublicServiceUnitQuality {
  return {
    serviceUnitCode: row.serviceUnitCode,
    serviceUnitName: row.serviceUnitName,
    reportStatus: row.reportStatus,
    lastUpdated: row.lastUpdated,
  };
}

function containsForbiddenKey(value: unknown, seen: WeakSet<object>): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKey(item, seen));
  }

  if (!isRecord(value)) {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }
  seen.add(value);

  for (const [key, childValue] of Object.entries(value)) {
    if (normalizedForbiddenKeys.has(normalizeKey(key))) {
      return true;
    }
    if (containsForbiddenKey(childValue, seen)) {
      return true;
    }
  }

  return false;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, "");
}

const normalizedForbiddenKeys = new Set(FORBIDDEN_PUBLIC_KEYS.map(normalizeKey));
