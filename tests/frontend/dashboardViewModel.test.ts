import { describe, expect, it } from "vitest";

import { buildDashboardViewModel } from "../../frontend/src/services/dashboardViewModel";
import type { PublicDashboardData } from "../../frontend/src/types/vaccine";

const baseData: PublicDashboardData = {
  lastUpdatedAt: "2026-06-30T09:00:00+07:00",
  reportMonth: "2026-06",
  vaccineProgress: {
    state: "NOT_READY",
    message: "กำลังเตรียมข้อมูลรายเดือน",
  },
  dataQuality: {
    unitsReported: 2,
    totalUnits: 14,
    unitsCompleted: 1,
    unitsNeedFollowUp: 1,
    serviceUnits: [],
  },
};

describe("dashboard view model", () => {
  it("keeps vaccine progress in not-ready state without invented KPI values", () => {
    const model = buildDashboardViewModel(baseData);

    expect(model.progressReady).toBe(false);
    expect(model.districtCoverageLabel).toBe("กำลังเตรียมข้อมูล");
    expect(model.totalChildrenLabel).toBe("-");
    expect(model.facilityComparison).toEqual([]);
  });

  it("uses aggregate district and service-unit values only when progress data is ready", () => {
    const model = buildDashboardViewModel({
      ...baseData,
      vaccineProgress: {
        state: "READY",
        district: {
          name: "อำเภอมายอ",
          totalChildren: 1856,
          coverage: 94.8,
          onSchedule: 1680,
          delayed: 132,
          refused: 44,
          needFollowUp: 176,
        },
        serviceUnits: [
          {
            serviceUnitCode: "09947",
            serviceUnitName: "รพ.สต.มายอ",
            reportStatus: "ส่งครบ",
            coverage: 98.5,
            totalChildren: 145,
            needFollowUp: 2,
            lastUpdated: "2026-06-30T08:30:00+07:00",
          },
        ],
      },
    });

    expect(model.progressReady).toBe(true);
    expect(model.districtCoverageLabel).toBe("94.8%");
    expect(model.totalChildrenLabel).toBe("1,856");
    expect(model.facilityComparison).toEqual([
      {
        name: "รพ.สต.มายอ",
        coverage: 98.5,
        onSchedulePercent: 98.5,
        followUpPercent: 1.5,
        refusedPercent: 0,
      },
    ]);
  });
});
