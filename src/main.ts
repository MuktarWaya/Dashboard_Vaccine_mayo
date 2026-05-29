import { validateBaselineRows } from "./domain/validateBaseline";
import { assertBaselineAction, type BaselineActor } from "./features/baseline/baselineAccess";
import { BaselineService } from "./features/baseline/baselineService";
import { SheetsBaselineRepository } from "./infrastructure/sheetsBaselineRepository";

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
  return new BaselineService(repo, repo.getApprovedServiceUnitCodes().size);
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

  const approvedServiceUnitCodes = repo.getApprovedServiceUnitCodes();
  const issues = validateBaselineRows(headers, rows, serviceUnitCode, approvedServiceUnitCodes);
  const batch = service(repo).stage({
    batchId: Utilities.getUuid(),
    serviceUnitCode,
    rowCount: rows.length,
    issues,
    actor: activeActor.email,
    at: new Date().toISOString(),
  });

  if (batch.state === "VALIDATED") {
    repo.saveStagedRecords(batch.batchId, rows);
  }

  return batch;
}

function approveBaselineBatch(batchId: string) {
  const repo = repository();
  const activeActor = actor(repo);
  const workflow = service(repo);
  const batch = repo.getBatch(batchId);
  assertBaselineAction("APPROVE", activeActor, batch);

  const approved = workflow.approve(batchId, activeActor.email, new Date().toISOString());
  repo.promoteApprovedRecords(batchId);
  return approved;
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
  actor(repo);
  const workflow = service(repo);

  return {
    coverage: workflow.coverage(),
    batches: repo.listBatches(),
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
