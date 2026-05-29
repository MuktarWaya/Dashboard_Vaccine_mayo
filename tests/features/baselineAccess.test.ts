import { describe, expect, it } from "vitest";

import {
  assertBaselineAction,
  type BaselineActor,
} from "../../src/features/baseline/baselineAccess";
import type { BaselineBatch } from "../../src/domain/baseline";
import { SheetsBaselineRepository, TABLES } from "../../src/infrastructure/sheetsBaselineRepository";
import {
  approveAndPromoteBaselineBatch,
  batchesVisibleToActor,
} from "../../src/main";

const districtActor: BaselineActor = {
  email: "district@example.org",
  role: "DISTRICT_APPROVER",
  serviceUnitCode: "",
};

const unitActor: BaselineActor = {
  email: "unit@example.org",
  role: "UNIT_CONFIRMER",
  serviceUnitCode: "95001",
};

function batch(serviceUnitCode = "95001"): BaselineBatch {
  return {
    batchId: "batch-1",
    serviceUnitCode,
    state: "DISTRICT_APPROVED",
    rowCount: 20,
    issues: [],
    stagedBy: "district@example.org",
    stagedAt: "2026-06-01T09:00:00+07:00",
    approvedBy: "district@example.org",
    approvedAt: "2026-06-01T10:00:00+07:00",
  };
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

describe("baseline workflow access control", () => {
  it("allows district approver to stage and approve", () => {
    expect(() => assertBaselineAction("STAGE", districtActor)).not.toThrow();
    expect(() => assertBaselineAction("APPROVE", districtActor)).not.toThrow();
  });

  it("allows unit confirmer to confirm only its own unit batch", () => {
    expect(() => assertBaselineAction("CONFIRM", unitActor, batch("95001"))).not.toThrow();
    expect(() => assertBaselineAction("CONFIRM", unitActor, batch("95002"))).toThrow("Outside service-unit scope");
  });

  it("prevents unit confirmer from approving", () => {
    expect(() => assertBaselineAction("APPROVE", unitActor)).toThrow("District approver required");
  });
});

describe("baseline actor lookup", () => {
  it("returns the matching active actor with trimmed spreadsheet values", () => {
    const { repository, spreadsheet } = fakeRepository();
    spreadsheet
      .getSheetByName(TABLES.CFG_BASELINE_USERS)
      ?.appendRow([" Unit@example.org ", " UNIT_CONFIRMER ", " 95001 ", " true "]);

    expect(repository.getActor("unit@EXAMPLE.org")).toEqual({
      email: "Unit@example.org",
      role: "UNIT_CONFIRMER",
      serviceUnitCode: "95001",
    });
  });

  it("requires the baseline user configuration sheet", () => {
    const repository = new SheetsBaselineRepository(
      new FakeSpreadsheet() as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet,
    );

    expect(() => repository.getActor("unit@example.org")).toThrow("Baseline user configuration is missing");
  });

  it("rejects inactive baseline users", () => {
    const { repository, spreadsheet } = fakeRepository();
    spreadsheet
      .getSheetByName(TABLES.CFG_BASELINE_USERS)
      ?.appendRow(["unit@example.org", "UNIT_CONFIRMER", "95001", "false"]);

    expect(() => repository.getActor("unit@example.org")).toThrow("Not authorized for baseline workflow");
  });

  it("rejects duplicate active actors for the same email", () => {
    const { repository, spreadsheet } = fakeRepository();
    spreadsheet
      .getSheetByName(TABLES.CFG_BASELINE_USERS)
      ?.appendRow(["unit@example.org", "UNIT_CONFIRMER", "95001", "true"]);
    spreadsheet
      .getSheetByName(TABLES.CFG_BASELINE_USERS)
      ?.appendRow([" UNIT@example.org ", "UNIT_CONFIRMER", "95002", "true"]);

    expect(() => repository.getActor("unit@example.org")).toThrow("Duplicate baseline actor");
  });

  it("rejects invalid baseline roles", () => {
    const { repository, spreadsheet } = fakeRepository();
    spreadsheet
      .getSheetByName(TABLES.CFG_BASELINE_USERS)
      ?.appendRow(["unit@example.org", "DISTRICT_ADMIN", "95001", "true"]);

    expect(() => repository.getActor("unit@example.org")).toThrow("Invalid baseline role");
  });
});

describe("baseline admin scoping", () => {
  it("shows district approvers every batch and unit confirmers only their own unit", () => {
    const ownBatch = batch("95001");
    const otherBatch = { ...batch("95002"), batchId: "batch-2" };

    expect(batchesVisibleToActor(districtActor, [ownBatch, otherBatch])).toEqual([ownBatch, otherBatch]);
    expect(batchesVisibleToActor(unitActor, [ownBatch, otherBatch])).toEqual([ownBatch]);
  });
});

describe("baseline approval promotion safety", () => {
  it("reverts the batch to its prior validated state when registry promotion fails", () => {
    const validated = {
      ...batch("95001"),
      state: "VALIDATED",
      approvedBy: undefined,
      approvedAt: undefined,
    } satisfies BaselineBatch;
    const updates: BaselineBatch[] = [];
    const repository = {
      getBatch: () => validated,
      assertStagedRecordsExist: () => undefined,
      updateBatch: (next: BaselineBatch) => updates.push(next),
      promoteApprovedRecords: () => {
        throw new Error("Registry write failed");
      },
    };
    const service = {
      approve: (batchId: string, actorEmail: string, at: string) => {
        const approved = {
          ...validated,
          batchId,
          state: "DISTRICT_APPROVED",
          approvedBy: actorEmail,
          approvedAt: at,
        } satisfies BaselineBatch;
        updates.push(approved);
        return approved;
      },
    };

    expect(() =>
      approveAndPromoteBaselineBatch(
        repository,
        service,
        districtActor,
        "batch-1",
        "2026-06-01T10:00:00+07:00",
      ),
    ).toThrow("Registry write failed");
    expect(updates).toEqual([
      expect.objectContaining({ state: "DISTRICT_APPROVED" }),
      validated,
    ]);
  });
});
