export const BASELINE_HEADERS = [
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
] as const;

export type BaselineHeader = (typeof BASELINE_HEADERS)[number];
export const BASELINE_VACCINE_STATUSES = [
  "ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า",
  "ได้รับบางส่วน-ยังไม่ครบเกณฑ์",
  "ได้รับบางส่วน-ล่าช้าต่อเนื่อง",
  "ปฏิเสธการฉีด",
  "ฉีดตามเกณฑ์",
] as const;
export type BaselineApprovalState =
  | "STAGED"
  | "VALIDATED"
  | "REJECTED"
  | "DISTRICT_APPROVED"
  | "UNIT_CONFIRMED";

export interface BaselineRecord {
  cid: string;
  serviceUnitCode: string;
  firstName: string;
  lastName: string;
  sex: "ชาย" | "หญิง";
  birthDate: string;
  houseNumber: string;
  villageNo: string;
  registryStatus: "อยู่ในทะเบียนติดตาม";
  baselineVaccineStatus: (typeof BASELINE_VACCINE_STATUSES)[number];
  nextVaccineDueDate: string;
  entryType: "ทะเบียนตั้งต้น";
  indicatorStartMonth: string;
  isPpaTarget: boolean;
  isAlternativeVaccineTarget: boolean;
  primaryVhvName: string;
  primaryFamilyHealthVolunteerName: string;
}

export interface ValidationIssue {
  rowNumber: number;
  field: string;
  code: string;
  message: string;
}

export interface BaselineBatch {
  batchId: string;
  serviceUnitCode: string;
  state: BaselineApprovalState;
  rowCount: number;
  issues: ValidationIssue[];
  stagedBy: string;
  stagedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface BaselineCoverage {
  confirmedUnits: number;
  totalUnits: number;
  confirmedChildren: number;
  provisionalChildren: number;
}
