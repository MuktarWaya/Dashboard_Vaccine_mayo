/**
 * Domain model สำหรับข้อมูลวัคซีนรายเดือน
 * ใช้สำหรับรวมข้อมูลจาก 13 รพ.สต. + 1 PCU
 */

/**
 * สถานะวัคซีนรายเดือนของเด็กแต่ละคน
 */
export type ChildVaccineStatus =
  | "ตามกำหนด"   // ได้รับวัคซีนตามเวลาที่กำหนด
  | "ล่าช้า"       // ได้รับวัคซีนแต่ล่าช้าจากกำหนด
  | "ปฏิเสธ"       // ผู้ปกครองปฏิเสธการฉีดวัคซีน
  | "เลื่อนนัด"    // เลื่อนนัดจากโรงพยาบาล
  | "ไม่พบ"        // ไม่พบตัวตามที่อยู่
  | "ติดตามแล้ว"; // ติดตามแล้วแต่ยังไม่ได้รับวัคซีน

/**
 * สถานะการรายงานของหน่วยบริการ
 */
export type ServiceUnitReportStatus =
  | "ส่งครบ"         // ส่งข้อมูลครบถ้วน พร้อมรายงาน
  | "ส่งแต่ยังติดตาม" // ส่งข้อมูลแล้วแต่ยังมีเด็กที่ต้องติดตาม (ล่าช้า/ปฏิเสธ)
  | "ยังไม่ส่ง"      // ยังไม่ได้ส่งข้อมูลเดือนนี้
  | "ส่งไม่ครบ";     // ส่งข้อมูลไม่ครบ

/**
 * ข้อมูลเด็กแต่ละคนจากการรายงานรายเดือน
 * (สำหรับ internal use - ไม่แสดงบน public dashboard)
 */
export interface ChildMonthlyRecord {
  cid: string;                    // เลขประจำตัวประชาชน (mask บน public dashboard)
  name: string;                    // ชื่อ (ไม่แสดงบน public)
  birthDate: string;              // วันเกิด (ไม่แสดงบน public)
  serviceUnitCode: string;         // รหัสหน่วยบริการ
  vaccineStatus: ChildVaccineStatus;
  vaccineDate?: string;            // วันที่ได้รับวัคซีน (ถ้าได้รับ)
  followUpDate: string;            // วันที่ติดตาม
  lastFollowUpBy?: string;         // ผู้ติดตามครั้งล่าสุด (ไม่แสดงบน public)
  notes?: string;                  // หมายเหตุ (optional)
}

/**
 * ข้อมูลรายเดือนของหน่วยบริการแห่งหนึ่ง
 */
export interface ServiceUnitMonthlyData {
  serviceUnitCode: string;
  serviceUnitName: string;
  reportMonth: string;             // เดือนรายงาน (format: YYYY-MM)
  reportStatus: ServiceUnitReportStatus;

  // จำนวนเด็กแยกตามสถานะ
  totalChildren: number;
  onSchedule: number;              // ตามกำหนด
  delayed: number;                 // ล่าช้า
  refused: number;                 // ปฏิเสธ
  postponed: number;               // เลื่อนนัด
  notFound: number;                // ไม่พบ
  followedUp: number;               // ติดตามแล้ว

  // เป้าหมาย KPI
  targetCoverage: number;          // เป้าหมายความครอบคลุม (%)
  actualCoverage: number;          // ความครอบคลุมจริง (%)

  lastUpdated: string;             // ISO 8601 timestamp
  reportedBy?: string;              // ผู้รายงาน (ไม่แสดงบน public)
}

/**
 * ข้อมูลรวมระดับอำเภอสำหรับ Dashboard
 */
export interface DistrictVaccineSummary {
  districtName: string;             // "อำเภอมายอ"
  reportMonth: string;              // เดือนรายงาน
  lastUpdated: string;

  // ยอดรวมทั้งอำเภอ
  totalServiceUnits: number;        // 14
  unitsReported: number;            // จำนวนหน่วยบริการที่รายงานแล้ว
  unitsCompleted: number;           // จำนวนหน่วยบริการที่ส่งครบ

  totalChildren: number;             // จำนวนเด็กทั้งหมด
  totalOnSchedule: number;
  totalDelayed: number;
  totalRefused: number;
  totalPostponed: number;
  totalNotFound: number;
  totalFollowedUp: number;

  // KPI ระดับอำเภอ
  districtCoverage: number;         // ความครอบคลุมรวม (%)

  // ข้อมูลรายหน่วยบริการ (สำหรับ admin dashboard)
  serviceUnits: ServiceUnitMonthlyData[];
}

/**
 * ข้อมูลสำหรับ Public Dashboard (ภาพรวม - ไม่มีข้อมูลระบุตัวตน)
 */
export interface PublicVaccineDashboardModel {
  lastUpdatedAt: string;
  reportMonth: string;

  // Tab 1: ความก้าวหน้าวัคซีน
  vaccineProgress: {
    state: "READY" | "NOT_READY";
    message?: string;

    // ข้อมูลเมื่อพร้อม
    district?: {
      name: string;
      totalChildren: number;
      coverage: number;              // ความครองคลุมรวม (%)
      onSchedule: number;
      delayed: number;
      refused: number;
      needFollowUp: number;          // เด็กที่ต้องติดตาม (ล่าช้า + ปฏิเสธ)
    };

    // ข้อมูลรายหน่วยบริการ (aggregate only)
    serviceUnits?: Array<{
      serviceUnitCode: string;
      serviceUnitName: string;
      reportStatus: ServiceUnitReportStatus;
      coverage: number;
      totalChildren: number;
      needFollowUp: number;
    }>;
  };

  // Tab 2: ติดตามคุณภาพข้อมูล
  dataQuality: {
    unitsReported: number;
    totalUnits: number;
    unitsCompleted: number;
    unitsNeedFollowUp: number;

    serviceUnits: Array<{
      serviceUnitCode: string;
      serviceUnitName: string;
      reportStatus: ServiceUnitReportStatus;
      lastUpdated: string;
    }>;
  };
}

/**
 * Configuration สำหรับการเชื่อมต่อกับ Google Sheets ของแต่ละ รพ.สต.
 */
export interface ServiceUnitSheetConfig {
  serviceUnitCode: string;
  serviceUnitName: string;
  spreadsheetId: string;             // Google Spreadsheet ID
  sheetName: string;                 // ชื่อ Sheet ที่มีข้อมูล (default: "รายงานรายเดือน")
}

/**
 * Input สำหรับการดึงข้อมูลรายเดือน
 */
export interface FetchMonthlyDataInput {
  reportMonth: string;               // format: "2026-06"
  serviceUnitConfigs: ServiceUnitSheetConfig[];
}

/**
 * Result จากการดึงข้อมูลรายเดือน
 */
export interface FetchMonthlyDataResult {
  success: boolean;
  summary: DistrictVaccineSummary;
  errors?: Array<{
    serviceUnitCode: string;
    serviceUnitName: string;
    error: string;
  }>;
}
