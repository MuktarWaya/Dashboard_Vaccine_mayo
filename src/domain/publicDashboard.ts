import type { BaselineBatch } from "./baseline";

export interface PublicDashboardServiceUnit {
  serviceUnitCode: string;
  serviceUnitName: string;
}

export interface PublicDashboardModel {
  lastUpdatedAt: string;
  tabs: Array<{
    id: "vaccineProgress" | "dataQuality";
    label: string;
  }>;
  vaccineProgress: {
    state: "READY" | "NOT_READY";
    message?: string;
  };
  dataQuality: {
    confirmedUnits: number;
    totalUnits: number;
    confirmedChildren: number;
    provisionalChildren: number;
    unitsNeedingFollowUp: number;
    serviceUnits: PublicDashboardServiceUnitStatus[];
  };
}

export interface PublicDashboardServiceUnitStatus extends PublicDashboardServiceUnit {
  baselineStatus: "ยืนยันแล้ว" | "รอยืนยัน" | "ต้องติดตาม" | "ยังไม่นำเข้า";
  confirmedChildren: number;
  provisionalChildren: number;
  pendingIssueCount: number;
  lastUpdatedAt: string;
}

export interface BuildPublicDashboardModelInput {
  lastUpdatedAt: string;
  serviceUnits: readonly PublicDashboardServiceUnit[];
  batches: readonly BaselineBatch[];
  totalUnits: number;
}

const FORBIDDEN_PUBLIC_KEYS = [
  "cid",
  "first_name",
  "firstname",
  "firstName",
  "last_name",
  "lastname",
  "lastName",
  "birth_date",
  "birthDate",
  "house_number",
  "houseNumber",
  "address",
  "worker",
  "vhv",
  "primary_vhv_name",
  "primaryVhvName",
  "primary_family_health_volunteer_name",
  "primaryFamilyHealthVolunteerName",
  "record_json",
  "recordJson",
  "raw",
  "issues",
  "issue",
  "stagedBy",
  "approvedBy",
  "confirmedBy",
  "audit",
  "export",
] as const;

export function buildPublicDashboardModel(input: BuildPublicDashboardModelInput): PublicDashboardModel {
  const unitStatuses = input.serviceUnits.map((unit) => serviceUnitStatus(unit, input.batches));

  return {
    lastUpdatedAt: input.lastUpdatedAt,
    tabs: [
      { id: "vaccineProgress", label: "Dashboard ความก้าวหน้าวัคซีน" },
      { id: "dataQuality", label: "Dashboard ติดตามคุณภาพข้อมูล" },
    ],
    vaccineProgress: {
      state: "NOT_READY",
      message: "กำลังเตรียมข้อมูลรายเดือน",
    },
    dataQuality: {
      confirmedUnits: unitStatuses.filter((unit) => unit.baselineStatus === "ยืนยันแล้ว").length,
      totalUnits: input.totalUnits,
      confirmedChildren: unitStatuses.reduce((sum, unit) => sum + unit.confirmedChildren, 0),
      provisionalChildren: unitStatuses.reduce((sum, unit) => sum + unit.provisionalChildren, 0),
      unitsNeedingFollowUp: unitStatuses.filter((unit) => unit.baselineStatus !== "ยืนยันแล้ว").length,
      serviceUnits: unitStatuses,
    },
  };
}

export function publicDashboardContainsForbiddenKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => publicDashboardContainsForbiddenKeys(item));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, "");
    const hasForbiddenKey = FORBIDDEN_PUBLIC_KEYS.some((forbidden) =>
      normalizedKey === forbidden.toLowerCase().replace(/[_-]/g, ""),
    );

    return hasForbiddenKey || publicDashboardContainsForbiddenKeys(nestedValue);
  });
}

function serviceUnitStatus(
  unit: PublicDashboardServiceUnit,
  batches: readonly BaselineBatch[],
): PublicDashboardServiceUnitStatus {
  const unitBatches = batches
    .filter((batch) => batch.serviceUnitCode === unit.serviceUnitCode)
    .sort((left, right) => timestamp(right).localeCompare(timestamp(left)));

  const confirmed = unitBatches.find((batch) => batch.state === "UNIT_CONFIRMED");
  if (confirmed) {
    return {
      ...unit,
      baselineStatus: "ยืนยันแล้ว",
      confirmedChildren: confirmed.rowCount,
      provisionalChildren: 0,
      pendingIssueCount: 0,
      lastUpdatedAt: timestamp(confirmed),
    };
  }

  const provisional = unitBatches.find((batch) => batch.state === "DISTRICT_APPROVED");
  if (provisional) {
    return {
      ...unit,
      baselineStatus: "รอยืนยัน",
      confirmedChildren: 0,
      provisionalChildren: provisional.rowCount,
      pendingIssueCount: 0,
      lastUpdatedAt: timestamp(provisional),
    };
  }

  const rejected = unitBatches.find((batch) => batch.state === "REJECTED");
  if (rejected) {
    return {
      ...unit,
      baselineStatus: "ต้องติดตาม",
      confirmedChildren: 0,
      provisionalChildren: 0,
      pendingIssueCount: rejected.issues.length,
      lastUpdatedAt: timestamp(rejected),
    };
  }

  return {
    ...unit,
    baselineStatus: "ยังไม่นำเข้า",
    confirmedChildren: 0,
    provisionalChildren: 0,
    pendingIssueCount: 0,
    lastUpdatedAt: "",
  };
}

function timestamp(batch: BaselineBatch): string {
  return batch.confirmedAt ?? batch.approvedAt ?? batch.stagedAt;
}
