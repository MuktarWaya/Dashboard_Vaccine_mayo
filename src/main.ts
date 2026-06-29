import type { BaselineBatch } from "./domain/baseline";
import { acceptedBaselineDuplicateIssues } from "./domain/baselineExistingDuplicate";
import { buildPublicDashboardModel } from "./domain/publicDashboard";
import { validateBaselineRows } from "./domain/validateBaseline";
import { assertBaselineAction, type BaselineActor } from "./features/baseline/baselineAccess";
import {
  BaselineService,
  duplicateServiceUnitBaselineIssues,
} from "./features/baseline/baselineService";
import { SheetsBaselineRepository } from "./infrastructure/sheetsBaselineRepository";

// Vaccine monthly imports
import { VaccineMonthlyRepository } from "./infrastructure/vaccineMonthlyRepository";
import { SERVICE_UNIT_CONFIGS, validateServiceUnitConfigs } from "./config/serviceUnits";
import type { PublicVaccineDashboardModel } from "./domain/vaccineMonthly";

export const DISTRICT_SERVICE_UNIT_TOTAL = 14;
export const DEFAULT_DASHBOARD_SPREADSHEET_ID = "1H4ShB4fZCHt22J8coGXHn1KDgykjrxi3TueJDJ9ZoA8";
export const DASHBOARD_SPREADSHEET_ID_PROPERTY = "DASHBOARD_VACCINE_SPREADSHEET_ID";

// Vaccine monthly configuration
export const VACCINE_SERVICE_UNIT_CONFIGS_PROPERTY = "VACCINE_SERVICE_UNIT_CONFIGS";
export const DEFAULT_REPORT_MONTH = new Date().toISOString().slice(0, 7); // format: YYYY-MM

interface AppsScriptGetEvent {
  parameter?: Record<string, string | undefined>;
}

export function applicationInfo() {
  return { application: "Dashboard Vaccine", capability: "baseline-registry", version: "0.1.0" } as const;
}

function repository(): SheetsBaselineRepository {
  return new SheetsBaselineRepository(dashboardSpreadsheet());
}

function dashboardSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const configuredId = PropertiesService.getScriptProperties()
    .getProperty(DASHBOARD_SPREADSHEET_ID_PROPERTY)
    ?.trim();

  return SpreadsheetApp.openById(configuredId || DEFAULT_DASHBOARD_SPREADSHEET_ID);
}

function actor(repo: SheetsBaselineRepository): BaselineActor {
  const email = Session.getActiveUser().getEmail();
  if (!email) {
    throw new Error("Signed-in organizational account required");
  }

  return repo.getActor(email);
}

function service(repo: SheetsBaselineRepository): BaselineService {
  return new BaselineService(repo, DISTRICT_SERVICE_UNIT_TOTAL);
}

export function batchesVisibleToActor(actor: BaselineActor, batches: BaselineBatch[]): BaselineBatch[] {
  if (actor.role === "DISTRICT_APPROVER") {
    return batches;
  }

  return batches.filter((batch) => batch.serviceUnitCode === actor.serviceUnitCode);
}

export function approveAndPromoteBaselineBatch(
  repo: Pick<SheetsBaselineRepository, "getBatch" | "assertStagedRecordsExist" | "updateBatch" | "promoteApprovedRecords">,
  workflow: Pick<BaselineService, "approve">,
  activeActor: BaselineActor,
  batchId: string,
  at: string,
): BaselineBatch {
  const previous = repo.getBatch(batchId);
  assertBaselineAction("APPROVE", activeActor, previous);
  repo.assertStagedRecordsExist(batchId);

  const approved = workflow.approve(batchId, activeActor.email, at);
  try {
    repo.promoteApprovedRecords(batchId);
  } catch (error) {
    if (previous) {
      repo.updateBatch(previous);
    }
    throw error;
  }

  return approved;
}

function provisionBaselineTables(): { status: string } {
  const repo = repository();
  repo.provision();
  return { status: "BASELINE_TABLES_READY" };
}

function stageBaselineRows(
  serviceUnitCode: string,
  headers: readonly string[],
  rows: string[][],
) {
  const repo = repository();
  const activeActor = actor(repo);
  assertBaselineAction("STAGE", activeActor);
  const lock = LockService.getDocumentLock();

  lock.waitLock(30_000);
  try {
    const approvedServiceUnitCodes = repo.getApprovedServiceUnitCodes();
    const issues = [
      ...validateBaselineRows(headers, rows, serviceUnitCode, approvedServiceUnitCodes),
      ...acceptedBaselineDuplicateIssues(rows, repo.getAcceptedBaselineCids()),
      ...duplicateServiceUnitBaselineIssues(serviceUnitCode, repo.listBatches()),
    ];
    const batchId = Utilities.getUuid();
    if (issues.length === 0) {
      repo.saveStagedRecords(batchId, rows);
    }

    const batch = service(repo).stage({
      batchId,
      serviceUnitCode,
      rowCount: rows.length,
      issues,
      actor: activeActor.email,
      at: new Date().toISOString(),
    });

    return batch;
  } finally {
    lock.releaseLock();
  }
}

function approveBaselineBatch(batchId: string) {
  const repo = repository();
  const activeActor = actor(repo);
  const workflow = service(repo);
  const lock = LockService.getDocumentLock();

  lock.waitLock(30_000);
  try {
    return approveAndPromoteBaselineBatch(repo, workflow, activeActor, batchId, new Date().toISOString());
  } finally {
    lock.releaseLock();
  }
}

function confirmBaselineBatch(batchId: string) {
  const repo = repository();
  const activeActor = actor(repo);
  const workflow = service(repo);
  const batch = repo.getBatch(batchId);
  assertBaselineAction("CONFIRM", activeActor, batch);

  return workflow.confirm(batchId, activeActor.email, new Date().toISOString());
}

function getBaselineAdminModel() {
  const repo = repository();
  const activeActor = actor(repo);
  const workflow = service(repo);

  return {
    coverage: workflow.coverage(),
    batches: batchesVisibleToActor(activeActor, repo.listBatches()),
  };
}

function getPublicDashboardModel() {
  const repo = repository();

  return buildPublicDashboardModel({
    lastUpdatedAt: new Date().toISOString(),
    serviceUnits: repo.listActiveServiceUnits(),
    batches: repo.listBatches(),
    totalUnits: DISTRICT_SERVICE_UNIT_TOTAL,
  });
}

// ============================================================================
// VACCINE MONTHLY DATA FUNCTIONS
// ============================================================================

/**
 * ตรวจสอบ configuration ก่อนใช้งาน
 * คืนค่า error ถ้ามี spreadsheetId ว่าง
 */
function validateConfigs() {
  const validation = validateServiceUnitConfigs();
  if (!validation.valid) {
    let errorMsg = "Configuration Errors:\n" + validation.errors.join("\n");
    if (validation.warnings.length > 0) {
      errorMsg += "\n\nWarnings:\n" + validation.warnings.join("\n");
    }
    throw new Error(errorMsg);
  }
  if (validation.warnings.length > 0) {
    console.warn("Configuration Warnings:\n" + validation.warnings.join("\n"));
  }
  return validation;
}

/**
 * ดึง configuration สำหรับ 13 รพ.สต.
 * ใช้ configs จาก serviceUnits.ts
 */
function getServiceUnitConfigs() {
  return SERVICE_UNIT_CONFIGS;
}

/**
 * สร้าง VaccineMonthlyRepository instance
 */
function vaccineMonthlyRepo(): VaccineMonthlyRepository {
  return new VaccineMonthlyRepository(getServiceUnitConfigs());
}

/**
 * ดึงข้อมูลวัคซีนรายเดือนแบบ aggregate สำหรับ public dashboard
 */
export function getVaccineMonthlyPublicDashboard(reportMonth?: string): PublicVaccineDashboardModel {
  const repo = vaccineMonthlyRepo();
  const month = reportMonth || DEFAULT_REPORT_MONTH;

  const result = repo.fetchMonthlyData({
    reportMonth: month,
    serviceUnitConfigs: getServiceUnitConfigs(),
  });

  // ส่งคืน public model (ไม่มีข้อมูลระบุตัวตน)
  return repo.buildPublicDashboard(result.summary);
}

/**
 * ดึงข้อมูลวัคซีนรายเดือนแบบละเอียด (สำหรับ admin)
 * ต้อง login และมีสิทธิ์
 */
export function getVaccineMonthlyAdminData(reportMonth?: string) {
  const repo = vaccineMonthlyRepo();
  const month = reportMonth || DEFAULT_REPORT_MONTH;
  const activeUser = Session.getActiveUser().getEmail();

  if (!activeUser) {
    throw new Error("Authentication required");
  }

  const result = repo.fetchMonthlyData({
    reportMonth: month,
    serviceUnitConfigs: getServiceUnitConfigs(),
  });

  return {
    fetchedBy: activeUser,
    fetchedAt: new Date().toISOString(),
    ...result,
  };
}

/**
 * API endpoint สำหรับดึงข้อมูลวัคซีนรายเดือน (JSON API)
 * ใช้สำหรับ frontend dashboard ที่ deploy บน Netlify
 */
export function fetchVaccineMonthlyData(event?: AppsScriptGetEvent) {
  try {
    const reportMonth = event?.parameter?.month || DEFAULT_REPORT_MONTH;
    const isAdmin = event?.parameter?.admin === "true";

    if (isAdmin) {
      const data = getVaccineMonthlyAdminData(reportMonth);
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      const data = getVaccineMonthlyPublicDashboard(reportMonth);
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

export function publicDashboardPageForRequest(event?: AppsScriptGetEvent): "publicDashboard" | "adminBaseline" {
  return event?.parameter?.page === "staff" ? "adminBaseline" : "publicDashboard";
}

function doGet(event?: AppsScriptGetEvent): GoogleAppsScript.HTML.HtmlOutput | ContentService.TextOutput {
  // ตรวจสอบว่าเป็นการเรียก API แบบ JSON หรือไม่
  if (event?.parameter?.format === "json" || event?.parameter?.action === "fetch") {
    return fetchVaccineMonthlyData(event);
  }

  // ถ้าไม่ใช่ API ให้ render HTML page เหมือนเดิม
  const page = publicDashboardPageForRequest(event);
  const title =
    page === "publicDashboard"
      ? "Dashboard Vaccine - อำเภอมายอ"
      : "Dashboard Vaccine - ทะเบียนตั้งต้น";

  return HtmlService.createHtmlOutputFromFile(page).setTitle(title);
}

Object.assign(globalThis, {
  doGet,
  provisionBaselineTables,
  stageBaselineRows,
  approveBaselineBatch,
  confirmBaselineBatch,
  getBaselineAdminModel,
  getPublicDashboardModel,
  // Vaccine monthly functions
  getVaccineMonthlyPublicDashboard,
  getVaccineMonthlyAdminData,
  fetchVaccineMonthlyData,
});
