/**
 * Repository สำหรับอ่านข้อมูลวัคซีนรายเดือนจาก Google Sheets
 *
 * รองรับการอ่านข้อมูลจาก:
 * - 13 รพ.สต. (แยก Google Sheets ไฟล์ละหน่วยบริการ)
 * - 1 PCU (ถ้ามี)
 *
 * และรวมเป็น aggregate data สำหรับ Dashboard
 */

import type {
  ChildMonthlyRecord,
  ChildVaccineStatus,
  DistrictVaccineSummary,
  FetchMonthlyDataInput,
  FetchMonthlyDataResult,
  PublicVaccineDashboardModel,
  ServiceUnitMonthlyData,
  ServiceUnitReportStatus,
  ServiceUnitSheetConfig,
} from "../domain/vaccineMonthly";

/**
 * VaccineMonthlyRepository
 * - อ่านข้อมูลจาก Google Sheets หลายไฟล์
 * - รวมข้อมูลระดับอำเภอ
 * - แปลงเป็น model สำหรับ Dashboard
 */
export class VaccineMonthlyRepository {
  private readonly configs: Map<string, ServiceUnitSheetConfig>;

  constructor(serviceUnitConfigs: ServiceUnitSheetConfig[]) {
    this.configs = new Map(
      serviceUnitConfigs.map((config) => [config.serviceUnitCode, config])
    );
  }

  /**
   * ดึงข้อมูลรายเดือนจากทุกหน่วยบริการ
   */
  async fetchMonthlyData(input: FetchMonthlyDataInput): Promise<FetchMonthlyDataResult> {
    const results: ServiceUnitMonthlyData[] = [];
    const errors: FetchMonthlyDataResult["errors"] = [];

    // อ่านข้อมูลจากทุกหน่วยบริการแบบ parallel
    for (const config of input.serviceUnitConfigs) {
      try {
        const unitData = await this.fetchServiceUnitData(config, input.reportMonth);
        results.push(unitData);
      } catch (error) {
        errors.push({
          serviceUnitCode: config.serviceUnitCode,
          serviceUnitName: config.serviceUnitName,
          error: error instanceof Error ? error.message : String(error),
        });
        // เพิ่ม entry แบบ "ยังไม่ส่ง" สำหรับหน่วยบริการที่อ่านไม่ได้
        results.push(this.createNotReportedUnit(config, input.reportMonth));
      }
    }

    // รวมเป็นสรุประดับอำเภอ
    const summary = this.buildDistrictSummary(
      input.reportMonth,
      results,
      errors.length > 0 ? errors : undefined
    );

    return {
      success: errors.length === 0,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * ดึงข้อมูลจาก Google Sheet ของหน่วยบริการแห่งหนึ่ง
   */
  private async fetchServiceUnitData(
    config: ServiceUnitSheetConfig,
    reportMonth: string
  ): Promise<ServiceUnitMonthlyData> {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.sheetName);

    if (!sheet) {
      throw new Error(`Sheet "${config.sheetName}" not found`);
    }

    // อ่านข้อมูลทั้งหมด
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2) {
      // ไม่มีข้อมูล (มีแต่ header)
      return this.createNotReportedUnit(config, reportMonth);
    }

    const data = sheet
      .getRange(2, 1, lastRow - 1, lastCol)
      .getValues() as string[][];

    // Map columns จาก header
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];
    const colMap = this.buildColumnMap(headers);

    // แปลงแต่ละแถวเป็น ChildMonthlyRecord
    const records: ChildMonthlyRecord[] = data
      .map((row) => this.parseRow(row, colMap, config.serviceUnitCode))
      .filter((r): r is ChildMonthlyRecord => r !== null);

    // คำนวณ aggregate ข้อมูล
    return this.aggregateUnitData(config, reportMonth, records);
  }

  /**
   * สร้าง column mapping จาก headers
   */
  private buildColumnMap(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();
    headers.forEach((header, index) => {
      const normalized = this.normalizeHeader(header);
      map.set(normalized, index);
    });
    return map;
  }

  /**
   * Normalize header name สำหรับการค้นหาที่ยืดหยุ่น
   */
  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[\s\-_]/g, "")
      .replace(/่|้|๊|๋/g, ""); // ลดรูปพยางค์ไทย (ถ้าจำเป็น)
  }

  /**
   * Mapping ชื่อ columns ที่เป็นไปได้
   */
  private readonly COLUMN_MAPPINGS: Record<string, string[]> = {
    cid: ["cid", "เลขประจำตัวประชาชน", "id", "เลขบัตร"],
    name: ["name", "ชื่อ", "firstname", "ชื่อจริง"],
    birthDate: ["birthdate", "วันเกิด", "dob", "เกิด"],
    vaccineStatus: ["status", "สถานะ", "vaccinestatus", "สถานะวัคซีน"],
    vaccineDate: ["vaccinedate", "วันได้วัคซีน", "vaccined", "ฉีดวันที่"],
    followUpDate: ["followupdate", "วันติดตาม", "followup", "ติดตามวันที่"],
    lastFollowUpBy: ["followedby", "ผู้ติดตาม", "vhv", "อสม", "ผรส"],
    notes: ["notes", "หมายเหตุ", "remark", "备注"],
  };

  /**
   * แปลง row จาก sheet เป็น ChildMonthlyRecord
   */
  private parseRow(
    row: string[],
    colMap: Map<string, number>,
    serviceUnitCode: string
  ): ChildMonthlyRecord | null {
    const getCol = (key: string): string | undefined => {
      const mappings = this.COLUMN_MAPPINGS[key];
      for (const m of mappings) {
        const index = colMap.get(m);
        if (index !== undefined) {
          return row[index]?.toString().trim();
        }
      }
      return undefined;
    };

    const cid = getCol("cid");
    if (!cid || cid === "") {
      return null; // ไม่มี CID ข้ามแถว
    }

    const name = getCol("name") || "-";
    const birthDate = getCol("birthDate") || "-";

    // Parse vaccine status
    const statusRaw = getCol("vaccineStatus") || "";
    const vaccineStatus = this.parseVaccineStatus(statusRaw);

    return {
      cid,
      name,
      birthDate,
      serviceUnitCode,
      vaccineStatus,
      vaccineDate: getCol("vaccineDate"),
      followUpDate: getCol("followUpDate") || new Date().toISOString().split("T")[0],
      lastFollowUpBy: getCol("lastFollowUpBy"),
      notes: getCol("notes"),
    };
  }

  /**
   * Parse vaccine status จาก string ใน sheet
   */
  private parseVaccineStatus(raw: string): ChildVaccineStatus {
    const normalized = raw.toLowerCase().trim();

    if (["ตามกำหนด", "scheduled", "on", "ได้รับ"].some((k) => normalized.includes(k))) {
      return "ตามกำหนด";
    }
    if (["ล่าช้า", "delayed", "late", "ช้า"].some((k) => normalized.includes(k))) {
      return "ล่าช้า";
    }
    if (["ปฏิเสธ", "refused", "reject", "ไม่ยอมรับ"].some((k) => normalized.includes(k))) {
      return "ปฏิเสธ";
    }
    if (["เลื่อน", "postponed", "defer", "เลื่อนนัด"].some((k) => normalized.includes(k))) {
      return "เลื่อนนัด";
    }
    if (["ไม่พบ", "notfound", "not", "ย้าย"].some((k) => normalized.includes(k))) {
      return "ไม่พบ";
    }

    return "ติดตามแล้ว"; // Default
  }

  /**
   * รวมข้อมูลเป็น ServiceUnitMonthlyData
   */
  private aggregateUnitData(
    config: ServiceUnitSheetConfig,
    reportMonth: string,
    records: ChildMonthlyRecord[]
  ): ServiceUnitMonthlyData {
    const counts = this.countByStatus(records);
    const totalChildren = records.length;

    // คำนวณ coverage (เด็กที่ได้รับวัคซีน / ทั้งหมด)
    const vaccinated = counts.ตามกำหนด + counts.ล่าช้า;
    const actualCoverage = totalChildren > 0 ? (vaccinated / totalChildren) * 100 : 0;
    const targetCoverage = 95; // เป้าหมายมาตรฐาน

    // กำหนด report status
    const reportStatus = this.determineReportStatus(counts);

    return {
      serviceUnitCode: config.serviceUnitCode,
      serviceUnitName: config.serviceUnitName,
      reportMonth,
      reportStatus,
      totalChildren,
      onSchedule: counts.ตามกำหนด,
      delayed: counts.ล่าช้า,
      refused: counts.ปฏิเสธ,
      postponed: counts.เลื่อนนัด,
      notFound: counts.ไม่พบ,
      followedUp: counts.ติดตามแล้ว,
      targetCoverage,
      actualCoverage: Math.round(actualCoverage * 10) / 10, // ทศนิยม 1 ตำแหน่ง
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * นับจำนวนเด็กแยกตามสถานะ
   */
  private countByStatus(records: ChildMonthlyRecord[]): Record<ChildVaccineStatus, number> {
    return {
      ตามกำหนด: records.filter((r) => r.vaccineStatus === "ตามกำหนด").length,
      ล่าช้า: records.filter((r) => r.vaccineStatus === "ล่าช้า").length,
      ปฏิเสธ: records.filter((r) => r.vaccineStatus === "ปฏิเสธ").length,
      เลื่อนนัด: records.filter((r) => r.vaccineStatus === "เลื่อนนัด").length,
      ไม่พบ: records.filter((r) => r.vaccineStatus === "ไม่พบ").length,
      ติดตามแล้ว: records.filter((r) => r.vaccineStatus === "ติดตามแล้ว").length,
    };
  }

  /**
   * กำหนดสถานะการรายงานจากข้อมูลที่ได้
   */
  private determineReportStatus(
    counts: Record<ChildVaccineStatus, number>
  ): ServiceUnitReportStatus {
    const hasPending = counts.ล่าช้า > 0 || counts.ปฏิเสธ > 0;
    const totalChildren = Object.values(counts).reduce((sum, c) => sum + c, 0);

    if (totalChildren === 0) {
      return "ยังไม่ส่ง";
    }

    if (hasPending) {
      return "ส่งแต่ยังติดตาม";
    }

    return "ส่งครบ";
  }

  /**
   * สร้าง ServiceUnitMonthlyData สำหรับหน่วยบริการที่ยังไม่ได้ส่งข้อมูล
   */
  private createNotReportedUnit(
    config: ServiceUnitSheetConfig,
    reportMonth: string
  ): ServiceUnitMonthlyData {
    return {
      serviceUnitCode: config.serviceUnitCode,
      serviceUnitName: config.serviceUnitName,
      reportMonth,
      reportStatus: "ยังไม่ส่ง",
      totalChildren: 0,
      onSchedule: 0,
      delayed: 0,
      refused: 0,
      postponed: 0,
      notFound: 0,
      followedUp: 0,
      targetCoverage: 95,
      actualCoverage: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * รวมข้อมูลเป็น DistrictVaccineSummary
   */
  private buildDistrictSummary(
    reportMonth: string,
    units: ServiceUnitMonthlyData[],
    errors?: FetchMonthlyDataResult["errors"]
  ): DistrictVaccineSummary {
    const totalServiceUnits = 14;
    const unitsReported = units.filter((u) => u.reportStatus !== "ยังไม่ส่ง").length;
    const unitsCompleted = units.filter((u) => u.reportStatus === "ส่งครบ").length;

    // รวมจำนวนเด็กทั้งหมด
    const totalChildren = units.reduce((sum, u) => sum + u.totalChildren, 0);
    const totalOnSchedule = units.reduce((sum, u) => sum + u.onSchedule, 0);
    const totalDelayed = units.reduce((sum, u) => sum + u.delayed, 0);
    const totalRefused = units.reduce((sum, u) => sum + u.refused, 0);
    const totalPostponed = units.reduce((sum, u) => sum + u.postponed, 0);
    const totalNotFound = units.reduce((sum, u) => sum + u.notFound, 0);
    const totalFollowedUp = units.reduce((sum, u) => sum + u.followedUp, 0);

    // คำนวณ coverage ระดับอำเภอ
    const totalVaccinated = totalOnSchedule + totalDelayed;
    const districtCoverage =
      totalChildren > 0 ? (totalVaccinated / totalChildren) * 100 : 0;

    return {
      districtName: "อำเภอมายอ",
      reportMonth,
      lastUpdated: new Date().toISOString(),
      totalServiceUnits,
      unitsReported,
      unitsCompleted,
      totalChildren,
      totalOnSchedule,
      totalDelayed,
      totalRefused,
      totalPostponed,
      totalNotFound,
      totalFollowedUp,
      districtCoverage: Math.round(districtCoverage * 10) / 10,
      serviceUnits: units,
    };
  }

  /**
   * แปลง DistrictVaccineSummary เป็น PublicVaccineDashboardModel
   * (สำหรับใช้บน public dashboard - ไม่มีข้อมูลระบุตัวตน)
   */
  buildPublicDashboard(summary: DistrictVaccineSummary): PublicVaccineDashboardModel {
    const hasData = summary.unitsReported > 0;

    return {
      lastUpdatedAt: summary.lastUpdated,
      reportMonth: summary.reportMonth,

      vaccineProgress: {
        state: hasData ? "READY" : "NOT_READY",
        message: hasData ? undefined : "กำลังเตรียมข้อมูลรายเดือน",

        ...(hasData && {
          district: {
            name: summary.districtName,
            totalChildren: summary.totalChildren,
            coverage: summary.districtCoverage,
            onSchedule: summary.totalOnSchedule,
            delayed: summary.totalDelayed,
            refused: summary.totalRefused,
            needFollowUp: summary.totalDelayed + summary.totalRefused,
          },

          serviceUnits: summary.serviceUnits.map((unit) => ({
            serviceUnitCode: unit.serviceUnitCode,
            serviceUnitName: unit.serviceUnitName,
            reportStatus: unit.reportStatus,
            coverage: unit.actualCoverage,
            totalChildren: unit.totalChildren,
            needFollowUp: unit.delayed + unit.refused,
          })),
        }),
      },

      dataQuality: {
        unitsReported: summary.unitsReported,
        totalUnits: summary.totalServiceUnits,
        unitsCompleted: summary.unitsCompleted,
        unitsNeedFollowUp: summary.unitsReported - summary.unitsCompleted,

        serviceUnits: summary.serviceUnits.map((unit) => ({
          serviceUnitCode: unit.serviceUnitCode,
          serviceUnitName: unit.serviceUnitName,
          reportStatus: unit.reportStatus,
          lastUpdated: unit.lastUpdated,
        })),
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION NOTE:
//
// Sample configurations ถูกย้ายไปยัง src/config/serviceUnits.ts
// เพื่อให้แก้ไข Spreadsheet IDs ง่ายขึ้น
//
// กรุณาแก้ไข spreadsheetId ใน src/config/serviceUnits.ts ก่อน build & deploy
// ═══════════════════════════════════════════════════════════════════════════════
