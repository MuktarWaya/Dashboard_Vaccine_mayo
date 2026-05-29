import {
  BASELINE_HEADERS,
  BASELINE_VACCINE_STATUSES,
  type ValidationIssue,
} from "./baseline";

const PARTIAL_INCOMPLETE_STATUS = "ได้รับบางส่วน-ยังไม่ครบเกณฑ์";

const REQUIRED_FIELDS = [
  ["house_number", 6],
  ["village_no", 7],
  ["registry_status", 8],
  ["entry_type", 11],
  ["indicator_start_month", 12],
] as const;

export function validateBaselineRows(
  headers: readonly string[],
  rows: string[][],
  expectedServiceUnitCode: string,
  approvedServiceUnitCodes: Set<string>,
): ValidationIssue[] {
  if (!headersMatch(headers)) {
    return [
      {
        rowNumber: 1,
        field: "headers",
        code: "INVALID_HEADERS",
        message: "หัวคอลัมน์ไม่ตรงกับ template มาตรฐาน",
      },
    ];
  }

  const issues: ValidationIssue[] = [];
  const seenCids = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const cid = valueAt(row, 0);
    const serviceUnitCode = valueAt(row, 1);
    const birthDate = valueAt(row, 5);
    const baselineStatus = valueAt(row, 9);
    const nextDueDate = valueAt(row, 10);
    const primaryVhvName = valueAt(row, 15);
    const primaryFamilyName = valueAt(row, 16);

    if (!/^\d{13}$/.test(cid)) {
      issues.push({
        rowNumber,
        field: "cid",
        code: "INVALID_CID",
        message: "CID ต้องเป็นตัวเลข 13 หลัก",
      });
    } else {
      if (seenCids.has(cid)) {
        issues.push({
          rowNumber,
          field: "cid",
          code: "DUPLICATE_CID",
          message: "CID ซ้ำในชุดนำเข้า",
        });
      }
      seenCids.add(cid);
    }

    if (!approvedServiceUnitCodes.has(serviceUnitCode)) {
      issues.push({
        rowNumber,
        field: "service_unit_code",
        code: "UNKNOWN_SERVICE_UNIT",
        message: "ไม่พบรหัสหน่วยบริการที่อนุมัติ",
      });
    }

    if (serviceUnitCode !== expectedServiceUnitCode) {
      issues.push({
        rowNumber,
        field: "service_unit_code",
        code: "WRONG_SERVICE_UNIT",
        message: "ชุดนำเข้าต้องมีเฉพาะหน่วยบริการเดียว",
      });
    }

    if (!isRealIsoDate(birthDate)) {
      issues.push({
        rowNumber,
        field: "birth_date",
        code: "INVALID_BIRTH_DATE",
        message: "วันเกิดต้องเป็นวันที่มาตรฐาน YYYY-MM-DD",
      });
    }

    if (!(BASELINE_VACCINE_STATUSES as readonly string[]).includes(baselineStatus)) {
      issues.push({
        rowNumber,
        field: "baseline_vaccine_status",
        code: "INVALID_BASELINE_STATUS",
        message: "สถานะวัคซีนเดือนฐานไม่อยู่ในรายการมาตรฐาน",
      });
    }

    if (baselineStatus === PARTIAL_INCOMPLETE_STATUS && !nextDueDate.trim()) {
      issues.push({
        rowNumber,
        field: "next_vaccine_due_date",
        code: "MISSING_NEXT_VACCINE_DUE_DATE",
        message: "ต้องระบุวันที่ควรได้รับวัคซีนครั้งถัดไป",
      });
    }

    REQUIRED_FIELDS.forEach(([field, fieldIndex]) => {
      if (!valueAt(row, fieldIndex).trim()) {
        issues.push({
          rowNumber,
          field,
          code: "MISSING_REQUIRED_FIELD",
          message: "ต้องระบุข้อมูลเด็กขั้นต่ำ",
        });
      }
    });

    if (!primaryVhvName.trim()) {
      issues.push({
        rowNumber,
        field: "primary_vhv_name",
        code: "MISSING_PRIMARY_VHV",
        message: "ต้องระบุ อสม.หลัก",
      });
    }

    if (!primaryFamilyName.trim()) {
      issues.push({
        rowNumber,
        field: "primary_family_health_volunteer_name",
        code: "MISSING_PRIMARY_FAMILY_VOLUNTEER",
        message: "ต้องระบุ ผรส.หลัก",
      });
    }
  });

  return issues;
}

function headersMatch(headers: readonly string[]): boolean {
  return (
    headers.length === BASELINE_HEADERS.length &&
    BASELINE_HEADERS.every((header, index) => headers[index] === header)
  );
}

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function valueAt(row: string[], index: number): string {
  return row[index] ?? "";
}
