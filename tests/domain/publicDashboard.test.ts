import { describe, expect, it } from "vitest";

import type { BaselineBatch } from "../../src/domain/baseline";
import {
  buildPublicDashboardModel,
  publicDashboardContainsForbiddenKeys,
  type PublicDashboardServiceUnit,
} from "../../src/domain/publicDashboard";

const serviceUnits: PublicDashboardServiceUnit[] = [
  { serviceUnitCode: "95001", serviceUnitName: "รพ.สต.ตัวอย่าง 1" },
  { serviceUnitCode: "95002", serviceUnitName: "รพ.สต.ตัวอย่าง 2" },
  { serviceUnitCode: "95003", serviceUnitName: "PCU ตัวอย่าง" },
];

function batch(partial: Partial<BaselineBatch>): BaselineBatch {
  return {
    batchId: "batch-1",
    serviceUnitCode: "95001",
    state: "UNIT_CONFIRMED",
    rowCount: 120,
    issues: [],
    stagedBy: "district",
    stagedAt: "2026-06-01T08:00:00+07:00",
    confirmedBy: "unit",
    confirmedAt: "2026-06-02T08:45:00+07:00",
    ...partial,
  };
}

describe("public dashboard model", () => {
  it("opens vaccine progress first but does not invent monthly values", () => {
    const model = buildPublicDashboardModel({
      lastUpdatedAt: "2026-06-02T09:30:00+07:00",
      serviceUnits,
      batches: [],
      totalUnits: 14,
    });

    expect(model.tabs[0]).toEqual({
      id: "vaccineProgress",
      label: "Dashboard ความก้าวหน้าวัคซีน",
    });
    expect(model.vaccineProgress).toEqual({
      state: "NOT_READY",
      message: "กำลังเตรียมข้อมูลรายเดือน",
    });
  });

  it("builds aggregate baseline readiness by active service unit", () => {
    const model = buildPublicDashboardModel({
      lastUpdatedAt: "2026-06-02T09:30:00+07:00",
      serviceUnits,
      totalUnits: 14,
      batches: [
        batch({ batchId: "confirmed", serviceUnitCode: "95001", state: "UNIT_CONFIRMED", rowCount: 120 }),
        batch({
          batchId: "approved",
          serviceUnitCode: "95002",
          state: "DISTRICT_APPROVED",
          rowCount: 86,
          approvedAt: "2026-06-01T16:10:00+07:00",
          confirmedBy: undefined,
          confirmedAt: undefined,
        }),
        batch({
          batchId: "rejected",
          serviceUnitCode: "95003",
          state: "REJECTED",
          rowCount: 42,
          issues: [{ rowNumber: 2, field: "cid", code: "INVALID_CID", message: "bad" }],
          confirmedBy: undefined,
          confirmedAt: undefined,
        }),
      ],
    });

    expect(model.dataQuality).toEqual({
      confirmedUnits: 1,
      totalUnits: 14,
      confirmedChildren: 120,
      provisionalChildren: 86,
      unitsNeedingFollowUp: 2,
      serviceUnits: [
        {
          serviceUnitCode: "95001",
          serviceUnitName: "รพ.สต.ตัวอย่าง 1",
          baselineStatus: "ยืนยันแล้ว",
          confirmedChildren: 120,
          provisionalChildren: 0,
          pendingIssueCount: 0,
          lastUpdatedAt: "2026-06-02T08:45:00+07:00",
        },
        {
          serviceUnitCode: "95002",
          serviceUnitName: "รพ.สต.ตัวอย่าง 2",
          baselineStatus: "รอยืนยัน",
          confirmedChildren: 0,
          provisionalChildren: 86,
          pendingIssueCount: 0,
          lastUpdatedAt: "2026-06-01T16:10:00+07:00",
        },
        {
          serviceUnitCode: "95003",
          serviceUnitName: "PCU ตัวอย่าง",
          baselineStatus: "ต้องติดตาม",
          confirmedChildren: 0,
          provisionalChildren: 0,
          pendingIssueCount: 1,
          lastUpdatedAt: "2026-06-01T08:00:00+07:00",
        },
      ],
    });
  });

  it("keeps the public JSON free of child and operational field names", () => {
    const model = buildPublicDashboardModel({
      lastUpdatedAt: "2026-06-02T09:30:00+07:00",
      serviceUnits,
      totalUnits: 14,
      batches: [batch({})],
    });

    expect(publicDashboardContainsForbiddenKeys(model)).toBe(false);
    expect(publicDashboardContainsForbiddenKeys({ child: { cid: "1111111111111" } })).toBe(true);
    expect(publicDashboardContainsForbiddenKeys({ record_json: "{}" })).toBe(true);
  });
});

