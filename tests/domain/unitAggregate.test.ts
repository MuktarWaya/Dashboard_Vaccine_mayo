import { describe, expect, it } from "vitest";

import {
  buildPublicDashboardFromAggregates,
  publicAggregateContainsForbiddenKeys,
  upsertMonthlyAggregate,
  validateUnitAggregateSubmission,
  type MonthlyUnitAggregate,
} from "../../src/domain/unitAggregate";
import { CANONICAL_SERVICE_UNITS } from "../../src/domain/serviceUnitSettings";

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

  it("rejects non-object input and missing required fields as missing field", () => {
    expect(validateUnitAggregateSubmission("not an aggregate")).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
    expect(validateUnitAggregateSubmission(null)).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
    expect(validateUnitAggregateSubmission([])).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, token: undefined })).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, submittedAt: "" })).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
  });

  it("rejects non-number and non-finite numeric fields as missing field", () => {
    expect(validateUnitAggregateSubmission({ ...validPayload, totalChildren: "120" })).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, onSchedule: Number.POSITIVE_INFINITY })).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
    });
    expect(validateUnitAggregateSubmission({ ...validPayload, delayed: Number.NaN })).toMatchObject({
      ok: false,
      error: "MISSING_FIELD",
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

  it("replaces an existing aggregate for the same report month and service unit", () => {
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

  it("appends different units or months and returns rows sorted by service unit code", () => {
    const existing: MonthlyUnitAggregate[] = [
      { ...validPayload, serviceUnitCode: "09942", totalChildren: 10, receivedAt: "2026-06-30T09:00:00+07:00" },
    ];

    const withDifferentUnit = upsertMonthlyAggregate(existing, {
      ...validPayload,
      serviceUnitCode: "09940",
      totalChildren: 11,
      receivedAt: "2026-06-30T10:00:00+07:00",
    });

    expect(withDifferentUnit).toHaveLength(2);
    expect(withDifferentUnit.map((row) => row.serviceUnitCode)).toEqual(["09940", "09942"]);

    const withDifferentMonth = upsertMonthlyAggregate(withDifferentUnit, {
      ...validPayload,
      serviceUnitCode: "09940",
      reportMonth: "2026-07",
      totalChildren: 12,
      receivedAt: "2026-07-31T10:00:00+07:00",
    });

    expect(withDifferentMonth).toHaveLength(3);
    expect(withDifferentMonth.map((row) => `${row.reportMonth}:${row.serviceUnitCode}`)).toEqual([
      "2026-06:09940",
      "2026-07:09940",
      "2026-06:09942",
    ]);
  });

  it("builds public dashboard rows for all canonical units with defaults for missing units", () => {
    const publicModel = buildPublicDashboardFromAggregates("2026-06", [
      {
        ...validPayload,
        totalChildren: 3,
        onSchedule: 2,
        delayed: 0,
        refused: 1,
        receivedAt: "2026-06-30T11:00:00+07:00",
      },
      {
        ...validPayload,
        serviceUnitCode: "09940",
        totalChildren: 4,
        onSchedule: 3,
        delayed: 0,
        refused: 0,
        receivedAt: "2026-06-30T12:00:00+07:00",
      },
      {
        ...validPayload,
        serviceUnitCode: "09943",
        reportMonth: "2026-05",
        totalChildren: 999,
        onSchedule: 999,
        delayed: 0,
        refused: 0,
        receivedAt: "2026-05-31T12:00:00+07:00",
      },
    ]);

    expect(publicModel.dataQuality.serviceUnits).toHaveLength(CANONICAL_SERVICE_UNITS.length);
    expect(publicModel.dataQuality.serviceUnits.map((row) => row.serviceUnitCode)).toEqual(
      CANONICAL_SERVICE_UNITS.map((unit) => unit.serviceUnitCode)
    );
    expect(publicModel.dataQuality.unitsReported).toBe(2);
    expect(publicModel.dataQuality.totalUnits).toBe(14);
    expect(publicModel.vaccineProgress.state).toBe("READY");

    if (publicModel.vaccineProgress.state === "READY") {
      expect(publicModel.vaccineProgress.district).toMatchObject({
        totalChildren: 7,
        coverage: 71.4,
        onSchedule: 5,
        delayed: 0,
        refused: 1,
        needFollowUp: 1,
      });

      const submittedWithFollowUp = publicModel.vaccineProgress.serviceUnits.find(
        (row) => row.serviceUnitCode === "09941"
      );
      expect(submittedWithFollowUp).toMatchObject({
        reportStatus: "ส่งแต่ยังติดตาม",
        coverage: 66.7,
        totalChildren: 3,
        needFollowUp: 1,
      });

      const submittedComplete = publicModel.vaccineProgress.serviceUnits.find(
        (row) => row.serviceUnitCode === "09940"
      );
      expect(submittedComplete).toMatchObject({
        reportStatus: "ส่งครบ",
        coverage: 75,
        totalChildren: 4,
        needFollowUp: 0,
      });

      const missingProgressRow = publicModel.vaccineProgress.serviceUnits.find(
        (row) => row.serviceUnitCode === "09942"
      );
      expect(missingProgressRow).toMatchObject({
        reportStatus: "ยังไม่ส่ง",
        coverage: 0,
        totalChildren: 0,
        needFollowUp: 0,
      });
    }

    const missingQualityRow = publicModel.dataQuality.serviceUnits.find((row) => row.serviceUnitCode === "09942");
    expect(missingQualityRow).toMatchObject({
      reportStatus: "ยังไม่ส่ง",
      lastUpdated: "",
    });
  });

  it("returns not ready when there are no submitted aggregates for the month", () => {
    const publicModel = buildPublicDashboardFromAggregates("2026-06", [
      {
        ...validPayload,
        reportMonth: "2026-05",
        receivedAt: "2026-05-31T11:00:00+07:00",
      },
    ]);

    expect(publicModel.vaccineProgress).toEqual({
      state: "NOT_READY",
      message: "กำลังเตรียมข้อมูลรายเดือน",
    });
    expect(publicModel.dataQuality.unitsReported).toBe(0);
    expect(publicModel.dataQuality.serviceUnits).toHaveLength(14);
  });

  it("builds public dashboard rows without internal aggregate or child-level keys", () => {
    const publicModel = buildPublicDashboardFromAggregates("2026-06", [
      { ...validPayload, receivedAt: "2026-06-30T11:00:00+07:00" },
    ]);

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
      expect(row).not.toHaveProperty("coverage");
      expect(row).not.toHaveProperty("totalChildren");
      expect(row).not.toHaveProperty("raw");
      expect(row).not.toHaveProperty("cid");
    }
  });

  it("detects forbidden keys recursively in arrays and objects with normalized key variants", () => {
    const publicModel = buildPublicDashboardFromAggregates("2026-06", [
      { ...validPayload, receivedAt: "2026-06-30T11:00:00+07:00" },
    ]);

    expect(publicAggregateContainsForbiddenKeys(publicModel)).toBe(true);
    expect(publicAggregateContainsForbiddenKeys({ cid: "1234567890123" })).toBe(true);
    expect(publicAggregateContainsForbiddenKeys({ name: "อำเภอมายอ" })).toBe(true);
    expect(publicAggregateContainsForbiddenKeys([{ profile: { record_json: "{}" } }])).toBe(true);
    expect(publicAggregateContainsForbiddenKeys({ nested: [{ "record-json": "{}" }] })).toBe(true);
    expect(publicAggregateContainsForbiddenKeys({ nested: { recordJson: "{}" } })).toBe(true);
    expect(
      publicAggregateContainsForbiddenKeys({
        serviceUnitCode: "09941",
        serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง",
      })
    ).toBe(false);
  });
});
