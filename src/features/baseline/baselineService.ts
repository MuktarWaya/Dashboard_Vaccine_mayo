import type {
  BaselineBatch,
  BaselineCoverage,
  ValidationIssue,
} from "../../domain/baseline";

export interface BaselineRepository {
  saveBatch(batch: BaselineBatch): void;
  updateBatch(batch: BaselineBatch): void;
  getBatch(id: string): BaselineBatch | undefined;
  listBatches(): BaselineBatch[];
}

export interface StageCommand {
  batchId: string;
  serviceUnitCode: string;
  rowCount: number;
  issues: ValidationIssue[];
  actor: string;
  at: string;
}

export class BaselineService {
  constructor(
    private readonly repository: BaselineRepository,
    private readonly totalUnits: number,
  ) {}

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

    if (batch.state !== "VALIDATED") {
      throw new Error("Batch has validation issues");
    }

    const approved: BaselineBatch = {
      ...batch,
      state: "DISTRICT_APPROVED",
      approvedBy: actor,
      approvedAt: at,
    };

    this.repository.updateBatch(approved);
    return approved;
  }

  confirm(batchId: string, actor: string, at: string): BaselineBatch {
    const batch = this.requiredBatch(batchId);

    if (batch.state !== "DISTRICT_APPROVED") {
      throw new Error("Batch is not district approved");
    }

    const confirmed: BaselineBatch = {
      ...batch,
      state: "UNIT_CONFIRMED",
      confirmedBy: actor,
      confirmedAt: at,
    };

    this.repository.updateBatch(confirmed);
    return confirmed;
  }

  coverage(): BaselineCoverage {
    const batches = this.repository.listBatches();
    const confirmedBatches = batches.filter((batch) => batch.state === "UNIT_CONFIRMED");

    return {
      confirmedUnits: confirmedBatches.length,
      totalUnits: this.totalUnits,
      confirmedChildren: confirmedBatches.reduce((sum, batch) => sum + batch.rowCount, 0),
      provisionalChildren: batches
        .filter((batch) => batch.state === "DISTRICT_APPROVED")
        .reduce((sum, batch) => sum + batch.rowCount, 0),
    };
  }

  private requiredBatch(batchId: string): BaselineBatch {
    const batch = this.repository.getBatch(batchId);

    if (!batch) {
      throw new Error("Unknown baseline batch");
    }

    return batch;
  }
}
