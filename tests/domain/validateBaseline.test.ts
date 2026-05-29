import { describe, expect, it } from "vitest";
import { BASELINE_HEADERS } from "../../src/domain/baseline";
import { validateBaselineRows } from "../../src/domain/validateBaseline";

describe("BASELINE_HEADERS", () => {
  it("uses stable machine-readable keys for the import template", () => {
    expect(BASELINE_HEADERS).toEqual([
      "cid",
      "service_unit_code",
      "first_name",
      "last_name",
      "sex",
      "birth_date",
      "house_number",
      "village_no",
      "registry_status",
      "baseline_vaccine_status",
      "next_vaccine_due_date",
      "entry_type",
      "indicator_start_month",
      "is_ppa_target",
      "is_alternative_vaccine_target",
      "primary_vhv_name",
      "primary_family_health_volunteer_name",
    ]);
  });
});

const validRow = [
  "1234567890123",
  "95001",
  "เด็ก",
  "ตัวอย่าง",
  "หญิง",
  "2021-01-15",
  "12",
  "1",
  "อยู่ในทะเบียนติดตาม",
  "ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า",
  "",
  "ทะเบียนตั้งต้น",
  "2026-06",
  "ใช่",
  "ไม่ใช่",
  "อสม. ตัวอย่าง",
  "ผรส. ตัวอย่าง",
];

describe("validateBaselineRows", () => {
  it("accepts a valid row for an approved service unit code", () => {
    expect(
      validateBaselineRows(BASELINE_HEADERS, [validRow], "95001", new Set(["95001"])),
    ).toEqual([]);
  });

  it("rejects malformed CID, unknown unit, and missing principal workers", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [validRow.map((value, index) => {
        if (index === 0) return "123";
        if (index === 1) return "99999";
        if (index === 15) return "";
        if (index === 16) return "";
        return value;
      })],
      "99999",
      new Set(["95001"]),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "INVALID_CID",
      "UNKNOWN_SERVICE_UNIT",
      "MISSING_PRIMARY_VHV",
      "MISSING_PRIMARY_FAMILY_VOLUNTEER",
    ]);
  });

  it("rejects duplicate CID on the second matching row", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [validRow, validRow],
      "95001",
      new Set(["95001"]),
    );

    expect(issues).toMatchObject([
      { rowNumber: 3, code: "DUPLICATE_CID" },
    ]);
  });

  it("rejects a row for another service unit in the same batch", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [
        validRow,
        validRow.map((value, index) => {
          if (index === 0) return "1234567890124";
          if (index === 1) return "95002";
          return value;
        }),
      ],
      "95001",
      new Set(["95001", "95002"]),
    );

    expect(issues).toMatchObject([
      { rowNumber: 3, code: "WRONG_SERVICE_UNIT" },
    ]);
  });

  it("rejects invalid birth date and status outside controlled list", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [
        validRow.map((value, index) => {
          if (index === 5) return "2021-02-29";
          if (index === 9) return "ไม่ใช่สถานะที่รองรับ";
          return value;
        }),
      ],
      "95001",
      new Set(["95001"]),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "INVALID_BIRTH_DATE",
      "INVALID_BASELINE_STATUS",
    ]);
  });

  it("requires next vaccine due date when child received some vaccines but is incomplete", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [
        validRow.map((value, index) =>
          index === 9 ? "ได้รับบางส่วน-ยังไม่ครบเกณฑ์" : value,
        ),
      ],
      "95001",
      new Set(["95001"]),
    );

    expect(issues).toMatchObject([
      { code: "MISSING_NEXT_VACCINE_DUE_DATE" },
    ]);
  });

  it("requires minimum registry fields", () => {
    const issues = validateBaselineRows(
      BASELINE_HEADERS,
      [
        validRow.map((value, index) =>
          [6, 7, 8, 11, 12].includes(index) ? "" : value,
        ),
      ],
      "95001",
      new Set(["95001"]),
    );

    expect(
      issues
        .filter((issue) => issue.code === "MISSING_REQUIRED_FIELD")
        .map((issue) => issue.field),
    ).toEqual([
      "house_number",
      "village_no",
      "registry_status",
      "entry_type",
      "indicator_start_month",
    ]);
  });
});
