# Public Aggregate Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Google Apps Script public aggregate dashboard with a non-login executive page, a staff-login link, and a working data-quality tab backed by the existing baseline workflow.

**Architecture:** Add a small public dashboard domain model that can only express aggregate values, extend the Sheets baseline repository with active service-unit metadata, expose a no-login `getPublicDashboardModel()` endpoint, and add a new `publicDashboard.html` page. The existing `adminBaseline.html` remains the operational staff page and is routed through `?page=staff`.

**Tech Stack:** TypeScript, Google Apps Script HTML Service, Google Sheets, Vitest, esbuild, clasp.

---

## File Structure

- Create `src/domain/publicDashboard.ts`: aggregate-only public dashboard types and pure builders.
- Modify `src/infrastructure/sheetsBaselineRepository.ts`: add active service-unit reading and aggregate-friendly service-unit metadata.
- Modify `src/main.ts`: add `getPublicDashboardModel()` and route `doGet(e)` between public and staff pages.
- Create `src/ui/publicDashboard.html`: warm official community-service two-tab UI.
- Modify `scripts/build.mjs`: copy `publicDashboard.html` into `dist`.
- Create `tests/domain/publicDashboard.test.ts`: pure tests for aggregate model and privacy shape.
- Modify `tests/features/baselineService.test.ts`: add repository test for active service-unit metadata.
- Modify `tests/smoke.test.ts`: smoke test exported public endpoint shape and `doGet` routing helper if extracted.

---

### Task 1: Public Dashboard Domain Model

**Files:**
- Create: `src/domain/publicDashboard.ts`
- Test: `tests/domain/publicDashboard.test.ts`

- [ ] **Step 1: Write failing tests for aggregate-only model**

Create `tests/domain/publicDashboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BaselineBatch } from "../../src/domain/baseline";
import {
  buildPublicDashboardModel,
  PUBLIC_DASHBOARD_FORBIDDEN_KEYS,
  publicDashboardContainsForbiddenKeys,
  type PublicServiceUnit,
} from "../../src/domain/publicDashboard";

const serviceUnits: PublicServiceUnit[] = [
  { serviceUnitCode: "09940", serviceUnitName: "รพ.สต.บ้านหนึ่ง" },
  { serviceUnitCode: "09941", serviceUnitName: "รพ.สต.บ้านสอง" },
  { serviceUnitCode: "09942", serviceUnitName: "รพ.สต.บ้านสาม" },
];

function batch(overrides: Partial<BaselineBatch>): BaselineBatch {
  return {
    batchId: "batch-1",
    serviceUnitCode: "09940",
    state: "VALIDATED",
    rowCount: 10,
    issues: [],
    stagedBy: "district@example.go.th",
    stagedAt: "2026-06-01T09:00:00+07:00",
    ...overrides,
  };
}

describe("public dashboard model", () => {
  it("builds data quality aggregates for active service units", () => {
    const model = buildPublicDashboardModel({
      now: "2026-06-02T08:00:00+07:00",
      serviceUnits,
      baselineBatches: [
        batch({
          batchId: "confirmed",
          serviceUnitCode: "09940",
          state: "UNIT_CONFIRMED",
          rowCount: 100,
          confirmedBy: "unit@example.go.th",
          confirmedAt: "2026-06-02T07:00:00+07:00",
        }),
        batch({
          batchId: "approved",
          serviceUnitCode: "09941",
          state: "DISTRICT_APPROVED",
          rowCount: 50,
          approvedBy: "district@example.go.th",
          approvedAt: "2026-06-01T12:00:00+07:00",
        }),
        batch({
          batchId: "issues",
          serviceUnitCode: "09942",
          state: "REJECTED",
          rowCount: 20,
          issues: [{ rowNumber: 2, field: "cid", code: "INVALID_CID", message: "bad cid" }],
        }),
      ],
    });

    expect(model.vaccineProgress).toEqual({
      state: "NOT_READY",
      message: "กำลังเตรียมข้อมูลรายเดือน",
    });
    expect(model.dataQuality).toMatchObject({
      confirmedUnits: 1,
      totalUnits: 3,
      confirmedChildren: 100,
      provisionalChildren: 50,
      unitsNeedingFollowUp: 2,
    });
    expect(model.dataQuality.serviceUnits).toEqual([
      {
        serviceUnitCode: "09940",
        serviceUnitName: "รพ.สต.บ้านหนึ่ง",
        baselineStatus: "ยืนยันแล้ว",
        confirmedChildren: 100,
        provisionalChildren: 0,
        pendingIssueCount: 0,
        lastUpdatedAt: "2026-06-02T07:00:00+07:00",
      },
      {
        serviceUnitCode: "09941",
        serviceUnitName: "รพ.สต.บ้านสอง",
        baselineStatus: "รอหน่วยบริการรับรอง",
        confirmedChildren: 0,
        provisionalChildren: 50,
        pendingIssueCount: 0,
        lastUpdatedAt: "2026-06-01T12:00:00+07:00",
      },
      {
        serviceUnitCode: "09942",
        serviceUnitName: "รพ.สต.บ้านสาม",
        baselineStatus: "มีประเด็นต้องแก้",
        confirmedChildren: 0,
        provisionalChildren: 0,
        pendingIssueCount: 1,
        lastUpdatedAt: "2026-06-01T09:00:00+07:00",
      },
    ]);
  });

  it("does not expose forbidden operational keys", () => {
    const model = buildPublicDashboardModel({
      now: "2026-06-02T08:00:00+07:00",
      serviceUnits,
      baselineBatches: [batch({ issues: [{ rowNumber: 2, field: "cid", code: "INVALID_CID", message: "bad cid" }] })],
    });

    expect(PUBLIC_DASHBOARD_FORBIDDEN_KEYS).toContain("record_json");
    expect(publicDashboardContainsForbiddenKeys(model)).toBe(false);
    expect(JSON.stringify(model)).not.toContain("bad cid");
    expect(JSON.stringify(model)).not.toContain("rowNumber");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm test -- tests/domain/publicDashboard.test.ts
```

Expected: FAIL because `src/domain/publicDashboard.ts` does not exist.

- [ ] **Step 3: Implement the aggregate model**

Create `src/domain/publicDashboard.ts`:

```ts
import type { BaselineBatch } from "./baseline";

export interface PublicServiceUnit {
  serviceUnitCode: string;
  serviceUnitName: string;
}

export interface PublicDataQualityUnit {
  serviceUnitCode: string;
  serviceUnitName: string;
  baselineStatus: "ยังไม่ส่งข้อมูล" | "รอตรวจรับ" | "รอหน่วยบริการรับรอง" | "ยืนยันแล้ว" | "มีประเด็นต้องแก้";
  confirmedChildren: number;
  provisionalChildren: number;
  pendingIssueCount: number;
  lastUpdatedAt: string;
}

export interface PublicDashboardModel {
  lastUpdatedAt: string;
  vaccineProgress: {
    state: "NOT_READY";
    message: string;
  };
  dataQuality: {
    confirmedUnits: number;
    totalUnits: number;
    confirmedChildren: number;
    provisionalChildren: number;
    unitsNeedingFollowUp: number;
    serviceUnits: PublicDataQualityUnit[];
  };
}

export const PUBLIC_DASHBOARD_FORBIDDEN_KEYS = [
  "cid",
  "firstName",
  "lastName",
  "houseNumber",
  "address",
  "primaryVhvName",
  "primaryFamilyHealthVolunteerName",
  "record_json",
  "recordJson",
  "issues",
  "rowNumber",
  "message",
] as const;

interface BuildPublicDashboardModelInput {
  now: string;
  serviceUnits: PublicServiceUnit[];
  baselineBatches: BaselineBatch[];
}

export function buildPublicDashboardModel(input: BuildPublicDashboardModelInput): PublicDashboardModel {
  const units = input.serviceUnits.map((unit) => buildDataQualityUnit(unit, input.baselineBatches));
  return {
    lastUpdatedAt: input.now,
    vaccineProgress: {
      state: "NOT_READY",
      message: "กำลังเตรียมข้อมูลรายเดือน",
    },
    dataQuality: {
      confirmedUnits: units.filter((unit) => unit.baselineStatus === "ยืนยันแล้ว").length,
      totalUnits: input.serviceUnits.length,
      confirmedChildren: units.reduce((sum, unit) => sum + unit.confirmedChildren, 0),
      provisionalChildren: units.reduce((sum, unit) => sum + unit.provisionalChildren, 0),
      unitsNeedingFollowUp: units.filter((unit) => unit.baselineStatus !== "ยืนยันแล้ว").length,
      serviceUnits: units,
    },
  };
}

export function publicDashboardContainsForbiddenKeys(value: unknown): boolean {
  return containsForbiddenKey(value, new Set(PUBLIC_DASHBOARD_FORBIDDEN_KEYS));
}

function buildDataQualityUnit(unit: PublicServiceUnit, batches: BaselineBatch[]): PublicDataQualityUnit {
  const unitBatches = batches
    .filter((batch) => batch.serviceUnitCode === unit.serviceUnitCode)
    .sort((left, right) => timestampOf(right).localeCompare(timestampOf(left)));
  const latest = unitBatches[0];

  if (!latest) {
    return {
      ...unit,
      baselineStatus: "ยังไม่ส่งข้อมูล",
      confirmedChildren: 0,
      provisionalChildren: 0,
      pendingIssueCount: 0,
      lastUpdatedAt: "",
    };
  }

  return {
    ...unit,
    baselineStatus: statusOf(latest),
    confirmedChildren: latest.state === "UNIT_CONFIRMED" ? latest.rowCount : 0,
    provisionalChildren: latest.state === "DISTRICT_APPROVED" ? latest.rowCount : 0,
    pendingIssueCount: latest.issues.length,
    lastUpdatedAt: timestampOf(latest),
  };
}

function statusOf(batch: BaselineBatch): PublicDataQualityUnit["baselineStatus"] {
  if (batch.issues.length > 0 || batch.state === "REJECTED") {
    return "มีประเด็นต้องแก้";
  }
  if (batch.state === "UNIT_CONFIRMED") {
    return "ยืนยันแล้ว";
  }
  if (batch.state === "DISTRICT_APPROVED") {
    return "รอหน่วยบริการรับรอง";
  }
  return "รอตรวจรับ";
}

function timestampOf(batch: BaselineBatch): string {
  return batch.confirmedAt ?? batch.approvedAt ?? batch.stagedAt;
}

function containsForbiddenKey(value: unknown, forbidden: ReadonlySet<string>): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKey(item, forbidden));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => forbidden.has(key) || containsForbiddenKey(nested, forbidden),
  );
}
```

- [ ] **Step 4: Run the test**

Run:

```powershell
npm test -- tests/domain/publicDashboard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/publicDashboard.ts tests/domain/publicDashboard.test.ts
git commit -m "feat: add public dashboard aggregate model"
```

---

### Task 2: Service Unit Metadata In Sheets Repository

**Files:**
- Modify: `src/infrastructure/sheetsBaselineRepository.ts`
- Modify test: `tests/features/baselineService.test.ts`

- [ ] **Step 1: Write failing repository test**

Append to `describe("SheetsBaselineRepository", ...)` in `tests/features/baselineService.test.ts`:

```ts
  it("lists active service units for public aggregate reporting", () => {
    const { repository, spreadsheet } = fakeRepository();
    spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS)?.appendRow([" 09940 ", " รพ.สต.บ้านหนึ่ง ", " true "]);
    spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS)?.appendRow(["09941", "รพ.สต.บ้านสอง", "TRUE"]);
    spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS)?.appendRow(["09942", "inactive", "FALSE"]);

    expect(repository.listActiveServiceUnits()).toEqual([
      { serviceUnitCode: "09940", serviceUnitName: "รพ.สต.บ้านหนึ่ง" },
      { serviceUnitCode: "09941", serviceUnitName: "รพ.สต.บ้านสอง" },
    ]);
  });
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm test -- tests/features/baselineService.test.ts
```

Expected: FAIL because `listActiveServiceUnits` does not exist.

- [ ] **Step 3: Implement `listActiveServiceUnits`**

In `src/infrastructure/sheetsBaselineRepository.ts`, add this method to `SheetsBaselineRepository` near `getApprovedServiceUnitCodes()`:

```ts
  listActiveServiceUnits(): { serviceUnitCode: string; serviceUnitName: string }[] {
    const sheet = this.spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS);
    if (!sheet) {
      throw new Error("Service unit configuration is missing");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }

    return sheet
      .getRange(2, 1, lastRow - 1, 3)
      .getValues()
      .filter((row) => String(row[2]).trim().toUpperCase() === "TRUE")
      .map((row) => ({
        serviceUnitCode: String(row[0]).trim(),
        serviceUnitName: String(row[1]).trim() || String(row[0]).trim(),
      }));
  }
```

- [ ] **Step 4: Run repository tests**

Run:

```powershell
npm test -- tests/features/baselineService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/infrastructure/sheetsBaselineRepository.ts tests/features/baselineService.test.ts
git commit -m "feat: read service unit metadata for public dashboard"
```

---

### Task 3: Public Endpoint And Routing

**Files:**
- Modify: `src/main.ts`
- Modify test: `tests/smoke.test.ts`

- [ ] **Step 1: Write failing smoke tests**

Add imports in `tests/smoke.test.ts`:

```ts
import { publicDashboardPageForRequest } from "../src/main";
```

Add tests:

```ts
  it("uses the public dashboard as the default web app page", () => {
    expect(publicDashboardPageForRequest()).toBe("publicDashboard");
    expect(publicDashboardPageForRequest({ parameter: {} })).toBe("publicDashboard");
  });

  it("routes staff users to the operational baseline page", () => {
    expect(publicDashboardPageForRequest({ parameter: { page: "staff" } })).toBe("adminBaseline");
  });
```

- [ ] **Step 2: Run the failing smoke test**

Run:

```powershell
npm test -- tests/smoke.test.ts
```

Expected: FAIL because `publicDashboardPageForRequest` is not exported.

- [ ] **Step 3: Implement routing and public endpoint**

Modify `src/main.ts`:

```ts
import { buildPublicDashboardModel } from "./domain/publicDashboard";
```

Add this type and helper near `applicationInfo()`:

```ts
type AppsScriptGetEvent = { parameter?: Record<string, string | undefined> };

export function publicDashboardPageForRequest(event?: AppsScriptGetEvent): "publicDashboard" | "adminBaseline" {
  return event?.parameter?.page === "staff" ? "adminBaseline" : "publicDashboard";
}
```

Add this server function near `getBaselineAdminModel()`:

```ts
function getPublicDashboardModel() {
  const repo = repository();
  return buildPublicDashboardModel({
    now: new Date().toISOString(),
    serviceUnits: repo.listActiveServiceUnits(),
    baselineBatches: repo.listBatches(),
  });
}
```

Replace `doGet()` with:

```ts
function doGet(event?: AppsScriptGetEvent): GoogleAppsScript.HTML.HtmlOutput {
  const page = publicDashboardPageForRequest(event);
  const title = page === "publicDashboard"
    ? "Dashboard Vaccine - ภาพรวมผู้บริหาร"
    : "Dashboard Vaccine - ทะเบียนตั้งต้น";
  return HtmlService.createHtmlOutputFromFile(page).setTitle(title);
}
```

Add `getPublicDashboardModel` to `Object.assign(globalThis, ...)`.

- [ ] **Step 4: Run smoke tests**

Run:

```powershell
npm test -- tests/smoke.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/main.ts tests/smoke.test.ts
git commit -m "feat: expose public dashboard endpoint"
```

---

### Task 4: Public Dashboard HTML

**Files:**
- Create: `src/ui/publicDashboard.html`
- Modify: `scripts/build.mjs`

- [ ] **Step 1: Create the public HTML page**

Create `src/ui/publicDashboard.html` with:

```html
<!doctype html>
<html lang="th">
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dashboard Vaccine - ภาพรวมผู้บริหาร</title>
    <style>
      :root {
        --paper: #fbf7ef;
        --surface: #fffdf8;
        --line: #eadcc8;
        --ink: #2b2a26;
        --muted: #75695f;
        --maroon: #772f3f;
        --green: #2f5d50;
        --gold: #d7a85c;
        --amber-soft: #fff3df;
        --danger: #9f2d3d;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: Tahoma, "Noto Sans Thai", sans-serif;
        font-size: 15px;
      }

      .shell {
        width: min(1180px, calc(100% - 28px));
        margin: 0 auto;
        padding: 18px 0 32px;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 14px 0 18px;
      }

      .eyebrow {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 4px;
      }

      h1 {
        margin: 0;
        color: var(--maroon);
        font-size: clamp(24px, 4vw, 38px);
        line-height: 1.15;
        letter-spacing: 0;
      }

      .staff-link {
        flex: 0 0 auto;
        border: 0;
        border-radius: 6px;
        background: var(--green);
        color: white;
        padding: 10px 14px;
        font-weight: 700;
        text-decoration: none;
      }

      .tabs {
        display: flex;
        gap: 8px;
        margin: 4px 0 16px;
        overflow-x: auto;
      }

      .tab {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--surface);
        color: var(--muted);
        padding: 10px 14px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
      }

      .tab[aria-selected="true"] {
        border-color: var(--maroon);
        background: var(--maroon);
        color: white;
      }

      .panel { display: none; }
      .panel.active { display: block; }

      .cards {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }

      .metric,
      .section {
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--surface);
      }

      .metric {
        min-height: 102px;
        padding: 14px;
      }

      .metric-label {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 8px;
      }

      .metric-value {
        color: var(--green);
        font-size: 28px;
        font-weight: 800;
        line-height: 1.1;
      }

      .metric-value.warn { color: var(--gold); }
      .metric-value.danger { color: var(--maroon); }

      .grid {
        display: grid;
        grid-template-columns: 1.35fr .65fr;
        gap: 12px;
      }

      .section {
        padding: 14px;
        overflow: hidden;
      }

      .section h2 {
        margin: 0 0 10px;
        font-size: 17px;
        color: var(--ink);
      }

      .empty-state {
        display: grid;
        min-height: 230px;
        place-items: center;
        border: 1px dashed var(--gold);
        border-radius: 6px;
        background: var(--amber-soft);
        color: var(--muted);
        text-align: center;
        padding: 24px;
      }

      .table-wrap { overflow-x: auto; }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }

      th,
      td {
        border-bottom: 1px solid var(--line);
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .status-pill {
        display: inline-block;
        border-radius: 999px;
        background: var(--amber-soft);
        color: var(--maroon);
        padding: 4px 9px;
        font-size: 12px;
        font-weight: 700;
      }

      .note {
        border-left: 4px solid var(--gold);
        background: var(--amber-soft);
        color: var(--muted);
        padding: 12px;
        border-radius: 0 6px 6px 0;
        line-height: 1.55;
      }

      .message {
        min-height: 24px;
        color: var(--muted);
        margin: 0 0 12px;
      }

      .error { color: var(--danger); }

      @media (max-width: 860px) {
        .topbar { align-items: flex-start; flex-direction: column; }
        .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid { grid-template-columns: 1fr; }
      }

      @media (max-width: 520px) {
        .shell { width: min(100% - 18px, 1180px); }
        .cards { grid-template-columns: 1fr; }
        .staff-link { width: 100%; text-align: center; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header class="topbar">
        <div>
          <div class="eyebrow">พชอ.มายอ / Dashboard Vaccine</div>
          <h1>ความก้าวหน้าการติดตามวัคซีนเด็ก</h1>
        </div>
        <a class="staff-link" href="?page=staff">เข้าสู่ระบบเจ้าหน้าที่</a>
      </header>

      <nav class="tabs" aria-label="แดชบอร์ด">
        <button class="tab" type="button" data-tab="progress" aria-selected="true">ความก้าวหน้าวัคซีน</button>
        <button class="tab" type="button" data-tab="quality" aria-selected="false">คุณภาพข้อมูล</button>
      </nav>

      <p id="message" class="message" role="status">กำลังโหลดข้อมูลล่าสุด...</p>

      <section id="progressPanel" class="panel active">
        <div class="cards">
          <article class="metric"><div class="metric-label">ฉีดตามเกณฑ์</div><div class="metric-value">--</div></article>
          <article class="metric"><div class="metric-label">ล่าช้าเดือนนี้</div><div class="metric-value warn">--</div></article>
          <article class="metric"><div class="metric-label">ล่าช้าลดลงจากเดือนก่อน</div><div class="metric-value">--</div></article>
          <article class="metric"><div class="metric-label">ปฏิเสธการฉีด</div><div class="metric-value danger">--</div></article>
        </div>
        <div class="grid">
          <section class="section">
            <h2>สัดส่วนสถานะวัคซีนตามหน่วยบริการ 14 แห่ง</h2>
            <div class="empty-state" id="progressEmpty">กำลังเตรียมข้อมูลรายเดือน</div>
          </section>
          <aside class="section">
            <h2>ข้อสังเกต</h2>
            <div class="note">เมื่อข้อมูลรายเดือนพร้อม หน้านี้จะแสดงเฉพาะข้อมูลรวมระดับอำเภอและระดับหน่วยบริการ ไม่แสดงรายชื่อเด็กหรือเหตุผลรายคน</div>
          </aside>
        </div>
      </section>

      <section id="qualityPanel" class="panel">
        <div class="cards">
          <article class="metric"><div class="metric-label">หน่วยบริการยืนยันแล้ว</div><div class="metric-value" id="confirmedUnits">--</div></article>
          <article class="metric"><div class="metric-label">เด็กในฐานยืนยันแล้ว</div><div class="metric-value" id="confirmedChildren">--</div></article>
          <article class="metric"><div class="metric-label">เด็กชั่วคราว/รอรับรอง</div><div class="metric-value warn" id="provisionalChildren">--</div></article>
          <article class="metric"><div class="metric-label">หน่วยที่ต้องติดตาม</div><div class="metric-value danger" id="unitsNeedingFollowUp">--</div></article>
        </div>
        <section class="section">
          <h2>สถานะข้อมูลทะเบียนตั้งต้นรายหน่วยบริการ</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>หน่วยบริการ</th>
                  <th>สถานะทะเบียนตั้งต้น</th>
                  <th>เด็กยืนยันแล้ว</th>
                  <th>เด็กชั่วคราว</th>
                  <th>ประเด็นค้าง</th>
                  <th>อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody id="qualityRows"></tbody>
            </table>
          </div>
        </section>
      </section>
    </main>

    <script>
      function text(value) {
        return value == null || value === "" ? "-" : String(value);
      }

      function numberText(value) {
        return new Intl.NumberFormat("th-TH").format(Number(value || 0));
      }

      function setMessage(value, isError) {
        var message = document.getElementById("message");
        message.textContent = text(value);
        message.className = isError ? "message error" : "message";
      }

      function switchTab(name) {
        document.querySelectorAll(".tab").forEach(function (tab) {
          tab.setAttribute("aria-selected", tab.dataset.tab === name ? "true" : "false");
        });
        document.getElementById("progressPanel").classList.toggle("active", name === "progress");
        document.getElementById("qualityPanel").classList.toggle("active", name === "quality");
      }

      function appendCell(row, value) {
        var cell = document.createElement("td");
        cell.textContent = text(value);
        row.appendChild(cell);
      }

      function renderQuality(dataQuality) {
        document.getElementById("confirmedUnits").textContent =
          numberText(dataQuality.confirmedUnits) + " / " + numberText(dataQuality.totalUnits);
        document.getElementById("confirmedChildren").textContent = numberText(dataQuality.confirmedChildren);
        document.getElementById("provisionalChildren").textContent = numberText(dataQuality.provisionalChildren);
        document.getElementById("unitsNeedingFollowUp").textContent = numberText(dataQuality.unitsNeedingFollowUp);

        var body = document.getElementById("qualityRows");
        body.textContent = "";
        (dataQuality.serviceUnits || []).forEach(function (unit) {
          var row = document.createElement("tr");
          appendCell(row, unit.serviceUnitCode + " " + unit.serviceUnitName);
          var status = document.createElement("td");
          var pill = document.createElement("span");
          pill.className = "status-pill";
          pill.textContent = text(unit.baselineStatus);
          status.appendChild(pill);
          row.appendChild(status);
          appendCell(row, numberText(unit.confirmedChildren));
          appendCell(row, numberText(unit.provisionalChildren));
          appendCell(row, numberText(unit.pendingIssueCount));
          appendCell(row, unit.lastUpdatedAt);
          body.appendChild(row);
        });
      }

      function render(model) {
        document.getElementById("progressEmpty").textContent =
          model.vaccineProgress && model.vaccineProgress.message
            ? model.vaccineProgress.message
            : "กำลังเตรียมข้อมูลรายเดือน";
        renderQuality(model.dataQuality);
        setMessage("ข้อมูลล่าสุด: " + text(model.lastUpdatedAt), false);
      }

      function endpointError(error) {
        setMessage(error && error.message ? error.message : error, true);
      }

      document.querySelectorAll(".tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
          switchTab(tab.dataset.tab);
        });
      });

      google.script.run
        .withFailureHandler(endpointError)
        .withSuccessHandler(render)
        .getPublicDashboardModel();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Copy the new HTML in the build**

In `scripts/build.mjs`, add:

```js
await copyFile("src/ui/publicDashboard.html", "dist/publicDashboard.html");
```

Place it beside the existing `adminBaseline.html` copy line.

- [ ] **Step 3: Build**

Run:

```powershell
npm run build
```

Expected: PASS and `dist/publicDashboard.html` exists.

- [ ] **Step 4: Commit**

```powershell
git add src/ui/publicDashboard.html scripts/build.mjs
git commit -m "feat: add public dashboard html"
```

---

### Task 5: Privacy Regression And Build Verification

**Files:**
- Modify: `tests/domain/publicDashboard.test.ts`
- No production file changes unless the test exposes a bug.

- [ ] **Step 1: Add a stronger recursive privacy test**

Append to `tests/domain/publicDashboard.test.ts`:

```ts
  it("keeps public JSON free of child and operational field names", () => {
    const model = buildPublicDashboardModel({
      now: "2026-06-02T08:00:00+07:00",
      serviceUnits,
      baselineBatches: [
        batch({
          batchId: "private-source",
          serviceUnitCode: "09940",
          state: "REJECTED",
          rowCount: 1,
          issues: [{ rowNumber: 2, field: "cid", code: "INVALID_CID", message: "เลข CID ไม่ถูกต้อง" }],
        }),
      ],
    });
    const publicJson = JSON.stringify(model);

    ["cid", "CID", "record_json", "firstName", "lastName", "houseNumber", "primaryVhvName", "rowNumber", "เลข CID ไม่ถูกต้อง"].forEach(
      (forbidden) => expect(publicJson).not.toContain(forbidden),
    );
  });
```

- [ ] **Step 2: Run all tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Inspect build output names**

Run:

```powershell
Get-ChildItem dist | Select-Object -ExpandProperty Name
```

Expected output includes:

```text
Code.js
adminBaseline.html
appsscript.json
publicDashboard.html
```

- [ ] **Step 5: Commit**

```powershell
git add tests/domain/publicDashboard.test.ts
git commit -m "test: guard public dashboard privacy"
```

---

### Task 6: Deployment Notes

**Files:**
- Create: `docs/runbooks/public-aggregate-dashboard.md`

- [ ] **Step 1: Write runbook**

Create `docs/runbooks/public-aggregate-dashboard.md`:

```md
# Public Aggregate Dashboard Runbook

The default Google Apps Script web app URL opens the non-login public aggregate dashboard. It shows aggregate vaccine-progress and data-quality information only.

## Pages

- Public aggregate dashboard: open the web app URL without query parameters.
- Staff operational page: open the web app URL with `?page=staff`.

## Public Data Rules

The public endpoint must return aggregate values only. It must not return child names, CID values, addresses, worker names, row-level validation issue messages, raw records, import row JSON, export records, or audit details.

## First Release Behavior

The vaccine-progress tab opens first. Until monthly reporting aggregates are implemented, it shows `กำลังเตรียมข้อมูลรายเดือน`.

The data-quality tab reads current baseline readiness from Google Sheets and shows service-unit-level aggregate status.

## Verification Before Push

Run:

```powershell
npm test
npm run build
```

Confirm `dist/publicDashboard.html` exists before running `npm run push`.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/runbooks/public-aggregate-dashboard.md
git commit -m "docs: add public dashboard runbook"
```

---

## Final Verification

- [ ] Run all tests:

```powershell
npm test
```

Expected: PASS.

- [ ] Run build:

```powershell
npm run build
```

Expected: PASS.

- [ ] Check git status:

```powershell
git status --short
```

Expected: only unrelated pre-existing files remain modified/untracked, if any.

---

## Spec Coverage Review

- Non-login URL: Task 3 routes default `doGet` to `publicDashboard`.
- Vaccine progress first: Task 4 marks progress tab as selected and visible by default.
- Data-quality tab beside it: Task 4 adds tab and panel.
- Aggregate-only public model: Task 1 model and Task 5 privacy tests.
- Existing baseline readiness in release 1: Task 1 and Task 2 derive aggregate data from baseline batches and active service units.
- No fake vaccine figures: Task 1 returns `NOT_READY`; Task 4 renders the empty state.
- Staff login button: Task 4 links to `?page=staff`.
- Google Apps Script deployment: Task 3 uses HtmlService; Task 4 updates build copy; Task 6 documents push verification.

