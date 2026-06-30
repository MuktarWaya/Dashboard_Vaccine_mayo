# Service Unit GAS API Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Central GAS aggregate ingestion and settings workflow for the 14 Mayo service units, with a protected React settings page and generated unit `Code.gs` templates.

**Architecture:** Replace direct public reads from 14 service-unit spreadsheets with a push-based aggregate model. Each service unit's bound `Code.gs` submits aggregate counts to Central GAS; Central GAS stores settings, aggregates, and logs in the dashboard spreadsheet; the Cloudflare React dashboard reads only aggregate public data from Central GAS.

**Tech Stack:** TypeScript, Google Apps Script, Google Sheets, React/Vite, Vitest, Cloudflare static frontend.

---

## File Structure

- Modify `src/config/serviceUnits.ts`: canonical 14 service-unit list and default sheet names.
- Create `src/domain/serviceUnitSettings.ts`: settings types, canonical unit helpers, password/session types, and token metadata.
- Create `src/domain/unitAggregate.ts`: aggregate payload validation, public-safe aggregate model, and upsert helpers.
- Create `tests/domain/serviceUnitSettings.test.ts`: canonical unit and settings behavior.
- Create `tests/domain/unitAggregate.test.ts`: validation, upsert, and privacy tests.
- Create `src/infrastructure/sheetsServiceUnitSettingsRepository.ts`: Apps Script adapter for `CONFIG_SERVICE_UNITS`, `MONTHLY_UNIT_AGGREGATES`, and `INGESTION_LOG`.
- Create `tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts`: pure in-memory contract tests for repository row mapping.
- Modify `src/main.ts`: Central GAS API actions for `publicDashboard`, `adminLogin`, `getSettings`, `saveSettings`, `testUnitConnection`, and `submitUnitMonthly`.
- Modify `frontend/src/types/vaccine.ts`: frontend settings and aggregate API types.
- Modify `frontend/src/services/gasApi.ts`: POST helper and settings API functions.
- Create `frontend/src/components/settings/SettingsPage.tsx`: protected settings screen.
- Modify `frontend/src/App.tsx`: route `/settings`.
- Create `src/templates/unitCodeGsTemplate.ts`: unit `Code.gs` generator.
- Create `tests/domain/unitCodeGsTemplate.test.ts`: generated script includes correct unit config and excludes child-level fields.
- Modify `README.md` or create `docs/runbooks/service-unit-gas-setup.md`: operating guide for installing unit bound scripts.

## Scope Boundaries

This plan does not add child-level drilldown, named worker reporting, Google OAuth admin roles, or direct public reads from the 14 service-unit spreadsheets. The initial admin gate uses server-side validation of password `009941` as approved in the spec.

## Task 1: Canonical 14 Service Units

**Files:**
- Modify: `src/config/serviceUnits.ts`
- Create: `src/domain/serviceUnitSettings.ts`
- Test: `tests/domain/serviceUnitSettings.test.ts`

- [ ] **Step 1: Write failing test for the canonical unit list**

Create `tests/domain/serviceUnitSettings.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CANONICAL_SERVICE_UNITS,
  DEFAULT_MONTHLY_SHEET_NAME,
  serviceUnitByCode,
} from "../../src/domain/serviceUnitSettings";

describe("service unit settings domain", () => {
  it("defines the canonical 13 รพ.สต. plus 1 PCU service-unit list", () => {
    expect(CANONICAL_SERVICE_UNITS).toHaveLength(14);
    expect(CANONICAL_SERVICE_UNITS.map((unit) => unit.serviceUnitCode)).toEqual([
      "09940",
      "09941",
      "09942",
      "09943",
      "09944",
      "09945",
      "09946",
      "09947",
      "09948",
      "09949",
      "09950",
      "09951",
      "41083",
      "77483",
    ]);
    expect(serviceUnitByCode("09941")?.serviceUnitName).toBe("โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง");
    expect(serviceUnitByCode("77483")?.serviceUnitName).toBe("ศูนย์สุขภาพชุมชนตำบลมายอ");
    expect(DEFAULT_MONTHLY_SHEET_NAME).toBe("รายงานรายเดือน");
  });

  it("does not include old prototype service units", () => {
    expect(serviceUnitByCode("09954")).toBeUndefined();
    expect(CANONICAL_SERVICE_UNITS.map((unit) => unit.serviceUnitName).join("|")).not.toContain("โคกโต๊ะ");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/domain/serviceUnitSettings.test.ts
```

Expected: FAIL because `src/domain/serviceUnitSettings.ts` does not exist.

- [ ] **Step 3: Create service-unit settings domain**

Create `src/domain/serviceUnitSettings.ts`:

```ts
export const DEFAULT_MONTHLY_SHEET_NAME = "รายงานรายเดือน";

export interface CanonicalServiceUnit {
  serviceUnitCode: string;
  serviceUnitName: string;
}

export interface ServiceUnitSetting extends CanonicalServiceUnit {
  spreadsheetId: string;
  sheetName: string;
  enabled: boolean;
  tokenHash?: string;
  lastSubmittedAt?: string;
  lastError?: string;
}

export const CANONICAL_SERVICE_UNITS: CanonicalServiceUnit[] = [
  { serviceUnitCode: "09940", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลถนน" },
  { serviceUnitCode: "09941", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง" },
  { serviceUnitCode: "09942", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลกระหวะ" },
  { serviceUnitCode: "09943", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลลุโบะยิไร" },
  { serviceUnitCode: "09944", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลลางา" },
  { serviceUnitCode: "09945", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลกระเสาะ" },
  { serviceUnitCode: "09946", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลเกาะจัน" },
  { serviceUnitCode: "09947", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลปะโด" },
  { serviceUnitCode: "09948", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอบน" },
  { serviceUnitCode: "09949", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอใต้" },
  { serviceUnitCode: "09950", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลสะกำ" },
  { serviceUnitCode: "09951", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลปานัน" },
  { serviceUnitCode: "41083", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านน้ำใส" },
  { serviceUnitCode: "77483", serviceUnitName: "ศูนย์สุขภาพชุมชนตำบลมายอ" },
];

export function serviceUnitByCode(code: string): CanonicalServiceUnit | undefined {
  return CANONICAL_SERVICE_UNITS.find((unit) => unit.serviceUnitCode === code);
}

export function defaultServiceUnitSettings(): ServiceUnitSetting[] {
  return CANONICAL_SERVICE_UNITS.map((unit) => ({
    ...unit,
    spreadsheetId: "",
    sheetName: DEFAULT_MONTHLY_SHEET_NAME,
    enabled: true,
  }));
}
```

- [ ] **Step 4: Update existing static config to use canonical units**

Modify `src/config/serviceUnits.ts` so `SERVICE_UNIT_CONFIGS` is derived from `defaultServiceUnitSettings()`:

```ts
import type { ServiceUnitSheetConfig } from "../domain/vaccineMonthly";
import { defaultServiceUnitSettings } from "../domain/serviceUnitSettings";

export const SERVICE_UNIT_CONFIGS: ServiceUnitSheetConfig[] = defaultServiceUnitSettings().map((unit) => ({
  serviceUnitCode: unit.serviceUnitCode,
  serviceUnitName: unit.serviceUnitName,
  spreadsheetId: unit.spreadsheetId,
  sheetName: unit.sheetName,
}));
```

Keep `validateServiceUnitConfigs()` in the same file, but ensure it validates the new 14-row list.

- [ ] **Step 5: Run test and verify it passes**

Run:

```bash
npx vitest run tests/domain/serviceUnitSettings.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/serviceUnitSettings.ts src/config/serviceUnits.ts tests/domain/serviceUnitSettings.test.ts
git commit -m "feat: define canonical service units"
```

## Task 2: Aggregate Payload Validation And Public Model

**Files:**
- Create: `src/domain/unitAggregate.ts`
- Test: `tests/domain/unitAggregate.test.ts`

- [ ] **Step 1: Write failing tests for aggregate validation**

Create `tests/domain/unitAggregate.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildPublicDashboardFromAggregates,
  publicAggregateContainsForbiddenKeys,
  upsertMonthlyAggregate,
  validateUnitAggregateSubmission,
  type MonthlyUnitAggregate,
} from "../../src/domain/unitAggregate";

const validPayload = {
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
};

describe("unit aggregate domain", () => {
  it("accepts a valid aggregate submission", () => {
    expect(validateUnitAggregateSubmission(validPayload)).toEqual({
      ok: true,
      value: validPayload,
    });
  });

  it("rejects unknown unit codes, bad month, and negative counts", () => {
    expect(validateUnitAggregateSubmission({ ...validPayload, serviceUnitCode: "09954" })).toMatchObject({
      ok: false,
      error: "UNKNOWN_SERVICE_UNIT",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, reportMonth: "มิถุนายน" })).toMatchObject({
      ok: false,
      error: "INVALID_REPORT_MONTH",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, delayed: -1 })).toMatchObject({
      ok: false,
      error: "NEGATIVE_COUNT",
    });
  });

  it("upserts by report month and service unit", () => {
    const existing: MonthlyUnitAggregate[] = [
      { ...validPayload, totalChildren: 100, receivedAt: "2026-06-30T09:00:00+07:00" },
    ];
    const next = upsertMonthlyAggregate(existing, {
      ...validPayload,
      totalChildren: 121,
      receivedAt: "2026-06-30T11:00:00+07:00",
    });

    expect(next).toHaveLength(1);
    expect(next[0].totalChildren).toBe(121);
  });

  it("builds a public dashboard without forbidden child-level keys", () => {
    const publicModel = buildPublicDashboardFromAggregates("2026-06", [
      { ...validPayload, receivedAt: "2026-06-30T11:00:00+07:00" },
    ]);

    expect(publicModel.dataQuality.unitsReported).toBe(1);
    expect(publicModel.dataQuality.totalUnits).toBe(14);
    expect(publicModel.vaccineProgress.state).toBe("READY");
    expect(publicAggregateContainsForbiddenKeys(publicModel)).toBe(false);
    expect(publicAggregateContainsForbiddenKeys({ cid: "1234567890123" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/domain/unitAggregate.test.ts
```

Expected: FAIL because `src/domain/unitAggregate.ts` does not exist.

- [ ] **Step 3: Implement aggregate domain**

Create `src/domain/unitAggregate.ts`:

```ts
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
  | { ok: false; error: "UNKNOWN_SERVICE_UNIT" | "INVALID_REPORT_MONTH" | "MISSING_FIELD" | "NEGATIVE_COUNT" };

const NUMERIC_FIELDS = ["totalChildren", "onSchedule", "delayed", "refused", "postponed", "notFound", "followedUp"] as const;
const FORBIDDEN_PUBLIC_KEYS = ["cid", "name", "address", "worker", "notes", "raw", "record_json"];

export function validateUnitAggregateSubmission(value: unknown): AggregateValidationResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "MISSING_FIELD" };
  }

  const payload = value as Partial<UnitAggregateSubmission>;
  if (!payload.serviceUnitCode || !serviceUnitByCode(payload.serviceUnitCode)) {
    return { ok: false, error: "UNKNOWN_SERVICE_UNIT" };
  }
  if (!payload.reportMonth || !/^\d{4}-\d{2}$/.test(payload.reportMonth)) {
    return { ok: false, error: "INVALID_REPORT_MONTH" };
  }
  for (const field of NUMERIC_FIELDS) {
    const numberValue = payload[field];
    if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
      return { ok: false, error: "MISSING_FIELD" };
    }
    if (numberValue < 0) {
      return { ok: false, error: "NEGATIVE_COUNT" };
    }
  }
  if (!payload.submittedAt || !payload.token) {
    return { ok: false, error: "MISSING_FIELD" };
  }

  return { ok: true, value: payload as UnitAggregateSubmission };
}

export function upsertMonthlyAggregate(
  existing: readonly MonthlyUnitAggregate[],
  next: MonthlyUnitAggregate,
): MonthlyUnitAggregate[] {
  return [
    ...existing.filter(
      (item) => !(item.reportMonth === next.reportMonth && item.serviceUnitCode === next.serviceUnitCode),
    ),
    next,
  ].sort((left, right) => left.serviceUnitCode.localeCompare(right.serviceUnitCode));
}

export function buildPublicDashboardFromAggregates(
  reportMonth: string,
  aggregates: readonly MonthlyUnitAggregate[],
): PublicVaccineDashboardModel {
  const unitRows = CANONICAL_SERVICE_UNITS.map((unit) => {
    const aggregate = aggregates.find(
      (item) => item.reportMonth === reportMonth && item.serviceUnitCode === unit.serviceUnitCode,
    );
    if (!aggregate) {
      return {
        serviceUnitCode: unit.serviceUnitCode,
        serviceUnitName: unit.serviceUnitName,
        reportStatus: "ยังไม่ส่ง" as ServiceUnitReportStatus,
        coverage: 0,
        totalChildren: 0,
        needFollowUp: 0,
        lastUpdated: "",
        aggregate,
      };
    }

    const coverage = aggregate.totalChildren > 0
      ? Math.round(((aggregate.onSchedule + aggregate.delayed) / aggregate.totalChildren) * 1000) / 10
      : 0;
    const reportStatus: ServiceUnitReportStatus =
      aggregate.delayed + aggregate.refused > 0 ? "ส่งแต่ยังติดตาม" : "ส่งครบ";

    return {
      serviceUnitCode: unit.serviceUnitCode,
      serviceUnitName: unit.serviceUnitName,
      reportStatus,
      coverage,
      totalChildren: aggregate.totalChildren,
      needFollowUp: aggregate.delayed + aggregate.refused,
      lastUpdated: aggregate.receivedAt,
      aggregate,
    };
  });

  const submittedRows = unitRows.filter((row) => row.aggregate);
  const totalChildren = submittedRows.reduce((sum, row) => sum + row.totalChildren, 0);
  const onSchedule = submittedRows.reduce((sum, row) => sum + (row.aggregate?.onSchedule ?? 0), 0);
  const delayed = submittedRows.reduce((sum, row) => sum + (row.aggregate?.delayed ?? 0), 0);
  const refused = submittedRows.reduce((sum, row) => sum + (row.aggregate?.refused ?? 0), 0);
  const coverage = totalChildren > 0 ? Math.round(((onSchedule + delayed) / totalChildren) * 1000) / 10 : 0;

  return {
    lastUpdatedAt: new Date().toISOString(),
    reportMonth,
    vaccineProgress: {
      state: submittedRows.length > 0 ? "READY" : "NOT_READY",
      message: submittedRows.length > 0 ? undefined : "กำลังเตรียมข้อมูลรายเดือน",
      ...(submittedRows.length > 0 && {
        district: {
          name: "อำเภอมายอ",
          totalChildren,
          coverage,
          onSchedule,
          delayed,
          refused,
          needFollowUp: delayed + refused,
        },
        serviceUnits: unitRows.map(({ aggregate, lastUpdated, ...row }) => row),
      }),
    },
    dataQuality: {
      unitsReported: submittedRows.length,
      totalUnits: CANONICAL_SERVICE_UNITS.length,
      unitsCompleted: unitRows.filter((row) => row.reportStatus === "ส่งครบ").length,
      unitsNeedFollowUp: CANONICAL_SERVICE_UNITS.length - unitRows.filter((row) => row.reportStatus === "ส่งครบ").length,
      serviceUnits: unitRows.map(({ aggregate, coverage, totalChildren, needFollowUp, ...row }) => row),
    },
  };
}

export function publicAggregateContainsForbiddenKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(publicAggregateContainsForbiddenKeys);
  }
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, nested]) => {
    const normalized = key.toLowerCase().replace(/[_-]/g, "");
    return FORBIDDEN_PUBLIC_KEYS.includes(normalized) || publicAggregateContainsForbiddenKeys(nested);
  });
}
```

- [ ] **Step 4: Run aggregate tests**

Run:

```bash
npx vitest run tests/domain/unitAggregate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/unitAggregate.ts tests/domain/unitAggregate.test.ts
git commit -m "feat: validate unit aggregate submissions"
```

## Task 3: Central Sheets Repository Contract

**Files:**
- Create: `src/infrastructure/sheetsServiceUnitSettingsRepository.ts`
- Test: `tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts`

- [ ] **Step 1: Write failing row mapping tests**

Create `tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts`:

```ts
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

    expect(rowToAggregate(aggregateToRow(aggregate))).toEqual(aggregate);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts
```

Expected: FAIL because repository mapping file does not exist.

- [ ] **Step 3: Implement mapping helpers and repository skeleton**

Create `src/infrastructure/sheetsServiceUnitSettingsRepository.ts`:

```ts
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
    receivedAt: String(row[10] ?? ""),
    token: "",
  };
}

export class SheetsServiceUnitSettingsRepository {
  constructor(private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {}

  provision(): void {
    this.ensureSheet(CONFIG_SHEET_NAME, [...CONFIG_HEADERS]);
    this.ensureSheet(AGGREGATES_SHEET_NAME, [...AGGREGATE_HEADERS]);
    this.ensureSheet(INGESTION_LOG_SHEET_NAME, ["at", "event", "service_unit_code", "report_month", "message"]);
  }

  private ensureSheet(name: string, headers: string[]): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = this.spreadsheet.getSheetByName(name) ?? this.spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    return sheet;
  }
}
```

- [ ] **Step 4: Run repository mapping tests**

Run:

```bash
npx vitest run tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/sheetsServiceUnitSettingsRepository.ts tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts
git commit -m "feat: map service unit settings sheets"
```

## Task 4: Admin Password And Session Domain

**Files:**
- Modify: `src/domain/serviceUnitSettings.ts`
- Test: `tests/domain/serviceUnitSettings.test.ts`

- [ ] **Step 1: Add failing tests for password validation**

Append to `tests/domain/serviceUnitSettings.test.ts`:

```ts
import {
  ADMIN_PASSWORD_PROPERTY,
  DEFAULT_ADMIN_PASSWORD,
  createAdminSession,
  verifyAdminPassword,
} from "../../src/domain/serviceUnitSettings";

it("validates the initial admin password server-side", () => {
  expect(DEFAULT_ADMIN_PASSWORD).toBe("009941");
  expect(ADMIN_PASSWORD_PROPERTY).toBe("DASHBOARD_ADMIN_PASSWORD");
  expect(verifyAdminPassword("009941", undefined)).toBe(true);
  expect(verifyAdminPassword("bad", undefined)).toBe(false);
  expect(verifyAdminPassword("secret", "secret")).toBe(true);
});

it("creates short-lived opaque admin sessions", () => {
  const session = createAdminSession("2026-06-30T10:00:00+07:00", () => "uuid-1");
  expect(session.sessionToken).toBe("uuid-1");
  expect(session.expiresInSeconds).toBe(1800);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/domain/serviceUnitSettings.test.ts
```

Expected: FAIL because password/session exports do not exist.

- [ ] **Step 3: Implement password/session helpers**

Add to `src/domain/serviceUnitSettings.ts`:

```ts
export const DEFAULT_ADMIN_PASSWORD = "009941";
export const ADMIN_PASSWORD_PROPERTY = "DASHBOARD_ADMIN_PASSWORD";
export const ADMIN_SESSION_CACHE_PREFIX = "dashboard-admin-session:";
export const ADMIN_SESSION_TTL_SECONDS = 1800;

export interface AdminSession {
  sessionToken: string;
  issuedAt: string;
  expiresInSeconds: number;
}

export function verifyAdminPassword(inputPassword: string, configuredPassword?: string | null): boolean {
  const expected = configuredPassword?.trim() || DEFAULT_ADMIN_PASSWORD;
  return inputPassword === expected;
}

export function createAdminSession(now: string, uuid: () => string): AdminSession {
  return {
    sessionToken: uuid(),
    issuedAt: now,
    expiresInSeconds: ADMIN_SESSION_TTL_SECONDS,
  };
}
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
npx vitest run tests/domain/serviceUnitSettings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/serviceUnitSettings.ts tests/domain/serviceUnitSettings.test.ts
git commit -m "feat: add admin settings session domain"
```

## Task 5: Central GAS API Actions

**Files:**
- Modify: `src/main.ts`
- Modify: `src/infrastructure/sheetsServiceUnitSettingsRepository.ts`
- Test: `tests/smoke.test.ts` or create `tests/app/serviceUnitApi.test.ts`

- [ ] **Step 1: Write failing tests for exported API surface**

Create `tests/app/serviceUnitApi.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  applicationInfo,
  routeDashboardApiAction,
} from "../../src/main";

describe("service unit API routing", () => {
  it("advertises service unit aggregate ingestion capability", () => {
    expect(applicationInfo()).toMatchObject({
      application: "Dashboard Vaccine",
      capability: "baseline-registry",
    });
  });

  it("routes known dashboard API actions", () => {
    expect(routeDashboardApiAction({ action: "publicDashboard" })).toBe("publicDashboard");
    expect(routeDashboardApiAction({ action: "adminLogin" })).toBe("adminLogin");
    expect(routeDashboardApiAction({ action: "getSettings" })).toBe("getSettings");
    expect(routeDashboardApiAction({ action: "saveSettings" })).toBe("saveSettings");
    expect(routeDashboardApiAction({ action: "testUnitConnection" })).toBe("testUnitConnection");
    expect(routeDashboardApiAction({ action: "submitUnitMonthly" })).toBe("submitUnitMonthly");
  });

  it("defaults legacy fetch action to public dashboard compatibility", () => {
    expect(routeDashboardApiAction({ action: "fetch" })).toBe("publicDashboard");
    expect(routeDashboardApiAction({})).toBe("publicDashboard");
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/app/serviceUnitApi.test.ts
```

Expected: FAIL because `routeDashboardApiAction` does not exist.

- [ ] **Step 3: Add API action router**

Add to `src/main.ts`:

```ts
export type DashboardApiAction =
  | "publicDashboard"
  | "adminLogin"
  | "getSettings"
  | "saveSettings"
  | "testUnitConnection"
  | "submitUnitMonthly";

export function routeDashboardApiAction(parameter?: Record<string, string | undefined>): DashboardApiAction {
  switch (parameter?.action) {
    case "adminLogin":
    case "getSettings":
    case "saveSettings":
    case "testUnitConnection":
    case "submitUnitMonthly":
      return parameter.action;
    case "publicDashboard":
    case "fetch":
    default:
      return "publicDashboard";
  }
}
```

Update `doGet` to call `publicDashboard` for `format=json` and legacy `action=fetch`. Add `doPost` export that reads JSON body and dispatches POST actions.

- [ ] **Step 4: Implement Central GAS adapter functions**

In `src/main.ts`, add functions with these signatures:

```ts
export function adminLogin(password: string): { sessionToken: string; expiresInSeconds: number };
export function getSettings(sessionToken: string): ServiceUnitSetting[];
export function saveSettings(sessionToken: string, settings: ServiceUnitSetting[]): { status: "SETTINGS_SAVED" };
export function testUnitConnection(sessionToken: string, serviceUnitCode: string): { ok: boolean; message: string };
export function submitUnitMonthly(payload: unknown): { status: "ACCEPTED"; serviceUnitCode: string; reportMonth: string };
```

Implementation requirements:

- `adminLogin` uses `PropertiesService.getScriptProperties().getProperty(ADMIN_PASSWORD_PROPERTY)` and `CacheService`.
- `getSettings`, `saveSettings`, and `testUnitConnection` require a valid admin session.
- `submitUnitMonthly` validates aggregate payload, verifies token against stored service-unit config, upserts the aggregate, and writes an ingestion log row.
- `publicDashboard` builds the public model from central aggregate rows, not direct child rows.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx vitest run tests/app/serviceUnitApi.test.ts tests/domain/serviceUnitSettings.test.ts tests/domain/unitAggregate.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/infrastructure/sheetsServiceUnitSettingsRepository.ts tests/app/serviceUnitApi.test.ts
git commit -m "feat: add central service unit gas api"
```

## Task 6: Generate Unit `Code.gs` Template

**Files:**
- Create: `src/templates/unitCodeGsTemplate.ts`
- Test: `tests/domain/unitCodeGsTemplate.test.ts`

- [ ] **Step 1: Write failing template tests**

Create `tests/domain/unitCodeGsTemplate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/domain/unitCodeGsTemplate.test.ts
```

Expected: FAIL because the template generator does not exist.

- [ ] **Step 3: Implement template generator**

Create `src/templates/unitCodeGsTemplate.ts`:

```ts
export interface GenerateUnitCodeGsTemplateInput {
  centralApiUrl: string;
  serviceUnitCode: string;
  serviceUnitName: string;
  sheetName: string;
  token: string;
}

export function generateUnitCodeGsTemplate(input: GenerateUnitCodeGsTemplateInput): string {
  return `const DASHBOARD_VACCINE_API_URL = ${JSON.stringify(input.centralApiUrl)};
const SERVICE_UNIT_CODE = ${JSON.stringify(input.serviceUnitCode)};
const SERVICE_UNIT_NAME = ${JSON.stringify(input.serviceUnitName)};
const SOURCE_SHEET_NAME = ${JSON.stringify(input.sheetName)};
const UNIT_TOKEN = ${JSON.stringify(input.token)};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dashboard Vaccine')
    .addItem('ส่งข้อมูลรายเดือน', 'submitCurrentMonthAggregate')
    .addToUi();
}

function submitCurrentMonthAggregate() {
  const reportMonth = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  const payload = buildMonthlyAggregate(reportMonth);
  const response = UrlFetchApp.fetch(DASHBOARD_VACCINE_API_URL + '?action=submitUnitMonthly', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  SpreadsheetApp.getUi().alert(response.getContentText());
}

function buildMonthlyAggregate(reportMonth) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SOURCE_SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต ' + SOURCE_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const rows = values.slice(1);
  const statusIndex = headers.indexOf('สถานะวัคซีน');
  if (statusIndex === -1) throw new Error('ไม่พบคอลัมน์ สถานะวัคซีน');

  const counts = {
    totalChildren: rows.filter(function(row) { return row.join('').trim() !== ''; }).length,
    onSchedule: 0,
    delayed: 0,
    refused: 0,
    postponed: 0,
    notFound: 0,
    followedUp: 0,
  };

  rows.forEach(function(row) {
    const status = String(row[statusIndex] || '').trim();
    if (status === 'ตามกำหนด') counts.onSchedule += 1;
    else if (status === 'ล่าช้า') counts.delayed += 1;
    else if (status === 'ปฏิเสธ') counts.refused += 1;
    else if (status === 'เลื่อนนัด') counts.postponed += 1;
    else if (status === 'ไม่พบ') counts.notFound += 1;
    else if (status) counts.followedUp += 1;
  });

  return {
    serviceUnitCode: SERVICE_UNIT_CODE,
    reportMonth: reportMonth,
    totalChildren: counts.totalChildren,
    onSchedule: counts.onSchedule,
    delayed: counts.delayed,
    refused: counts.refused,
    postponed: counts.postponed,
    notFound: counts.notFound,
    followedUp: counts.followedUp,
    submittedAt: new Date().toISOString(),
    token: UNIT_TOKEN,
  };
}
`;
}
```

- [ ] **Step 4: Run template tests**

Run:

```bash
npx vitest run tests/domain/unitCodeGsTemplate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/templates/unitCodeGsTemplate.ts tests/domain/unitCodeGsTemplate.test.ts
git commit -m "feat: generate unit bound gas template"
```

## Task 7: Frontend Settings API Client

**Files:**
- Modify: `frontend/src/types/vaccine.ts`
- Modify: `frontend/src/services/gasApi.ts`
- Test: `tests/frontend/settingsApiTypes.test.ts`

- [ ] **Step 1: Write failing frontend API type tests**

Create `tests/frontend/settingsApiTypes.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npx vitest run tests/frontend/settingsApiTypes.test.ts
```

Expected: FAIL because `buildSettingsPayload` does not exist.

- [ ] **Step 3: Add frontend settings types**

Append to `frontend/src/types/vaccine.ts`:

```ts
export interface ServiceUnitSettingView {
  serviceUnitCode: string;
  serviceUnitName: string;
  spreadsheetId: string;
  sheetName: string;
  enabled: boolean;
  tokenStatus: "ตั้งค่าแล้ว" | "ยังไม่ตั้งค่า";
  lastSubmittedAt?: string;
  lastError?: string;
}

export interface AdminLoginResponse {
  sessionToken: string;
  expiresInSeconds: number;
}
```

- [ ] **Step 4: Add POST helper and settings functions**

Modify `frontend/src/services/gasApi.ts`:

```ts
export function buildSettingsPayload(sessionToken: string, payload: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, sessionToken }),
  };
}

async function postGAS<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function adminLogin(password: string): Promise<AdminLoginResponse> {
  return postGAS<AdminLoginResponse>({ action: "adminLogin", password });
}

export async function getSettings(sessionToken: string): Promise<ServiceUnitSettingView[]> {
  return postGAS<ServiceUnitSettingView[]>({ action: "getSettings", sessionToken });
}
```

Import the new types from `frontend/src/types/vaccine.ts`.

- [ ] **Step 5: Run frontend API tests**

Run:

```bash
npx vitest run tests/frontend/settingsApiTypes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/vaccine.ts frontend/src/services/gasApi.ts tests/frontend/settingsApiTypes.test.ts
git commit -m "feat: add frontend settings api client"
```

## Task 8: React Settings Page

**Files:**
- Create: `frontend/src/components/settings/SettingsPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create settings page component**

Create `frontend/src/components/settings/SettingsPage.tsx`:

```tsx
import React, { useState } from 'react';
import { adminLogin, getSettings } from '@/services/gasApi';
import type { ServiceUnitSettingView } from '@/types/vaccine';

const SettingsPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [settings, setSettings] = useState<ServiceUnitSettingView[]>([]);
  const [error, setError] = useState('');

  const login = async () => {
    setError('');
    try {
      const session = await adminLogin(password);
      setSessionToken(session.sessionToken);
      setSettings(await getSettings(session.sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  if (!sessionToken) {
    return (
      <main className="min-h-screen bg-[#f9faf6] px-4 py-16 text-[#1a1c1a]">
        <section className="mx-auto max-w-md rounded-xl border border-[#d9dad7] bg-white p-6 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
          <h1 className="text-2xl font-extrabold text-[#002b1a]">ตั้งค่าระบบ</h1>
          <p className="mt-2 text-sm text-[#414943]">สำหรับผู้ดูแลระบบอำเภอเท่านั้น</p>
          <label className="mt-6 block text-sm font-bold text-[#002b1a]">
            รหัสผ่านผู้ดูแล
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-lg border border-[#d9dad7] px-3 py-2"
            />
          </label>
          {error && <p className="mt-3 text-sm font-semibold text-[#9b4145]">{error}</p>}
          <button onClick={login} className="mt-6 w-full rounded-lg bg-[#14422d] px-4 py-2 font-bold text-white">
            เข้าสู่หน้าตั้งค่า
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9faf6] px-4 py-10 text-[#1a1c1a]">
      <section className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-extrabold text-[#002b1a]">ตั้งค่าการเชื่อมต่อ 14 หน่วยบริการ</h1>
        <div className="mt-6 overflow-hidden rounded-xl border border-[#d9dad7] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#edeeea] text-left">
              <tr>
                <th className="px-4 py-3">รหัส</th>
                <th className="px-4 py-3">หน่วยบริการ</th>
                <th className="px-4 py-3">Spreadsheet ID</th>
                <th className="px-4 py-3">Sheet</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">ส่งล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((unit) => (
                <tr key={unit.serviceUnitCode} className="border-t border-[#d9dad7]">
                  <td className="px-4 py-3 font-mono">{unit.serviceUnitCode}</td>
                  <td className="px-4 py-3 font-semibold">{unit.serviceUnitName}</td>
                  <td className="px-4 py-3">{unit.spreadsheetId || '-'}</td>
                  <td className="px-4 py-3">{unit.sheetName}</td>
                  <td className="px-4 py-3">{unit.tokenStatus}</td>
                  <td className="px-4 py-3">{unit.lastSubmittedAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default SettingsPage;
```

- [ ] **Step 2: Add route**

Modify `frontend/src/App.tsx`:

```tsx
import SettingsPage from './components/settings/SettingsPage';
```

Add route:

```tsx
<Route path="/settings" element={<SettingsPage />} />
```

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/settings/SettingsPage.tsx frontend/src/App.tsx
git commit -m "feat: add protected settings page"
```

## Task 9: Public Dashboard Reads Central Aggregate Endpoint

**Files:**
- Modify: `frontend/src/services/gasApi.ts`
- Modify: `src/main.ts`
- Test: `tests/frontend/dashboardViewModel.test.ts`

- [ ] **Step 1: Adjust frontend API action**

Modify `fetchPublicDashboard` in `frontend/src/services/gasApi.ts` to call the new action while preserving compatibility:

```ts
export async function fetchPublicDashboard(month?: string): Promise<PublicDashboardData> {
  return fetchGAS<PublicDashboardData>('', {
    action: 'publicDashboard',
    month: month || new Date().toISOString().slice(0, 7),
  });
}
```

- [ ] **Step 2: Ensure Central GAS public action uses central aggregates**

In `src/main.ts`, ensure `routeDashboardApiAction` maps both `fetch` and `publicDashboard` to the central aggregate dashboard builder.

- [ ] **Step 3: Run tests and frontend build**

Run:

```bash
npm test
cd frontend
npm run build
```

Expected:

- root tests PASS
- frontend build PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/gasApi.ts src/main.ts
git commit -m "feat: read dashboard from central aggregates"
```

## Task 10: Runbook And Final Verification

**Files:**
- Create: `docs/runbooks/service-unit-gas-setup.md`
- Modify: `README.md`

- [ ] **Step 1: Add setup runbook**

Create `docs/runbooks/service-unit-gas-setup.md`:

```md
# Service Unit GAS Setup Runbook

## Purpose

Each service unit keeps its own Google Sheet and uses a bound `Code.gs` script to send aggregate monthly data to the central Dashboard Vaccine GAS API.

## Steps

1. Open the service unit Google Sheet.
2. Open Extensions > Apps Script.
3. Paste the generated `Code.gs` from the Dashboard Settings page.
4. Save the script.
5. Reload the Google Sheet.
6. Open Dashboard Vaccine > ส่งข้อมูลรายเดือน.
7. Confirm the response says `ACCEPTED`.
8. Open the public dashboard and verify the unit appears as submitted.

## Safety

The unit script sends aggregate counts only. It must not send names, CID, addresses, worker names, row notes, or raw records.
```

- [ ] **Step 2: Link the runbook from README**

Add to `README.md`:

```md
## Service Unit GAS Setup

See `docs/runbooks/service-unit-gas-setup.md` for the steps to install the generated `Code.gs` script in each service-unit Google Sheet.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
cd frontend
npm run build
```

Expected:

- `npm test`: all tests pass
- `frontend npm run build`: Vite production build succeeds

- [ ] **Step 4: Commit**

```bash
git add docs/runbooks/service-unit-gas-setup.md README.md
git commit -m "docs: add service unit gas setup runbook"
```

- [ ] **Step 5: Push final branch**

Run:

```bash
git push origin main
```

Expected: push succeeds.

## Self-Review

- Spec coverage: canonical 14-unit list is covered by Task 1; aggregate ingestion by Tasks 2, 3, 5, and 9; Settings page by Tasks 4, 7, and 8; generated `Code.gs` by Task 6; runbook by Task 10.
- Privacy coverage: Tasks 2, 5, and 6 explicitly prevent child-level fields in public payloads and generated unit submissions.
- Testing coverage: each domain and adapter boundary has a failing-test-first task, and final verification runs root tests plus frontend build.
- Scope check: this plan intentionally excludes Google OAuth admin roles and row-level drilldown, matching the design boundary.
