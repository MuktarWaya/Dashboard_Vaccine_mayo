import type { PublicDashboardData } from '@/types/vaccine';

export interface FacilityComparisonItem {
  name: string;
  coverage: number;
  onSchedulePercent: number;
  followUpPercent: number;
  refusedPercent: number;
}

export interface DashboardViewModel {
  progressReady: boolean;
  statusMessage: string;
  districtCoverageLabel: string;
  totalChildrenLabel: string;
  reportedUnitsLabel: string;
  completedUnitsLabel: string;
  followUpUnitsLabel: string;
  facilityComparison: FacilityComparisonItem[];
}

const thaiNumber = new Intl.NumberFormat('th-TH');

export function buildDashboardViewModel(data: PublicDashboardData | null): DashboardViewModel {
  const progressReady = Boolean(
    data?.vaccineProgress.state === 'READY' && data.vaccineProgress.district
  );
  const district = data?.vaccineProgress.district;
  const quality = data?.dataQuality;

  return {
    progressReady,
    statusMessage: data?.vaccineProgress.message ?? 'กำลังเตรียมข้อมูลรายเดือน',
    districtCoverageLabel: progressReady && district ? `${district.coverage.toFixed(1)}%` : 'กำลังเตรียมข้อมูล',
    totalChildrenLabel: progressReady && district ? thaiNumber.format(district.totalChildren) : '-',
    reportedUnitsLabel: `${thaiNumber.format(quality?.unitsReported ?? 0)}/${thaiNumber.format(quality?.totalUnits ?? 14)}`,
    completedUnitsLabel: thaiNumber.format(quality?.unitsCompleted ?? 0),
    followUpUnitsLabel: thaiNumber.format(quality?.unitsNeedFollowUp ?? 0),
    facilityComparison: progressReady ? buildFacilityComparison(data?.vaccineProgress.serviceUnits ?? []) : [],
  };
}

function buildFacilityComparison(serviceUnits: NonNullable<PublicDashboardData['vaccineProgress']['serviceUnits']>): FacilityComparisonItem[] {
  return serviceUnits.map((unit) => {
    const onSchedulePercent = Math.min(100, Math.max(0, unit.coverage));
    const followUpPercent = Math.max(0, 100 - onSchedulePercent);

    return {
      name: unit.serviceUnitName,
      coverage: unit.coverage,
      onSchedulePercent,
      followUpPercent,
      refusedPercent: 0,
    };
  });
}

export function buildNotReadyDashboardData(message = 'กำลังเตรียมข้อมูลรายเดือน'): PublicDashboardData {
  return {
    lastUpdatedAt: new Date().toISOString(),
    reportMonth: new Date().toISOString().slice(0, 7),
    vaccineProgress: {
      state: 'NOT_READY',
      message,
    },
    dataQuality: {
      unitsReported: 0,
      totalUnits: 14,
      unitsCompleted: 0,
      unitsNeedFollowUp: 14,
      serviceUnits: [],
    },
  };
}
