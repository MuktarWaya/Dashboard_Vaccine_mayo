// Domain models สำหรับ Vaccine Dashboard

export type ChildVaccineStatus =
  | 'ตามกำหนด'
  | 'ล่าช้า'
  | 'ปฏิเสธ'
  | 'เลื่อนนัด'
  | 'ไม่พบ'
  | 'ติดตามแล้ว';

export type ServiceUnitReportStatus =
  | 'ส่งครบ'
  | 'ส่งแต่ยังติดตาม'
  | 'ยังไม่ส่ง'
  | 'ส่งไม่ครบ';

export interface ServiceUnitData {
  serviceUnitCode: string;
  serviceUnitName: string;
  reportStatus: ServiceUnitReportStatus;
  coverage: number;
  totalChildren: number;
  needFollowUp: number;
  lastUpdated: string;
}

export interface DistrictData {
  name: string;
  totalChildren: number;
  coverage: number;
  onSchedule: number;
  delayed: number;
  refused: number;
  needFollowUp: number;
}

export interface VaccineProgressData {
  state: 'READY' | 'NOT_READY';
  message?: string;
  district?: DistrictData;
  serviceUnits?: ServiceUnitData[];
}

export interface DataQualityData {
  unitsReported: number;
  totalUnits: number;
  unitsCompleted: number;
  unitsNeedFollowUp: number;
  serviceUnits: ServiceUnitData[];
}

export interface PublicDashboardData {
  lastUpdatedAt: string;
  reportMonth: string;
  vaccineProgress: VaccineProgressData;
  dataQuality: DataQualityData;
}

// Executive Dashboard types
export interface ExecutiveDashboardData extends PublicDashboardData {
  executiveView: {
    kpiScores: {
      district: number;
      bestUnit: { code: string; name: string; score: number };
      needsAttention: { code: string; name: string; score: number };
    };
    trends: {
      monthOverMonth: number;
      comparedToLastMonth: number;
    };
    rankings: ServiceUnitData[];
  };
}
