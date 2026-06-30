import { describe, expect, it } from "vitest";

import {
  buildPublicDashboardFromAggregates,
  publicAggregateContainsForbiddenKeys,
  upsertMonthlyAggregate,
  validateUnitAggregateSubmission,
  type MonthlyUnitAggregate,
} from "../../src/domain/unitAggregate";

const validPayload = {
  serviceUnitCode: "09941",
  reportMonth: "2026-06",
  totalChildren: 120,
  onSchedule: 100,
  delayed: 12,
  refused: 3,
  postponed: 0,
  notFound: 5,
  followedUp: 0,
  submittedAt: "2026-06-30T10:00:00+07:00",
  token: "unit-token",
};

describe("unit aggregate domain", () => {
  it("accepts a valid aggregate submission", () => {
    expect(validateUnitAggregateSubmission(validPayload)).toEqual({
      ok: true,
      value: validPayload,
    });
  });

  it("rejects unknown unit codes, bad month, and negative counts", () => {
    expect(validateUnitAggregateSubmission({ ...validPayload, serviceUnitCode: "09954" })).toMatchObject({
      ok: false,
      error: "UNKNOWN_SERVICE_UNIT",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, reportMonth: "มิถุนายน" })).toMatchObject({
      ok: false,
      error: "INVALID_REPORT_MONTH",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, delayed: -1 })).toMatchObject({
      ok: false,
      error: "NEGATIVE_COUNT",
    });
  });

  it("upserts by report month and service unit", () => {
    const existing: MonthlyUnitAggregate[] = [
      { ...validPayload, totalChildren: 100, receivedAt: "2026-06-30T09:00:00+07:00" },
    ];
    const next = upsertMonthlyAggregate(existing, {
      ...validPayload,
      totalChildren: 121,
      receivedAt: "2026-06-30T11:00:00+07:00",
    });

    expect(next).toHaveLength(1);
    expect(next[0].totalChildren).toBe(121);
  });

  it("builds public dashboard rows without internal child-level keys", () => {
    const publicModel = buildPublicDashboardFromAggregates("2026-06", [
      { ...validPayload, receivedAt: "2026-06-30T11:00:00+07:00" },
    ]);

    expect(publicModel.dataQuality.unitsReported).toBe(1);
    expect(publicModel.dataQuality.totalUnits).toBe(14);
    expect(publicModel.vaccineProgress.state).toBe("READY");
    if (publicModel.vaccineProgress.state === "READY") {
      for (const row of publicModel.vaccineProgress.serviceUnits) {
        expect(row).not.toHaveProperty("token");
        expect(row).not.toHaveProperty("aggregate");
        expect(row).not.toHaveProperty("raw");
        expect(row).not.toHaveProperty("cid");
      }
    }
    for (const row of publicModel.dataQuality.serviceUnits) {
      expect(row).not.toHaveProperty("token");
      expect(row).not.toHaveProperty("aggregate");
      expect(row).not.toHaveProperty("raw");
      expect(row).not.toHaveProperty("cid");
    }
    expect(publicAggregateContainsForbiddenKeys(publicModel)).toBe(true);
    expect(publicAggregateContainsForbiddenKeys({ cid: "1234567890123" })).toBe(true);
    expect(publicAggregateContainsForbiddenKeys({ name: "อำเภอมายอ" })).toBe(true);
  });
});
