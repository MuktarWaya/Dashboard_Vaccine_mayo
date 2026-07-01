export const DEFAULT_MONTHLY_SHEET_NAME = "รายงานรายเดือน";
export const DEFAULT_ADMIN_PASSWORD = "009941";
export const ADMIN_PASSWORD_PROPERTY = "DASHBOARD_ADMIN_PASSWORD";
export const ADMIN_SESSION_CACHE_PREFIX = "dashboard-admin-session:";
export const ADMIN_SESSION_TTL_SECONDS = 1800;

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

export interface AdminSession {
  sessionToken: string;
  issuedAt: string;
  expiresInSeconds: number;
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

export function verifyAdminPassword(inputPassword: string, configuredPassword?: string | null): boolean {
  const expected = configuredPassword?.trim() || DEFAULT_ADMIN_PASSWORD;
  return inputPassword === expected;
}

export function createAdminSession(now: string, uuid: () => string): AdminSession {
  return {
    sessionToken: uuid(),
    issuedAt: now,
    expiresInSeconds: ADMIN_SESSION_TTL_SECONDS,
  };
}
