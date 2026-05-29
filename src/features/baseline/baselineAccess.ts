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
