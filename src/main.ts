import type { BaselineBatch } from "./domain/baseline";
import { acceptedBaselineDuplicateIssues } from "./domain/baselineExistingDuplicate";
import { validateBaselineRows } from "./domain/validateBaseline";
import { assertBaselineAction, type BaselineActor } from "./features/baseline/baselineAccess";
import {
  BaselineService,
  duplicateServiceUnitBaselineIssues,
} from "./features/baseline/baselineService";
import { SheetsBaselineRepository } from "./infrastructure/sheetsBaselineRepository";

export const DISTRICT_SERVICE_UNIT_TOTAL = 14;

export function applicationInfo() {
  return { application: "Dashboard Vaccine", capability: "baseline-registry", version: "0.1.0" } as const;
}

function repository(): SheetsBaselineRepository {
  return new SheetsBaselineRepository(SpreadsheetApp.getActive());
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

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("adminBaseline").setTitle("Dashboard Vaccine - ทะเบียนตั้งต้น");
}

Object.assign(globalThis, {
  doGet,
  provisionBaselineTables,
  stageBaselineRows,
  approveBaselineBatch,
  confirmBaselineBatch,
  getBaselineAdminModel,
});
