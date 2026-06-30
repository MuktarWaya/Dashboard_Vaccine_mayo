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
import { defaultServiceUnitSettings } from "../domain/serviceUnitSettings";

export const SERVICE_UNIT_CONFIGS: ServiceUnitSheetConfig[] = defaultServiceUnitSettings().map((unit) => ({
  serviceUnitCode: unit.serviceUnitCode,
  serviceUnitName: unit.serviceUnitName,
  spreadsheetId: unit.spreadsheetId,
  sheetName: unit.sheetName,
}));

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
