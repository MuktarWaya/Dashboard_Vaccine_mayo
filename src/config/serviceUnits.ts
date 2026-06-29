/**
 * CONFIGURATION: Google Sheets สำหรับ 13 รพ.สต. + 1 PCU
 *
 * วิธีหา Spreadsheet ID:
 * 1. เปิด Google Sheet ที่ต้องการ
 * 2. Copy ID จาก URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
 * 3. วางใน field spreadsheetId ด้านล่าง
 *
 * ⚠️ สำคัญ: กรุณาแก้ไข spreadsheetId ทุกตัวก่อน build & deploy
 */

import type { ServiceUnitSheetConfig } from "../domain/vaccineMonthly";

export const SERVICE_UNIT_CONFIGS: ServiceUnitSheetConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // รพ.สต. กลุ่มที่ 1
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    serviceUnitCode: "09941",
    serviceUnitName: "รพ.สต.บาตัง",
    spreadsheetId: "",  // ← ใส่ Spreadsheet ID ตรงนี้ (เช่น: 1AbCdEf1234567890)
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09942",
    serviceUnitName: "รพ.สต.ทับปุด",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09943",
    serviceUnitName: "รพ.สต.ตะโกะ",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09944",
    serviceUnitName: "รพ.สต.ท่าแพะ",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // รพ.สต. กลุ่มที่ 2
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    serviceUnitCode: "09945",
    serviceUnitName: "รพ.สต.ปาโจะ",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09946",
    serviceUnitName: "รพ.สต.ป่าไก่",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09947",
    serviceUnitName: "รพ.สต.มายอ",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09948",
    serviceUnitName: "รพ.สต.ตะเคิด",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // รพ.สต. กลุ่มที่ 3
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    serviceUnitCode: "09949",
    serviceUnitName: "รพ.สต.บาตอง",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09950",
    serviceUnitName: "รพ.สต.ไหล่ป่า",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09951",
    serviceUnitName: "รพ.สต.ป่าโนน",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09952",
    serviceUnitName: "รพ.สต.ห้วยลาด",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09953",
    serviceUnitName: "รพ.สต.ท่าลาด",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  {
    serviceUnitCode: "09954",
    serviceUnitName: "รพ.สต.โคกโต๊ะ",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // PCU (ถ้ามี)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    serviceUnitCode: "09955",
    serviceUnitName: "PCU มายอ",
    spreadsheetId: "",
    sheetName: "รายงานรายเดือน",
  },
];

/**
 * ตรวจสอบว่า configuration ถูกต้องหรือไม่
 * ใช้สำหรับ validation ก่อน deploy
 */
export function validateServiceUnitConfigs(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of SERVICE_UNIT_CONFIGS) {
    if (!config.spreadsheetId || config.spreadsheetId.trim() === "") {
      errors.push(
        `❌ ${config.serviceUnitName} (${config.serviceUnitCode}): ยังไม่ได้ระบุ Spreadsheet ID`
      );
    } else if (config.spreadsheetId.length < 10) {
      errors.push(
        `❌ ${config.serviceUnitName} (${config.serviceUnitCode}): Spreadsheet ID ดูไม่ถูกต้อง (สั้นเกินไป)`
      );
    }
  }

  const codes = SERVICE_UNIT_CONFIGS.map((c) => c.serviceUnitCode);
  const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (duplicates.length > 0) {
    errors.push(`❌ มี serviceUnitCode ซ้ำ: ${[...new Set(duplicates)].join(", ")}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
