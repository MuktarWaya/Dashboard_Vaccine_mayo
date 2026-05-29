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
