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
import {
  ADMIN_PASSWORD_PROPERTY,
  ADMIN_SESSION_CACHE_PREFIX,
  CANONICAL_SERVICE_UNITS,
  createAdminSession,
  defaultServiceUnitSettings,
  serviceUnitByCode,
  toServiceUnitSettingView,
  verifyAdminPassword,
  type ServiceUnitSetting,
  type ServiceUnitSettingView,
} from "./domain/serviceUnitSettings";
import {
  buildPublicDashboardFromAggregates,
  upsertMonthlyAggregate,
  validateUnitAggregateSubmission,
} from "./domain/unitAggregate";
import { SheetsServiceUnitSettingsRepository } from "./infrastructure/sheetsServiceUnitSettingsRepository";

export const DISTRICT_SERVICE_UNIT_TOTAL = 14;
export const DEFAULT_DASHBOARD_SPREADSHEET_ID = "1H4ShB4fZCHt22J8coGXHn1KDgykjrxi3TueJDJ9ZoA8";
export const DASHBOARD_SPREADSHEET_ID_PROPERTY = "DASHBOARD_VACCINE_SPREADSHEET_ID";

// Vaccine monthly configuration
export const VACCINE_SERVICE_UNIT_CONFIGS_PROPERTY = "VACCINE_SERVICE_UNIT_CONFIGS";
export const DEFAULT_REPORT_MONTH = new Date().toISOString().slice(0, 7); // format: YYYY-MM

interface AppsScriptGetEvent {
  parameter?: Record<string, string | undefined>;
}

interface AppsScriptPostEvent extends AppsScriptGetEvent {
  postData?: {
    contents?: string;
  };
}

export type DashboardApiAction =
  | "publicDashboard"
  | "adminLogin"
  | "getSettings"
  | "saveSettings"
  | "testUnitConnection"
  | "generateUnitToken"
  | "submitUnitMonthly";

export function routeDashboardApiAction(parameter?: Record<string, string | undefined>): DashboardApiAction {
  switch (parameter?.action) {
    case "adminLogin":
    case "getSettings":
    case "saveSettings":
    case "testUnitConnection":
    case "generateUnitToken":
    case "submitUnitMonthly":
      return parameter.action;
    case "publicDashboard":
    case "fetch":
    default:
      return "publicDashboard";
  }
}

export function applicationInfo() {
  return { application: "Dashboard Vaccine", capability: "baseline-registry", version: "0.1.0" } as const;
}

function repository(): SheetsBaselineRepository {
  return new SheetsBaselineRepository(dashboardSpreadsheet());
}

function serviceUnitSettingsRepository(): SheetsServiceUnitSettingsRepository {
  const repo = new SheetsServiceUnitSettingsRepository(dashboardSpreadsheet());
  repo.provision();
  return repo;
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
  const repo = serviceUnitSettingsRepository();
  const month = reportMonth || DEFAULT_REPORT_MONTH;

  return buildPublicDashboardFromAggregates(month, repo.listMonthlyAggregates(month));
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

    const data = getVaccineMonthlyPublicDashboard(reportMonth);
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

export function adminLogin(password: string): { sessionToken: string; expiresInSeconds: number } {
  const configuredPassword = PropertiesService.getScriptProperties().getProperty(ADMIN_PASSWORD_PROPERTY);
  if (!verifyAdminPassword(password, configuredPassword)) {
    throw new Error("Invalid admin password");
  }

  const session = createAdminSession(new Date().toISOString(), () => Utilities.getUuid());
  CacheService.getScriptCache().put(
    `${ADMIN_SESSION_CACHE_PREFIX}${session.sessionToken}`,
    session.issuedAt,
    session.expiresInSeconds,
  );

  return {
    sessionToken: session.sessionToken,
    expiresInSeconds: session.expiresInSeconds,
  };
}

export function getSettings(sessionToken: string): ServiceUnitSettingView[] {
  assertAdminSession(sessionToken);
  const settings = serviceUnitSettingsRepository().listSettings();
  return mergeStoredSettingsWithDefaults(settings).map(toServiceUnitSettingView);
}

export function saveSettings(
  sessionToken: string,
  settings: ServiceUnitSettingView[],
): { status: "SETTINGS_SAVED" } {
  assertAdminSession(sessionToken);
  if (!Array.isArray(settings) || settings.length === 0) {
    throw new Error("Settings payload required");
  }
  assertValidSettingsPayload(settings);
  const repo = serviceUnitSettingsRepository();
  const existingByCode = new Map(repo.listSettings().map((setting) => [setting.serviceUnitCode, setting]));
  repo.saveSettings(settings.map((setting) => ({
    serviceUnitCode: setting.serviceUnitCode,
    serviceUnitName: setting.serviceUnitName,
    spreadsheetId: setting.spreadsheetId,
    sheetName: setting.sheetName,
    enabled: setting.enabled,
    tokenHash: existingByCode.get(setting.serviceUnitCode)?.tokenHash,
    lastSubmittedAt: existingByCode.get(setting.serviceUnitCode)?.lastSubmittedAt,
    lastError: existingByCode.get(setting.serviceUnitCode)?.lastError,
  })));
  return { status: "SETTINGS_SAVED" };
}

export function testUnitConnection(
  sessionToken: string,
  serviceUnitCode: string,
): { ok: boolean; message: string } {
  assertAdminSession(sessionToken);
  const setting = serviceUnitSettingsRepository().listSettings().find(
    (item) => item.serviceUnitCode === serviceUnitCode,
  );
  if (!setting) {
    return { ok: false, message: "ไม่พบหน่วยบริการ" };
  }
  if (!setting.spreadsheetId) {
    return { ok: false, message: "ยังไม่ได้ตั้งค่า Spreadsheet ID" };
  }

  const sheet = SpreadsheetApp.openById(setting.spreadsheetId).getSheetByName(setting.sheetName);
  return sheet
    ? { ok: true, message: "เชื่อมต่อ Google Sheets ได้" }
    : { ok: false, message: `ไม่พบชีต ${setting.sheetName}` };
}

export function generateUnitToken(
  sessionToken: string,
  serviceUnitCode: string,
): { serviceUnitCode: string; token: string; tokenStatus: "ตั้งค่าแล้ว" } {
  assertAdminSession(sessionToken);
  const canonical = serviceUnitByCode(serviceUnitCode);
  if (!canonical) {
    throw new Error("Invalid service unit code");
  }

  const repo = serviceUnitSettingsRepository();
  const settings = mergeStoredSettingsWithDefaults(repo.listSettings());
  const token = Utilities.getUuid().replace(/-/g, "");
  repo.saveSettings(settings.map((setting) => (
    setting.serviceUnitCode === serviceUnitCode
      ? { ...setting, tokenHash: hashToken(token), lastError: "" }
      : setting
  )));

  return {
    serviceUnitCode,
    token,
    tokenStatus: "ตั้งค่าแล้ว",
  };
}

export function submitUnitMonthly(
  payload: unknown,
): { status: "ACCEPTED"; serviceUnitCode: string; reportMonth: string } {
  const validation = validateUnitAggregateSubmission(payload);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const repo = serviceUnitSettingsRepository();
  const setting = repo.listSettings().find(
    (item) => item.serviceUnitCode === validation.value.serviceUnitCode,
  );
  if (!setting?.enabled) {
    throw new Error("SERVICE_UNIT_DISABLED_OR_MISSING");
  }
  if (!setting.tokenHash || hashToken(validation.value.token) !== setting.tokenHash) {
    throw new Error("INVALID_UNIT_TOKEN");
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(30_000);
  try {
    const receivedAt = new Date().toISOString();
    const aggregates = upsertMonthlyAggregate(repo.listMonthlyAggregates(), {
      ...validation.value,
      receivedAt,
    });
    repo.saveMonthlyAggregates(aggregates);
    repo.appendIngestionLog({
      at: receivedAt,
      event: "SUBMIT_UNIT_MONTHLY",
      serviceUnitCode: validation.value.serviceUnitCode,
      reportMonth: validation.value.reportMonth,
      message: "accepted",
    });
  } finally {
    lock.releaseLock();
  }

  return {
    status: "ACCEPTED",
    serviceUnitCode: validation.value.serviceUnitCode,
    reportMonth: validation.value.reportMonth,
  };
}

function assertAdminSession(sessionToken: string): void {
  if (!sessionToken || !CacheService.getScriptCache().get(`${ADMIN_SESSION_CACHE_PREFIX}${sessionToken}`)) {
    throw new Error("Admin session required");
  }
}

function assertValidSettingsPayload(settings: readonly ServiceUnitSettingView[]): void {
  if (settings.length !== CANONICAL_SERVICE_UNITS.length) {
    throw new Error("Settings payload must include all service units");
  }

  const seenCodes = new Set<string>();
  for (const setting of settings) {
    if (!setting || typeof setting !== "object") {
      throw new Error("Invalid service unit setting");
    }

    const canonical = serviceUnitByCode(setting.serviceUnitCode);
    if (!canonical || seenCodes.has(setting.serviceUnitCode)) {
      throw new Error("Invalid service unit code");
    }
    if (setting.serviceUnitName !== canonical.serviceUnitName) {
      throw new Error("Invalid service unit name");
    }
    if (typeof setting.spreadsheetId !== "string") {
      throw new Error("Invalid spreadsheet id");
    }
    if (typeof setting.sheetName !== "string" || setting.sheetName.trim() === "") {
      throw new Error("Invalid sheet name");
    }
    if (typeof setting.enabled !== "boolean") {
      throw new Error("Invalid enabled flag");
    }
    seenCodes.add(setting.serviceUnitCode);
  }
}

function mergeStoredSettingsWithDefaults(storedSettings: readonly ServiceUnitSetting[]): ServiceUnitSetting[] {
  const storedByCode = new Map(storedSettings.map((setting) => [setting.serviceUnitCode, setting]));
  return defaultServiceUnitSettings().map((defaultSetting) => ({
    ...defaultSetting,
    ...storedByCode.get(defaultSetting.serviceUnitCode),
  }));
}

function hashToken(token: string): string {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)
    .map((byte) => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))
    .join("");
}

function dashboardApiJson(data: unknown): ContentService.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(event?: AppsScriptPostEvent): ContentService.TextOutput {
  try {
    const body = event?.postData?.contents ? JSON.parse(event.postData.contents) : {};
    const action = routeDashboardApiAction({
      action: typeof body.action === "string" ? body.action : event?.parameter?.action,
    });

    switch (action) {
      case "adminLogin":
        return dashboardApiJson(adminLogin(String(body.password ?? "")));
      case "getSettings":
        return dashboardApiJson(getSettings(String(body.sessionToken ?? "")));
      case "saveSettings":
        return dashboardApiJson(saveSettings(String(body.sessionToken ?? ""), body.settings ?? []));
      case "testUnitConnection":
        return dashboardApiJson(
          testUnitConnection(String(body.sessionToken ?? ""), String(body.serviceUnitCode ?? "")),
        );
      case "generateUnitToken":
        return dashboardApiJson(generateUnitToken(String(body.sessionToken ?? ""), String(body.serviceUnitCode ?? "")));
      case "submitUnitMonthly":
        return dashboardApiJson(submitUnitMonthly(body.payload ?? body));
      case "publicDashboard":
      default:
        return dashboardApiJson(getVaccineMonthlyPublicDashboard(String(body.reportMonth ?? "") || undefined));
    }
  } catch (error) {
    return dashboardApiJson({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

export function publicDashboardPageForRequest(event?: AppsScriptGetEvent): "publicDashboard" | "adminBaseline" {
  return event?.parameter?.page === "staff" ? "adminBaseline" : "publicDashboard";
}

function doGet(event?: AppsScriptGetEvent): GoogleAppsScript.HTML.HtmlOutput | ContentService.TextOutput {
  // ตรวจสอบว่าเป็นการเรียก API แบบ JSON หรือไม่
  if (
    event?.parameter?.format === "json" ||
    event?.parameter?.action === "fetch" ||
    event?.parameter?.action === "publicDashboard"
  ) {
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
  adminLogin,
  getSettings,
  saveSettings,
  testUnitConnection,
  generateUnitToken,
  submitUnitMonthly,
  doPost,
});
