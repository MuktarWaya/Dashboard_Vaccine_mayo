import { describe, expect, it } from "vitest";
import {
  approvedRegistryRows,
  baselineBatchToRow,
  baselineRowToBatch,
  SheetsBaselineRepository,
  TABLES,
} from "../../src/infrastructure/sheetsBaselineRepository";
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

class FakeRange {
  constructor(
    private readonly sheet: FakeSheet,
    private readonly row: number,
    private readonly column: number,
    private readonly rowCount: number,
    private readonly columnCount: number,
  ) {}

  getValues(): unknown[][] {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from(
        { length: this.columnCount },
        (_, columnOffset) => this.sheet.cell(this.row + rowOffset, this.column + columnOffset),
      ),
    );
  }

  setValues(values: unknown[][]): void {
    values.forEach((row, rowOffset) => {
      row.forEach((value, columnOffset) => {
        this.sheet.setCell(this.row + rowOffset, this.column + columnOffset, value);
      });
    });
  }
}

class FakeSheet {
  rows: unknown[][] = [];

  appendRow(row: unknown[]): void {
    this.rows.push([...row]);
  }

  getRange(row: number, column: number, rowCount: number, columnCount: number): FakeRange {
    return new FakeRange(this, row, column, rowCount, columnCount);
  }

  getLastRow(): number {
    return this.rows.length;
  }

  cell(row: number, column: number): unknown {
    return this.rows[row - 1]?.[column - 1] ?? "";
  }

  setCell(row: number, column: number, value: unknown): void {
    while (this.rows.length < row) {
      this.rows.push([]);
    }
    this.rows[row - 1][column - 1] = value;
  }
}

class FakeSpreadsheet {
  sheets = new Map<string, FakeSheet>();

  getSheetByName(name: string): FakeSheet | null {
    return this.sheets.get(name) ?? null;
  }

  insertSheet(name: string): FakeSheet {
    const sheet = new FakeSheet();
    this.sheets.set(name, sheet);
    return sheet;
  }
}

function fakeRepository() {
  const spreadsheet = new FakeSpreadsheet();
  const repository = new SheetsBaselineRepository(
    spreadsheet as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet,
  );
  repository.provision();
  return { repository, spreadsheet };
}

function approvedBatch(batchId = "batch-1"): BaselineBatch {
  return {
    batchId,
    serviceUnitCode: "95001",
    state: "DISTRICT_APPROVED",
    rowCount: 20,
    issues: [],
    stagedBy: "importer",
    stagedAt: "2026-06-01T09:00:00+07:00",
    approvedBy: "approver",
    approvedAt: "2026-06-01T10:00:00+07:00",
  };
}

describe("BaselineService", () => {
  it("requires successful validation before district approval", () => {
    const repository = new MemoryRepository();
    const service = new BaselineService(repository, 14);
    service.stage({ batchId: "bad", serviceUnitCode: "95001", rowCount: 1, issues: [{ rowNumber: 2, field: "cid", code: "INVALID_CID", message: "bad" }], actor: "district", at: "2026-06-01T09:00:00+07:00" });
    expect(() => service.approve("bad", "district", "2026-06-01T09:10:00+07:00")).toThrow("Batch has validation issues");
  });

  it("reports approved batches as provisional coverage until unit confirmation", () => {
    const repository = new MemoryRepository();
    const service = new BaselineService(repository, 14);
    service.stage({ batchId: "ok", serviceUnitCode: "95001", rowCount: 20, issues: [], actor: "district", at: "2026-06-01T09:00:00+07:00" });
    service.approve("ok", "district", "2026-06-01T09:10:00+07:00");
    expect(service.coverage()).toEqual({ confirmedUnits: 0, totalUnits: 14, confirmedChildren: 0, provisionalChildren: 20 });
    service.confirm("ok", "unit-confirmer", "2026-06-02T09:00:00+07:00");
    expect(service.coverage()).toEqual({ confirmedUnits: 1, totalUnits: 14, confirmedChildren: 20, provisionalChildren: 0 });
  });

  it("rejects a second clean stage for a service unit until the previous attempt is rejected", () => {
    const repository = new MemoryRepository();
    const service = new BaselineService(repository, 14);

    service.stage({ batchId: "first", serviceUnitCode: "95001", rowCount: 20, issues: [], actor: "district", at: "2026-06-01T09:00:00+07:00" });
    const duplicate = service.stage({ batchId: "second", serviceUnitCode: "95001", rowCount: 5, issues: [], actor: "district", at: "2026-06-01T09:05:00+07:00" });

    expect(duplicate).toMatchObject({
      state: "REJECTED",
      issues: [{ rowNumber: 1, field: "service_unit_code", code: "DUPLICATE_SERVICE_UNIT_BASELINE" }],
    });
  });

  it("counts only one confirmed batch per service unit in coverage", () => {
    const repository = new MemoryRepository();
    repository.batches = [
      { ...approvedBatch("first"), state: "UNIT_CONFIRMED", rowCount: 20, confirmedBy: "unit", confirmedAt: "2026-06-02T09:00:00+07:00" },
      { ...approvedBatch("second"), state: "UNIT_CONFIRMED", rowCount: 5, confirmedBy: "unit", confirmedAt: "2026-06-02T09:10:00+07:00" },
    ];
    const service = new BaselineService(repository, 14);

    expect(service.coverage()).toEqual({
      confirmedUnits: 1,
      totalUnits: 14,
      confirmedChildren: 20,
      provisionalChildren: 0,
    });
  });
});

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

describe("SheetsBaselineRepository", () => {
  it("rejects duplicate batch ids", () => {
    const { repository } = fakeRepository();
    repository.saveBatch(approvedBatch());

    expect(() => repository.saveBatch(approvedBatch())).toThrow("Duplicate baseline batch");
  });

  it("promotes approved staged rows only once for the same batch id", () => {
    const { repository, spreadsheet } = fakeRepository();
    repository.saveStagedRecords("batch-1", [["111", "95001"], ["222", "95001"]]);

    repository.promoteApprovedRecords("batch-1");
    repository.promoteApprovedRecords("batch-1");

    expect(spreadsheet.getSheetByName(TABLES.CHILD_REGISTRY)?.rows).toEqual([
      ["approved_batch_id", "cid", "service_unit_code", "record_json"],
      ["batch-1", "111", "95001", JSON.stringify(["111", "95001"])],
      ["batch-1", "222", "95001", JSON.stringify(["222", "95001"])],
    ]);
  });

  it("trims service unit codes and active values", () => {
    const { repository, spreadsheet } = fakeRepository();
    spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS)?.appendRow([" 95001 ", "Mayo", " true "]);
    spreadsheet.getSheetByName(TABLES.CFG_SERVICE_UNITS)?.appendRow([" 95002 ", "Inactive", " false "]);

    expect(repository.getApprovedServiceUnitCodes()).toEqual(new Set(["95001"]));
  });

  it("returns CIDs only from staged or registry rows attached to non-rejected batches", () => {
    const { repository } = fakeRepository();
    repository.saveBatch({ ...approvedBatch("validated"), state: "VALIDATED" });
    repository.saveBatch({ ...approvedBatch("rejected"), state: "REJECTED" });
    repository.saveStagedRecords("validated", [["1111111111111", "95001"]]);
    repository.saveStagedRecords("rejected", [["2222222222222", "95001"]]);
    repository.promoteApprovedRecords("validated");

    expect(repository.getAcceptedBaselineCids()).toEqual(new Set(["1111111111111"]));
  });
});
