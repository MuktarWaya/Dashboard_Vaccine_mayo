# Baseline Registry Import and Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Dashboard Vaccine slice: a validated, district-approved baseline child registry import with service-unit confirmation and explicit confirmed/provisional coverage.

**Architecture:** Create a new TypeScript Google Apps Script web application bound to a controlled Google Sheets datastore. Domain rules are pure TypeScript and unit-tested locally; Apps Script adapters keep validated-but-unapproved rows in staging and promote them into the child registry only after district approval, while a small controlled web view drives staging, approval, unit confirmation, and baseline coverage. This slice deliberately stops before monthly KPI calculation, field-worker mobile entry, or named performance reporting.

**Tech Stack:** Google Apps Script web app, Google Sheets datastore, TypeScript, esbuild bundle, clasp deployment, Vitest unit tests.

---

## Scope And Delivery Split

The repository currently contains the domain decisions, ADRs, and a prototype CSV/Google Sheet reference; it contains no application source or test harness. The documented product is too broad for one safe executable plan, so implementation is split into independently testable slices:

1. **This plan:** validated baseline import, approval, unit confirmation, and confirmed/provisional coverage.
2. **Next plan:** user accounts, role-based access, session handling, and audit foundations.
3. **Next plan:** monthly status carry-forward, exception workflow, submission, close/lock, KPI and incomplete coverage.
4. **Next plan:** field-worker mobile follow-up, proxy/outage entry, and official-status verification.
5. **Next plan:** executive views, restricted worker drill-down, and audited named PDF report.
6. **Next plan:** proactive vaccination activity and alternative-vaccine funnel reporting.
7. **Next plan:** reminders, security incidents, backup/recovery, closed-project state, and launch rehearsal.

This first slice implements ADRs 0020, 0030, 0031 and the baseline-readiness portion of ADRs 0033-0034. ADR 0018 (monthly two-row headers) is implemented in the monthly workflow slice because this plan does not yet create monthly data columns. It must not expose child detail to an executive-facing view, implement KPI evaluation, or infer policy that belongs to the later slices.

## Decision And Input Checkpoints

No additional domain decision is required to build or unit-test this slice. Before importing real records in a dry run, pause for these operational inputs:

- Obtain the approved mapping of all 14 service-unit names to five-digit service-unit codes for `CFG_SERVICE_UNITS`.
- Obtain the appointed district approver identity and one service-unit confirmer identity for the dry-run unit.
- Confirm that the deploying Google Workspace environment exposes signed-in organizational email identity to an `executeAs: USER_ACCESSING` Apps Script web app.
- Confirm which prepared, standardised baseline file will be loaded; the legacy CSV is reference input and is not silently imported as a compliant template.

Decisions already deferred remain outside this slice: retention duration after project close, automatic backup frequency, and the threshold for `มีการบันทึกแทนต่อเนื่อง`.

## Target File Map

| File | Responsibility |
| --- | --- |
| `package.json` | Local build and test commands for the new Apps Script application. |
| `.gitignore` | Exclude local build products, deployment credentials and prototype data exports containing child information. |
| `tsconfig.json` | Strict TypeScript compiler settings and Apps Script types. |
| `appsscript.json` | Apps Script runtime, web-app scope and timezone. |
| `.clasp.json.example` | Deployment configuration template without binding a production Script ID. |
| `scripts/build.mjs` | Bundle TypeScript entry point and copy the Apps Script manifest into `dist/`. |
| `src/domain/baseline.ts` | Canonical baseline row, validation issue, import and coverage types. |
| `src/domain/validateBaseline.ts` | Header and row validation independent of Google Sheets. |
| `src/features/baseline/baselineService.ts` | Stage, approve, confirm and calculate baseline coverage use cases. |
| `src/features/baseline/baselineAccess.ts` | Minimal approver/confirmer authorization required before the broader RBAC slice. |
| `src/infrastructure/sheetsBaselineRepository.ts` | Google Sheets staging, approved registry persistence, configuration and table provisioning. |
| `src/ui/adminBaseline.html` | Administrator baseline-import and coverage view. |
| `src/main.ts` | Apps Script HTTP endpoints exposed to the HTML client. |
| `tests/domain/validateBaseline.test.ts` | Pure validation tests. |
| `tests/features/baselineService.test.ts` | Workflow and coverage tests using an in-memory repository. |
| `tests/features/baselineAccess.test.ts` | Tests that only the configured actor and service-unit scope may approve or confirm a baseline batch. |
| `docs/runbooks/baseline-dry-run.md` | Controlled steps and evidence for the one-unit dry run. |

### Task 1: Bootstrap A Testable Apps Script Project

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tsconfig.json`
- Create: `appsscript.json`
- Create: `.clasp.json.example`
- Create: `scripts/build.mjs`
- Create: `src/main.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Initialize source control for implementation artifacts**

Run:

```powershell
git init
git add CONTEXT.md docs/adr docs/superpowers/plans
git commit -m "docs: capture dashboard vaccine decisions before implementation"
```

Expected: a new repository is initialized and the documented decisions are committed without adding the prototype CSV containing child data.

- [ ] **Step 2: Write the failing test for the initial server identity**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applicationInfo } from "../src/main";

describe("applicationInfo", () => {
  it("identifies the baseline registry slice", () => {
    expect(applicationInfo()).toEqual({
      application: "Dashboard Vaccine",
      capability: "baseline-registry",
      version: "0.1.0",
    });
  });
});
```

- [ ] **Step 3: Add package, compiler, manifest and build configuration**

Create `package.json`:

```json
{
  "name": "dashboard-vaccine-mayo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node scripts/build.mjs",
    "push": "npm run build && clasp push"
  },
  "devDependencies": {
    "@google/clasp": "^3.0.6",
    "@types/google-apps-script": "^1.0.99",
    "esbuild": "^0.25.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.clasp.json
*.csv
*.gsheet
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "types": ["google-apps-script", "vitest/globals"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Create `appsscript.json`:

```json
{
  "timeZone": "Asia/Bangkok",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"
  }
}
```

Create `.clasp.json.example`:

```json
{
  "scriptId": "REPLACE_WITH_DEPLOYMENT_SCRIPT_ID",
  "rootDir": "dist"
}
```

Create `scripts/build.mjs`:

```js
import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/Code.js",
  format: "iife",
  target: "es2020",
  banner: { js: "/* Dashboard Vaccine Apps Script bundle */" },
});
await copyFile("appsscript.json", "dist/appsscript.json");
```

- [ ] **Step 4: Implement the minimal entry point**

Create `src/main.ts`:

```ts
export function applicationInfo() {
  return {
    application: "Dashboard Vaccine",
    capability: "baseline-registry",
    version: "0.1.0",
  } as const;
}

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutput("Dashboard Vaccine baseline registry");
}

Object.assign(globalThis, { doGet });
```

- [ ] **Step 5: Install dependencies and verify the bootstrap**

Run:

```powershell
npm install
npm test
npm run build
```

Expected: `tests/smoke.test.ts` passes and `dist/Code.js` plus `dist/appsscript.json` are generated.

- [ ] **Step 6: Commit the project bootstrap**

Run:

```powershell
git add .gitignore package.json package-lock.json tsconfig.json appsscript.json .clasp.json.example scripts src tests
git commit -m "build: scaffold apps script dashboard project"
```

### Task 2: Define The Standardised Baseline Contract

**Files:**
- Create: `src/domain/baseline.ts`
- Create: `tests/domain/validateBaseline.test.ts`

- [ ] **Step 1: Write tests that establish required machine-readable baseline headers**

Create `tests/domain/validateBaseline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BASELINE_HEADERS } from "../../src/domain/baseline";

describe("BASELINE_HEADERS", () => {
  it("uses stable machine-readable keys for the import template", () => {
    expect(BASELINE_HEADERS).toEqual([
      "cid",
      "service_unit_code",
      "first_name",
      "last_name",
      "sex",
      "birth_date",
      "house_number",
      "village_no",
      "registry_status",
      "baseline_vaccine_status",
      "next_vaccine_due_date",
      "entry_type",
      "indicator_start_month",
      "is_ppa_target",
      "is_alternative_vaccine_target",
      "primary_vhv_name",
      "primary_family_health_volunteer_name",
    ]);
  });
});
```

- [ ] **Step 2: Run the test and confirm that the missing domain module fails**

Run:

```powershell
npx vitest run tests/domain/validateBaseline.test.ts
```

Expected: FAIL because `src/domain/baseline.ts` has not been created.

- [ ] **Step 3: Define the baseline data model and workflow states**

Create `src/domain/baseline.ts`:

```ts
export const BASELINE_HEADERS = [
  "cid",
  "service_unit_code",
  "first_name",
  "last_name",
  "sex",
  "birth_date",
  "house_number",
  "village_no",
  "registry_status",
  "baseline_vaccine_status",
  "next_vaccine_due_date",
  "entry_type",
  "indicator_start_month",
  "is_ppa_target",
  "is_alternative_vaccine_target",
  "primary_vhv_name",
  "primary_family_health_volunteer_name",
] as const;

export type BaselineHeader = (typeof BASELINE_HEADERS)[number];
export const BASELINE_VACCINE_STATUSES = [
  "ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า",
  "ได้รับบางส่วน-ยังไม่ครบเกณฑ์",
  "ได้รับบางส่วน-ล่าช้าต่อเนื่อง",
  "ปฏิเสธการฉีด",
  "ฉีดตามเกณฑ์",
] as const;
export type BaselineApprovalState =
  | "STAGED"
  | "VALIDATED"
  | "REJECTED"
  | "DISTRICT_APPROVED"
  | "UNIT_CONFIRMED";

export interface BaselineRecord {
  cid: string;
  serviceUnitCode: string;
  firstName: string;
  lastName: string;
  sex: "ชาย" | "หญิง";
  birthDate: string;
  houseNumber: string;
  villageNo: string;
  registryStatus: "อยู่ในทะเบียนติดตาม";
  baselineVaccineStatus: (typeof BASELINE_VACCINE_STATUSES)[number];
  nextVaccineDueDate: string;
  entryType: "ทะเบียนตั้งต้น";
  indicatorStartMonth: string;
  isPpaTarget: boolean;
  isAlternativeVaccineTarget: boolean;
  primaryVhvName: string;
  primaryFamilyHealthVolunteerName: string;
}

export interface ValidationIssue {
  rowNumber: number;
  field: string;
  code: string;
  message: string;
}

export interface BaselineBatch {
  batchId: string;
  serviceUnitCode: string;
  state: BaselineApprovalState;
  rowCount: number;
  issues: ValidationIssue[];
  stagedBy: string;
  stagedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface BaselineCoverage {
  confirmedUnits: number;
  totalUnits: number;
  confirmedChildren: number;
  provisionalChildren: number;
}
```

- [ ] **Step 4: Run the domain-contract test**

Run:

```powershell
npx vitest run tests/domain/validateBaseline.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the standardised contract**

Run:

```powershell
git add src/domain/baseline.ts tests/domain/validateBaseline.test.ts
git commit -m "feat: define standard baseline registry contract"
```

### Task 3: Validate Baseline Rows Before Any Import

**Files:**
- Create: `src/domain/validateBaseline.ts`
- Modify: `tests/domain/validateBaseline.test.ts`

- [ ] **Step 1: Add failing validation tests**

Append to `tests/domain/validateBaseline.test.ts`:

```ts
import { validateBaselineRows } from "../../src/domain/validateBaseline";

const validRow = [
  "1234567890123", "95001", "เด็ก", "ตัวอย่าง", "หญิง", "2021-01-15",
  "12", "1", "อยู่ในทะเบียนติดตาม", "ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า", "",
  "ทะเบียนตั้งต้น", "2026-06", "ใช่", "ไม่ใช่", "อสม. ตัวอย่าง", "ผรส. ตัวอย่าง",
];

describe("validateBaselineRows", () => {
  it("accepts a valid row for an approved service-unit code", () => {
    expect(validateBaselineRows(BASELINE_HEADERS, [validRow], "95001", new Set(["95001"]))).toEqual([]);
  });

  it("rejects malformed CID, unknown unit, and missing principal workers", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [["123", "99999", "เด็ก", "ตัวอย่าง", "ชาย", "2021-01-15", "12", "1", "อยู่ในทะเบียนติดตาม", "ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า", "", "ทะเบียนตั้งต้น", "2026-06", "ใช่", "ไม่ใช่", "", ""]],
      "99999",
      new Set(["95001"]),
    );
    expect(issues.map((issue) => issue.code)).toEqual([
      "INVALID_CID",
      "UNKNOWN_SERVICE_UNIT",
      "MISSING_PRIMARY_VHV",
      "MISSING_PRIMARY_FAMILY_VOLUNTEER",
    ]);
  });

  it("rejects duplicate CID values in the staged batch", () => {
    const issues = validateBaselineRows(BASELINE_HEADERS, [validRow, validRow], "95001", new Set(["95001"]));
    expect(issues).toContainEqual(expect.objectContaining({ rowNumber: 3, code: "DUPLICATE_CID" }));
  });

  it("rejects rows belonging to another service unit in the same batch", () => {
    const otherUnitRow = [...validRow];
    otherUnitRow[1] = "95002";
    const issues = validateBaselineRows(BASELINE_HEADERS, [validRow, otherUnitRow], "95001", new Set(["95001", "95002"]));
    expect(issues).toContainEqual(expect.objectContaining({ rowNumber: 3, code: "WRONG_SERVICE_UNIT" }));
  });

  it("rejects an invalid birth date and a vaccine status outside the controlled list", () => {
    const row = [...validRow];
    row[5] = "15/01/2564";
    row[9] = "ไม่ทราบสถานะ";
    const issues = validateBaselineRows(BASELINE_HEADERS, [row], "95001", new Set(["95001"]));
    expect(issues.map((issue) => issue.code)).toEqual(["INVALID_BIRTH_DATE", "INVALID_BASELINE_STATUS"]);
  });

  it("requires a next vaccine due date for a child awaiting the next scheduled dose", () => {
    const row = [...validRow];
    row[9] = "ได้รับบางส่วน-ยังไม่ครบเกณฑ์";
    const issues = validateBaselineRows(BASELINE_HEADERS, [row], "95001", new Set(["95001"]));
    expect(issues).toContainEqual(expect.objectContaining({ code: "MISSING_NEXT_VACCINE_DUE_DATE" }));
  });

  it("requires minimum location and registry-entry fields", () => {
    const row = [...validRow];
    [6, 7, 8, 11, 12].forEach((index) => { row[index] = ""; });
    const issues = validateBaselineRows(BASELINE_HEADERS, [row], "95001", new Set(["95001"]));
    expect(issues.filter((issue) => issue.code === "MISSING_REQUIRED_FIELD").map((issue) => issue.field)).toEqual([
      "house_number", "village_no", "registry_status", "entry_type", "indicator_start_month",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and see the validation module failure**

Run:

```powershell
npx vitest run tests/domain/validateBaseline.test.ts
```

Expected: FAIL because `validateBaselineRows` is missing.

- [ ] **Step 3: Implement header, field and duplicate checks**

Create `src/domain/validateBaseline.ts`:

```ts
import { BASELINE_HEADERS, BASELINE_VACCINE_STATUSES, type ValidationIssue } from "./baseline";

export function validateBaselineRows(
  headers: readonly string[],
  rows: string[][],
  expectedServiceUnitCode: string,
  approvedServiceUnitCodes: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expected = BASELINE_HEADERS.join("|");
  if (headers.join("|") !== expected) {
    return [{ rowNumber: 1, field: "headers", code: "INVALID_HEADERS", message: "หัวคอลัมน์ไม่ตรงกับ template มาตรฐาน" }];
  }
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const [cid, serviceUnitCode, , , , birthDate, , , , baselineStatus, nextDueDate, , , , , primaryVhvName, primaryFamilyName] = row;
    if (!/^\d{13}$/.test(cid)) {
      issues.push({ rowNumber, field: "cid", code: "INVALID_CID", message: "CID ต้องเป็นตัวเลข 13 หลัก" });
    } else if (seen.has(cid)) {
      issues.push({ rowNumber, field: "cid", code: "DUPLICATE_CID", message: "CID ซ้ำในชุดนำเข้า" });
    }
    seen.add(cid);
    if (!approvedServiceUnitCodes.has(serviceUnitCode)) {
      issues.push({ rowNumber, field: "service_unit_code", code: "UNKNOWN_SERVICE_UNIT", message: "ไม่พบรหัสหน่วยบริการที่อนุมัติ" });
    }
    if (serviceUnitCode !== expectedServiceUnitCode) {
      issues.push({ rowNumber, field: "service_unit_code", code: "WRONG_SERVICE_UNIT", message: "ชุดนำเข้าต้องมีเฉพาะหน่วยบริการเดียว" });
    }
    const parsedBirthDate = new Date(`${birthDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(parsedBirthDate.valueOf()) || parsedBirthDate.toISOString().slice(0, 10) !== birthDate) {
      issues.push({ rowNumber, field: "birth_date", code: "INVALID_BIRTH_DATE", message: "วันเกิดต้องเป็นวันที่มาตรฐาน YYYY-MM-DD" });
    }
    if (!(BASELINE_VACCINE_STATUSES as readonly string[]).includes(baselineStatus)) {
      issues.push({ rowNumber, field: "baseline_vaccine_status", code: "INVALID_BASELINE_STATUS", message: "สถานะวัคซีนเดือนฐานไม่อยู่ในรายการมาตรฐาน" });
    }
    if (baselineStatus === "ได้รับบางส่วน-ยังไม่ครบเกณฑ์" && !nextDueDate) {
      issues.push({ rowNumber, field: "next_vaccine_due_date", code: "MISSING_NEXT_VACCINE_DUE_DATE", message: "ต้องระบุวันที่ควรได้รับวัคซีนครั้งถัดไป" });
    }
    ([
      ["house_number", row[6]], ["village_no", row[7]], ["registry_status", row[8]],
      ["entry_type", row[11]], ["indicator_start_month", row[12]],
    ] as const).forEach(([field, value]) => {
      if (!value.trim()) issues.push({ rowNumber, field, code: "MISSING_REQUIRED_FIELD", message: "ต้องระบุข้อมูลเด็กขั้นต่ำ" });
    });
    if (!primaryVhvName.trim()) {
      issues.push({ rowNumber, field: "primary_vhv_name", code: "MISSING_PRIMARY_VHV", message: "ต้องระบุ อสม.หลัก" });
    }
    if (!primaryFamilyName.trim()) {
      issues.push({ rowNumber, field: "primary_family_health_volunteer_name", code: "MISSING_PRIMARY_FAMILY_VOLUNTEER", message: "ต้องระบุ ผรส.หลัก" });
    }
  });
  return issues;
}
```

- [ ] **Step 4: Verify validation tests pass**

Run:

```powershell
npx vitest run tests/domain/validateBaseline.test.ts
```

Expected: PASS for valid input, required-field failures, and duplicate CID detection.

- [ ] **Step 5: Commit validation logic**

Run:

```powershell
git add src/domain/validateBaseline.ts tests/domain/validateBaseline.test.ts
git commit -m "feat: validate standard baseline import rows"
```

### Task 4: Implement Staging, District Approval And Unit Confirmation

**Files:**
- Create: `src/features/baseline/baselineService.ts`
- Create: `tests/features/baselineService.test.ts`

- [ ] **Step 1: Write failing workflow and coverage tests**

Create `tests/features/baselineService.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BaselineService, type BaselineRepository } from "../../src/features/baseline/baselineService";
import type { BaselineBatch } from "../../src/domain/baseline";

class MemoryRepository implements BaselineRepository {
  batches: BaselineBatch[] = [];
  saveBatch(batch: BaselineBatch) { this.batches.push(batch); }
  updateBatch(batch: BaselineBatch) {
    this.batches = this.batches.filter((item) => item.batchId !== batch.batchId).concat(batch);
  }
  getBatch(id: string) { return this.batches.find((item) => item.batchId === id); }
  listBatches() { return this.batches; }
}

describe("BaselineService", () => {
  it("requires successful validation before district approval", () => {
    const repository = new MemoryRepository();
    const service = new BaselineService(repository, 14);
    service.stage({ batchId: "bad", serviceUnitCode: "95001", rowCount: 1, issues: [{ rowNumber: 2, field: "cid", code: "INVALID_CID", message: "bad" }], actor: "district", at: "2026-06-01T09:00:00+07:00" });
    expect(() => service.approve("bad", "district", "2026-06-01T09:10:00+07:00")).toThrow("Batch has validation issues");
  });

  it("does not count children as confirmed until unit confirmation", () => {
    const repository = new MemoryRepository();
    const service = new BaselineService(repository, 14);
    service.stage({ batchId: "ok", serviceUnitCode: "95001", rowCount: 20, issues: [], actor: "district", at: "2026-06-01T09:00:00+07:00" });
    service.approve("ok", "district", "2026-06-01T09:10:00+07:00");
    expect(service.coverage()).toEqual({ confirmedUnits: 0, totalUnits: 14, confirmedChildren: 0, provisionalChildren: 20 });
    service.confirm("ok", "unit-confirmer", "2026-06-02T09:00:00+07:00");
    expect(service.coverage()).toEqual({ confirmedUnits: 1, totalUnits: 14, confirmedChildren: 20, provisionalChildren: 0 });
  });
});
```

- [ ] **Step 2: Run workflow tests and confirm failure**

Run:

```powershell
npx vitest run tests/features/baselineService.test.ts
```

Expected: FAIL because `BaselineService` is missing.

- [ ] **Step 3: Implement the workflow use cases**

Create `src/features/baseline/baselineService.ts`:

```ts
import type { BaselineBatch, BaselineCoverage, ValidationIssue } from "../../domain/baseline";

export interface BaselineRepository {
  saveBatch(batch: BaselineBatch): void;
  updateBatch(batch: BaselineBatch): void;
  getBatch(batchId: string): BaselineBatch | undefined;
  listBatches(): BaselineBatch[];
}

interface StageCommand {
  batchId: string;
  serviceUnitCode: string;
  rowCount: number;
  issues: ValidationIssue[];
  actor: string;
  at: string;
}

export class BaselineService {
  constructor(private readonly repository: BaselineRepository, private readonly totalUnits: number) {}

  stage(command: StageCommand): BaselineBatch {
    const batch: BaselineBatch = {
      batchId: command.batchId,
      serviceUnitCode: command.serviceUnitCode,
      state: command.issues.length === 0 ? "VALIDATED" : "REJECTED",
      rowCount: command.rowCount,
      issues: command.issues,
      stagedBy: command.actor,
      stagedAt: command.at,
    };
    this.repository.saveBatch(batch);
    return batch;
  }

  approve(batchId: string, actor: string, at: string): BaselineBatch {
    const batch = this.requiredBatch(batchId);
    if (batch.state !== "VALIDATED") throw new Error("Batch has validation issues");
    const approved = { ...batch, state: "DISTRICT_APPROVED" as const, approvedBy: actor, approvedAt: at };
    this.repository.updateBatch(approved);
    return approved;
  }

  confirm(batchId: string, actor: string, at: string): BaselineBatch {
    const batch = this.requiredBatch(batchId);
    if (batch.state !== "DISTRICT_APPROVED") throw new Error("Batch is not district approved");
    const confirmed = { ...batch, state: "UNIT_CONFIRMED" as const, confirmedBy: actor, confirmedAt: at };
    this.repository.updateBatch(confirmed);
    return confirmed;
  }

  coverage(): BaselineCoverage {
    return this.repository.listBatches().reduce(
      (result, batch) => {
        if (batch.state === "UNIT_CONFIRMED") {
          result.confirmedUnits += 1;
          result.confirmedChildren += batch.rowCount;
        } else if (batch.state === "DISTRICT_APPROVED") {
          result.provisionalChildren += batch.rowCount;
        }
        return result;
      },
      { confirmedUnits: 0, totalUnits: this.totalUnits, confirmedChildren: 0, provisionalChildren: 0 },
    );
  }

  private requiredBatch(batchId: string): BaselineBatch {
    const batch = this.repository.getBatch(batchId);
    if (!batch) throw new Error("Unknown baseline batch");
    return batch;
  }
}
```

- [ ] **Step 4: Verify workflow tests**

Run:

```powershell
npx vitest run tests/features/baselineService.test.ts
```

Expected: PASS, proving that provisional imported rows are not reported as confirmed baseline rows.

- [ ] **Step 5: Commit the baseline workflow**

Run:

```powershell
git add src/features/baseline/baselineService.ts tests/features/baselineService.test.ts
git commit -m "feat: add baseline approval and confirmation workflow"
```

### Task 5: Persist Controlled Baseline Tables In Google Sheets

**Files:**
- Create: `src/infrastructure/sheetsBaselineRepository.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Add a repository contract test for workflow state serialisation**

Append to `tests/features/baselineService.test.ts`:

```ts
import { approvedRegistryRows, baselineBatchToRow, baselineRowToBatch } from "../../src/infrastructure/sheetsBaselineRepository";

describe("baseline sheet serialisation", () => {
  it("round-trips an approved batch without losing the audit identity", () => {
    const batch: BaselineBatch = {
      batchId: "batch-1", serviceUnitCode: "95001", state: "DISTRICT_APPROVED",
      rowCount: 20, issues: [], stagedBy: "importer", stagedAt: "2026-06-01T09:00:00+07:00",
      approvedBy: "approver", approvedAt: "2026-06-01T10:00:00+07:00",
    };
    expect(baselineRowToBatch(baselineBatchToRow(batch))).toEqual(batch);
  });

  it("promotes only staged rows belonging to the approved batch", () => {
    const staged = [["batch-1", "111", "95001", "{}"], ["batch-2", "222", "95002", "{}"]];
    expect(approvedRegistryRows("batch-1", staged)).toEqual([["batch-1", "111", "95001", "{}"]]);
  });
});
```

- [ ] **Step 2: Run the serialisation test and confirm failure**

Run:

```powershell
npx vitest run tests/features/baselineService.test.ts
```

Expected: FAIL because the Sheets repository is missing.

- [ ] **Step 3: Implement sheet table names, serialisation and Apps Script repository**

Create `src/infrastructure/sheetsBaselineRepository.ts`:

```ts
import type { BaselineBatch } from "../domain/baseline";
import type { BaselineRepository } from "../features/baseline/baselineService";

export const TABLES = {
  serviceUnits: "CFG_SERVICE_UNITS",
  baselineUsers: "CFG_BASELINE_USERS",
  baselineBatches: "BASELINE_BATCHES",
  baselineStaging: "BASELINE_STAGING",
  childRegistry: "CHILD_REGISTRY",
} as const;

const BATCH_HEADERS = [
  "batch_id", "service_unit_code", "state", "row_count", "issues_json",
  "staged_by", "staged_at", "approved_by", "approved_at", "confirmed_by", "confirmed_at",
];

export function baselineBatchToRow(batch: BaselineBatch): unknown[] {
  return [
    batch.batchId, batch.serviceUnitCode, batch.state, batch.rowCount, JSON.stringify(batch.issues),
    batch.stagedBy, batch.stagedAt, batch.approvedBy ?? "", batch.approvedAt ?? "",
    batch.confirmedBy ?? "", batch.confirmedAt ?? "",
  ];
}

export function baselineRowToBatch(row: unknown[]): BaselineBatch {
  const [batchId, serviceUnitCode, state, rowCount, issuesJson, stagedBy, stagedAt, approvedBy, approvedAt, confirmedBy, confirmedAt] = row.map(String);
  return {
    batchId, serviceUnitCode, state: state as BaselineBatch["state"], rowCount: Number(rowCount),
    issues: JSON.parse(issuesJson),
    stagedBy, stagedAt,
    ...(approvedBy ? { approvedBy, approvedAt } : {}),
    ...(confirmedBy ? { confirmedBy, confirmedAt } : {}),
  };
}

export function approvedRegistryRows(batchId: string, stagedRows: unknown[][]): unknown[][] {
  return stagedRows.filter((row) => String(row[0]) === batchId);
}

export class SheetsBaselineRepository implements BaselineRepository {
  constructor(private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {}

  provision(): void {
    this.ensureSheet(TABLES.baselineBatches, BATCH_HEADERS);
    this.ensureSheet(TABLES.baselineStaging, ["batch_id", "cid", "service_unit_code", "record_json"]);
    this.ensureSheet(TABLES.childRegistry, ["approved_batch_id", "cid", "service_unit_code", "record_json"]);
    this.ensureSheet(TABLES.serviceUnits, ["service_unit_code", "service_unit_name", "active"]);
    this.ensureSheet(TABLES.baselineUsers, ["email", "baseline_role", "service_unit_code", "active"]);
  }

  saveBatch(batch: BaselineBatch): void {
    this.batchSheet().appendRow(baselineBatchToRow(batch));
  }

  updateBatch(batch: BaselineBatch): void {
    const sheet = this.batchSheet();
    const rows = sheet.getDataRange().getValues();
    const index = rows.findIndex((row, i) => i > 0 && String(row[0]) === batch.batchId);
    if (index < 1) throw new Error("Unknown baseline batch");
    sheet.getRange(index + 1, 1, 1, BATCH_HEADERS.length).setValues([baselineBatchToRow(batch)]);
  }

  getBatch(batchId: string): BaselineBatch | undefined {
    return this.listBatches().find((batch) => batch.batchId === batchId);
  }

  listBatches(): BaselineBatch[] {
    return this.batchSheet().getDataRange().getValues().slice(1).filter((row) => row[0]).map(baselineRowToBatch);
  }

  saveStagedRecords(batchId: string, rows: string[][]): void {
    if (rows.length === 0) return;
    const sheet = this.spreadsheet.getSheetByName(TABLES.baselineStaging);
    if (!sheet) throw new Error("Baseline tables are not provisioned");
    const values = rows.map((row) => [batchId, row[0], row[1], JSON.stringify(row)]);
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, 4).setValues(values);
  }

  promoteApprovedRecords(batchId: string): void {
    const staging = this.spreadsheet.getSheetByName(TABLES.baselineStaging);
    const registry = this.spreadsheet.getSheetByName(TABLES.childRegistry);
    if (!staging || !registry) throw new Error("Baseline tables are not provisioned");
    const values = approvedRegistryRows(batchId, staging.getDataRange().getValues().slice(1));
    if (values.length === 0) throw new Error("No staged records for approved batch");
    registry.getRange(registry.getLastRow() + 1, 1, values.length, 4).setValues(values);
  }

  getApprovedServiceUnitCodes(): Set<string> {
    const sheet = this.spreadsheet.getSheetByName(TABLES.serviceUnits);
    if (!sheet) throw new Error("Service unit configuration is missing");
    const values = sheet.getDataRange().getValues().slice(1);
    return new Set(values.filter((row) => String(row[2]).toUpperCase() === "TRUE").map((row) => String(row[0])));
  }

  private batchSheet() {
    const sheet = this.spreadsheet.getSheetByName(TABLES.baselineBatches);
    if (!sheet) throw new Error("Baseline tables are not provisioned");
    return sheet;
  }

  private ensureSheet(name: string, headers: string[]): void {
    const sheet = this.spreadsheet.getSheetByName(name) ?? this.spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  }
}
```

- [ ] **Step 4: Expose an administrator-only provisioning entry function**

Replace `src/main.ts` with:

```ts
import { SheetsBaselineRepository } from "./infrastructure/sheetsBaselineRepository";

export function applicationInfo() {
  return { application: "Dashboard Vaccine", capability: "baseline-registry", version: "0.1.0" } as const;
}

function provisionBaselineTables(): { status: string } {
  const repository = new SheetsBaselineRepository(SpreadsheetApp.getActive());
  repository.provision();
  return { status: "BASELINE_TABLES_READY" };
}

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutput("Dashboard Vaccine baseline registry");
}

Object.assign(globalThis, { doGet, provisionBaselineTables });
```

- [ ] **Step 5: Run tests and produce the Apps Script bundle**

Run:

```powershell
npm test
npm run build
```

Expected: all tests pass; the bundle contains the globally exposed `provisionBaselineTables` function for an administrator to execute once.

- [ ] **Step 6: Commit Sheets persistence**

Run:

```powershell
git add src/infrastructure/sheetsBaselineRepository.ts src/main.ts tests/features/baselineService.test.ts
git commit -m "feat: persist baseline workflow in controlled sheets"
```

### Task 6: Restrict Baseline Actions And Wire Import Transitions

**Files:**
- Create: `src/features/baseline/baselineAccess.ts`
- Create: `tests/features/baselineAccess.test.ts`
- Modify: `src/infrastructure/sheetsBaselineRepository.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write failing access-control tests**

Create `tests/features/baselineAccess.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertBaselineAction, type BaselineActor } from "../../src/features/baseline/baselineAccess";
import type { BaselineBatch } from "../../src/domain/baseline";

const batch: BaselineBatch = {
  batchId: "batch-1", serviceUnitCode: "95001", state: "DISTRICT_APPROVED", rowCount: 20,
  issues: [], stagedBy: "importer@example.go.th", stagedAt: "2026-06-01T09:00:00+07:00",
};
const district: BaselineActor = { email: "district@example.go.th", role: "DISTRICT_APPROVER", serviceUnitCode: "" };
const unit: BaselineActor = { email: "unit@example.go.th", role: "UNIT_CONFIRMER", serviceUnitCode: "95001" };

describe("assertBaselineAction", () => {
  it("allows the configured district approver to stage and approve", () => {
    expect(() => assertBaselineAction("STAGE", district)).not.toThrow();
    expect(() => assertBaselineAction("APPROVE", district, batch)).not.toThrow();
  });

  it("allows a confirmer only for its own approved unit batch", () => {
    expect(() => assertBaselineAction("CONFIRM", unit, batch)).not.toThrow();
    expect(() => assertBaselineAction("CONFIRM", { ...unit, serviceUnitCode: "95002" }, batch)).toThrow("Outside service-unit scope");
  });

  it("prevents a unit confirmer from approving imports", () => {
    expect(() => assertBaselineAction("APPROVE", unit, batch)).toThrow("District approver required");
  });
});
```

- [ ] **Step 2: Run the access tests and confirm failure**

Run:

```powershell
npx vitest run tests/features/baselineAccess.test.ts
```

Expected: FAIL because `baselineAccess.ts` is missing.

- [ ] **Step 3: Implement the minimal baseline action guard**

Create `src/features/baseline/baselineAccess.ts`:

```ts
import type { BaselineBatch } from "../../domain/baseline";

export interface BaselineActor {
  email: string;
  role: "DISTRICT_APPROVER" | "UNIT_CONFIRMER";
  serviceUnitCode: string;
}

export function assertBaselineAction(
  action: "STAGE" | "APPROVE" | "CONFIRM",
  actor: BaselineActor,
  batch?: BaselineBatch,
): void {
  if (action === "STAGE" || action === "APPROVE") {
    if (actor.role !== "DISTRICT_APPROVER") throw new Error("District approver required");
    return;
  }
  if (actor.role !== "UNIT_CONFIRMER") throw new Error("Unit confirmer required");
  if (!batch || actor.serviceUnitCode !== batch.serviceUnitCode) throw new Error("Outside service-unit scope");
}
```

- [ ] **Step 4: Read the signed-in actor from `CFG_BASELINE_USERS`**

Add to `src/infrastructure/sheetsBaselineRepository.ts`:

```ts
import type { BaselineActor } from "../features/baseline/baselineAccess";

getActor(email: string): BaselineActor {
  const sheet = this.spreadsheet.getSheetByName(TABLES.baselineUsers);
  if (!sheet) throw new Error("Baseline user configuration is missing");
  const row = sheet.getDataRange().getValues().slice(1).find((value) =>
    String(value[0]).toLowerCase() === email.toLowerCase() && String(value[3]).toUpperCase() === "TRUE",
  );
  if (!row) throw new Error("Not authorized for baseline workflow");
  return { email, role: String(row[1]) as BaselineActor["role"], serviceUnitCode: String(row[2]) };
}
```

- [ ] **Step 5: Wire validation, storage, approval and confirmation endpoints**

Replace `src/main.ts` with:

```ts
import { validateBaselineRows } from "./domain/validateBaseline";
import { assertBaselineAction } from "./features/baseline/baselineAccess";
import { BaselineService } from "./features/baseline/baselineService";
import { SheetsBaselineRepository } from "./infrastructure/sheetsBaselineRepository";

export function applicationInfo() {
  return { application: "Dashboard Vaccine", capability: "baseline-registry", version: "0.1.0" } as const;
}

function repository(): SheetsBaselineRepository {
  return new SheetsBaselineRepository(SpreadsheetApp.getActive());
}

function actor(repo: SheetsBaselineRepository) {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error("Signed-in organizational account required");
  return repo.getActor(email);
}

function provisionBaselineTables(): { status: string } {
  repository().provision();
  return { status: "BASELINE_TABLES_READY" };
}

function stageBaselineRows(serviceUnitCode: string, headers: string[], rows: string[][]) {
  const repo = repository();
  const currentActor = actor(repo);
  assertBaselineAction("STAGE", currentActor);
  const issues = validateBaselineRows(headers, rows, serviceUnitCode, repo.getApprovedServiceUnitCodes());
  const batchId = Utilities.getUuid();
  const service = new BaselineService(repo, 14);
  const batch = service.stage({
    batchId, serviceUnitCode, rowCount: rows.length, issues,
    actor: currentActor.email, at: new Date().toISOString(),
  });
  if (batch.state === "VALIDATED") repo.saveStagedRecords(batchId, rows);
  return batch;
}

function approveBaselineBatch(batchId: string) {
  const repo = repository();
  const currentActor = actor(repo);
  const service = new BaselineService(repo, 14);
  const batch = repo.getBatch(batchId);
  assertBaselineAction("APPROVE", currentActor, batch);
  const approved = service.approve(batchId, currentActor.email, new Date().toISOString());
  repo.promoteApprovedRecords(batchId);
  return approved;
}

function confirmBaselineBatch(batchId: string) {
  const repo = repository();
  const currentActor = actor(repo);
  const service = new BaselineService(repo, 14);
  const batch = repo.getBatch(batchId);
  assertBaselineAction("CONFIRM", currentActor, batch);
  return service.confirm(batchId, currentActor.email, new Date().toISOString());
}

function getBaselineAdminModel() {
  const repo = repository();
  actor(repo);
  const service = new BaselineService(repo, 14);
  return { coverage: service.coverage(), batches: repo.listBatches() };
}

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("adminBaseline").setTitle("Dashboard Vaccine - ทะเบียนตั้งต้น");
}

Object.assign(globalThis, {
  doGet, provisionBaselineTables, stageBaselineRows, approveBaselineBatch,
  confirmBaselineBatch, getBaselineAdminModel,
});
```

- [ ] **Step 6: Verify access and workflow tests**

Run:

```powershell
npm test
npm run build
```

Expected: access-control and baseline-service tests pass; the Apps Script bundle exposes the controlled baseline transitions.

- [ ] **Step 7: Commit baseline action controls**

Run:

```powershell
git add src/features/baseline/baselineAccess.ts tests/features/baselineAccess.test.ts src/infrastructure/sheetsBaselineRepository.ts src/main.ts
git commit -m "feat: control baseline approval and confirmation actions"
```

### Task 7: Add The Baseline Administration Web View

**Files:**
- Create: `src/ui/adminBaseline.html`
- Modify: `tests/features/baselineService.test.ts`

- [ ] **Step 1: Extend repository tests to require confirmed/provisional coverage output**

Append to `tests/features/baselineService.test.ts`:

```ts
describe("coverage display model", () => {
  it("formats coverage without presenting provisional children as confirmed", () => {
    const service = new BaselineService(new MemoryRepository(), 14);
    service.stage({ batchId: "ok", serviceUnitCode: "95001", rowCount: 20, issues: [], actor: "district", at: "2026-06-01T09:00:00+07:00" });
    service.approve("ok", "district", "2026-06-01T10:00:00+07:00");
    expect(service.coverage()).toMatchObject({ confirmedUnits: 0, provisionalChildren: 20 });
  });
});
```

- [ ] **Step 2: Create a minimal controlled administrator page**

Create `src/ui/adminBaseline.html`:

```html
<!doctype html>
<html lang="th">
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <title>Dashboard Vaccine - ทะเบียนตั้งต้น</title>
    <style>
      body { font: 16px Arial, sans-serif; margin: 24px; color: #1f2937; }
      .notice { padding: 12px; background: #fef3c7; margin: 16px 0; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    </style>
  </head>
  <body>
    <h1>ทะเบียนตั้งต้น</h1>
    <p class="notice">ยอดที่ยังไม่รับรองเป็นข้อมูลชั่วคราวและไม่ใช่ฐาน KPI ยืนยันแล้ว</p>
    <label>รหัสหน่วยบริการ <input id="serviceUnitCode" maxlength="5"></label>
    <p><label>วางข้อมูล template แบบ tab-separated พร้อมหัวคอลัมน์<br>
      <textarea id="stagingData" rows="8" cols="100"></textarea>
    </label></p>
    <button type="button" onclick="stageRows()">ตรวจและจัดชุดนำเข้า</button>
    <p id="message"></p>
    <section id="coverage">กำลังโหลดสถานะ...</section>
    <table>
      <thead><tr><th>หน่วยบริการ</th><th>สถานะชุดนำเข้า</th><th>จำนวนเด็ก</th></tr></thead>
      <tbody id="batches"></tbody>
    </table>
    <script>
      function refresh() { google.script.run.withSuccessHandler(function (model) {
        document.getElementById("coverage").textContent =
          "ฐานยืนยันแล้ว " + model.coverage.confirmedUnits + " จาก " + model.coverage.totalUnits +
          " หน่วยบริการ; เด็กในชุดรอรับรอง " + model.coverage.provisionalChildren + " ราย";
        document.getElementById("batches").innerHTML = model.batches.map(function (batch) {
          return "<tr><td>" + batch.serviceUnitCode + "</td><td>" + batch.state + "</td><td>" + batch.rowCount +
            "</td><td><button onclick=\"approve('" + batch.batchId + "')\">อนุมัติ</button> " +
            "<button onclick=\"confirmBatch('" + batch.batchId + "')\">รับรอง</button></td></tr>";
        }).join("");
      }).getBaselineAdminModel();
      }
      function stageRows() {
        var lines = document.getElementById("stagingData").value.trim().split(/\r?\n/).map(function (line) { return line.split("\t"); });
        google.script.run.withSuccessHandler(function (batch) {
          document.getElementById("message").textContent = batch.state + " : พบปัญหา " + batch.issues.length + " รายการ";
          refresh();
        }).stageBaselineRows(document.getElementById("serviceUnitCode").value, lines[0], lines.slice(1));
      }
      function approve(batchId) {
        google.script.run.withSuccessHandler(refresh).approveBaselineBatch(batchId);
      }
      function confirmBatch(batchId) {
        google.script.run.withSuccessHandler(refresh).confirmBaselineBatch(batchId);
      }
      refresh();
    </script>
  </body>
</html>
```

- [ ] **Step 3: Copy HTML during bundling and verify no child rows enter the admin coverage page**

Add imports and copy operation to `scripts/build.mjs`:

```js
import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await build({ entryPoints: ["src/main.ts"], bundle: true, outfile: "dist/Code.js", format: "iife", target: "es2020" });
await copyFile("appsscript.json", "dist/appsscript.json");
await copyFile("src/ui/adminBaseline.html", "dist/adminBaseline.html");
```

Run:

```powershell
npm test
npm run build
rg "firstName|lastName|cid|record_json" src/ui/adminBaseline.html src/main.ts
```

Expected: tests and build pass; `rg` returns no matches because the baseline coverage view receives batch totals and states only.

- [ ] **Step 4: Commit the controlled view**

Run:

```powershell
git add src/ui/adminBaseline.html scripts/build.mjs tests/features/baselineService.test.ts
git commit -m "feat: show baseline confirmation coverage without child detail"
```

### Task 8: Record The One-Unit Dry Run Procedure

**Files:**
- Create: `docs/runbooks/baseline-dry-run.md`

- [ ] **Step 1: Write the dry-run runbook**

Create `docs/runbooks/baseline-dry-run.md`:

```markdown
# Baseline Registry Dry Run

## Purpose

Verify standardised import, automatic validation, district approval, service-unit confirmation and aggregate coverage using one service unit before district-wide import.

## Required Evidence

- Approved `CFG_SERVICE_UNITS` row for the selected unit, using its official five-digit code.
- Named district approver and named confirmer for the selected service unit, entered in `CFG_BASELINE_USERS`.
- Standardised baseline file with machine-readable headers matching `BASELINE_HEADERS`.
- Validation result, import batch ID, approval timestamp and unit-confirmation timestamp.

## Procedure

1. Deploy the test web app against a dry-run spreadsheet and run `provisionBaselineTables`.
2. Add only the approved dry-run unit to `CFG_SERVICE_UNITS` and the appointed actors to `CFG_BASELINE_USERS`; do not load the other units during this rehearsal.
3. Stage the standardised file and resolve every validation issue before district approval.
4. Confirm that validated rows remain in `BASELINE_STAGING` and do not appear in `CHILD_REGISTRY` before district approval.
5. Approve the clean batch as the district approver, confirm that the approved rows enter `CHILD_REGISTRY`, and confirm that the page shows its children only as provisional.
6. Confirm the imported baseline as the service-unit confirmer and confirm that coverage changes to `1 จาก 14 หน่วยบริการ`.
7. Inspect the staging and batch tables for recorded actor and timestamps.
8. Record pass/fail results; do not reuse a failed dry-run spreadsheet as the production data store.

## Pass Criteria

- Invalid CID, unknown unit code, duplicate CID and missing principal worker data are rejected.
- Validated rows cannot enter `CHILD_REGISTRY` before district approval.
- A user outside `CFG_BASELINE_USERS`, a non-approver, or a confirmer from another unit cannot execute the controlled transition.
- A clean batch cannot count as confirmed before service-unit confirmation.
- The coverage view contains counts and status only, with no child name or CID.
- The batch record identifies staging, approval and confirmation actions with timestamps.
```

- [ ] **Step 2: Run local verification for the planned slice**

Run:

```powershell
npm test
npm run build
```

Expected: all tests pass and the deployable Apps Script bundle is created before a dry-run spreadsheet is touched.

- [ ] **Step 3: Commit the dry-run instructions**

Run:

```powershell
git add docs/runbooks/baseline-dry-run.md
git commit -m "docs: add baseline registry dry run procedure"
```

## Completion Gate For This Slice

Do not begin the monthly KPI implementation plan until all conditions below are true:

- The one-unit dry run passes validation, approval, confirmation and coverage-display checks.
- The approved 14-unit code/name mapping is available for district-wide baseline configuration.
- The district system owner identifies the accounts responsible for production import approval and unit confirmation.
- The baseline coverage page clearly separates confirmed totals from provisional or unresolved imports.

Once this gate passes, write the next detailed plan for accounts, permissions and audit foundations before modifying monthly reporting behaviour.
