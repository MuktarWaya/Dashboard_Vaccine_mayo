export const DEFAULT_MONTHLY_SHEET_NAME = "รายงานรายเดือน";

export interface CanonicalServiceUnit {
  serviceUnitCode: string;
  serviceUnitName: string;
}

export interface ServiceUnitSetting extends CanonicalServiceUnit {
  spreadsheetId: string;
  sheetName: string;
  enabled: boolean;
  tokenHash?: string;
  lastSubmittedAt?: string;
  lastError?: string;
}

export const CANONICAL_SERVICE_UNITS: CanonicalServiceUnit[] = [
  { serviceUnitCode: "09940", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลถนน" },
  { serviceUnitCode: "09941", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง" },
  { serviceUnitCode: "09942", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลกระหวะ" },
  { serviceUnitCode: "09943", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลลุโบะยิไร" },
  { serviceUnitCode: "09944", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลลางา" },
  { serviceUnitCode: "09945", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลกระเสาะ" },
  { serviceUnitCode: "09946", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลเกาะจัน" },
  { serviceUnitCode: "09947", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลปะโด" },
  { serviceUnitCode: "09948", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอบน" },
  { serviceUnitCode: "09949", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอใต้" },
  { serviceUnitCode: "09950", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลสะกำ" },
  { serviceUnitCode: "09951", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลปานัน" },
  { serviceUnitCode: "41083", serviceUnitName: "โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านน้ำใส" },
  { serviceUnitCode: "77483", serviceUnitName: "ศูนย์สุขภาพชุมชนตำบลมายอ" },
];

export function serviceUnitByCode(code: string): CanonicalServiceUnit | undefined {
  return CANONICAL_SERVICE_UNITS.find((unit) => unit.serviceUnitCode === code);
}

export function defaultServiceUnitSettings(): ServiceUnitSetting[] {
  return CANONICAL_SERVICE_UNITS.map((unit) => ({
    serviceUnitCode: unit.serviceUnitCode,
    serviceUnitName: unit.serviceUnitName,
    spreadsheetId: "",
    sheetName: DEFAULT_MONTHLY_SHEET_NAME,
    enabled: true,
  }));
}
