# Public Aggregate Dashboard Design

## Context

Dashboard Vaccine will be deployed through Google Apps Script with Google Sheets as the back-end datastore. The first public-facing experience must help district leaders see progress quickly while keeping operational child-level data behind role-controlled access.

The agreed visual direction is an official but warm community-service theme: cream backgrounds, muted green, deep maroon, restrained gold accents, compact dashboard density, and Thai-first labels. The first screen should feel approachable for service units while still credible for district leadership.

## Goals

- Provide one non-login URL for aggregate executive visibility.
- Open first to vaccine progress because that is the main district leadership question.
- Keep data-quality monitoring available beside it for district administrators and supervisors.
- Keep all child-level, worker-level, row-level issue, import, approval, export, and audit workflows behind operational login.
- Deploy through Google Apps Script without introducing a separate hosting platform for the first release.

## Non-Goals

- Do not expose child names, full or masked CID, addresses, worker names, row-level issues, `record_json`, or detailed operational records on the non-login page.
- Do not implement field-worker PIN login in the first public dashboard release.
- Do not show fake vaccine-progress figures before the monthly reporting schema is ready.
- Do not make Google Sheets the direct monthly editing surface for service-unit staff.

## Users And Entry Points

The public URL opens without login and shows only aggregate data. It includes a small "เข้าสู่ระบบเจ้าหน้าที่" button in the top-right corner.

Operational users enter through the staff login surface. Staff and district administrators use organizational Google accounts checked against the existing user configuration. Field workers may use PIN-based access later, but that is outside the first dashboard release.

## Public Page Structure

Use a single page with two tabs:

1. **Dashboard ความก้าวหน้าวัคซีน**
   - Default active tab.
   - Intended for the district chief and leadership.
   - Shows vaccine status proportions across all 14 service units and month-to-month movement.

2. **Dashboard ติดตามคุณภาพข้อมูล**
   - Adjacent tab.
   - Intended for district administrators and supervisors.
   - Shows baseline registry readiness and data-quality follow-up status.

The page uses the "overview first, details second" layout: top KPI cards, then service-unit-level detail, then notes or warnings.

## Vaccine Progress Tab

This tab is the long-term executive landing view. It will show only aggregate information:

- Vaccine status proportions for 14 service units.
- District-level totals for status groups such as on-schedule, delayed, refused, and other approved reporting statuses.
- Month-to-month movement, especially whether children delayed last month improved in the current month.
- Unit-level stacked bars or proportional rows.
- Clear month and last-updated labels.

If the monthly reporting backend is not ready in the first release, this tab should display a transparent empty state such as "กำลังเตรียมข้อมูลรายเดือน" in the real dashboard frame rather than placeholder numbers.

## Data Quality Tab

This tab should work in the first release using the baseline workflow already present in the codebase. It shows:

- Service units with confirmed baseline registry out of 14.
- Confirmed children count.
- Provisional or waiting-for-confirmation children count.
- Units needing follow-up or with pending issues.
- A service-unit table with service unit code/name, baseline status, confirmed children, provisional children, pending issue count, and last updated time.

The table may show service-unit names and codes because these are organizational aggregate data, not child-level or individual worker data.

## Backend Shape

Add a public aggregate server function that returns a whitelisted model only. It must not reuse operational models that include row-level detail.

Suggested response shape:

```ts
interface PublicDashboardModel {
  lastUpdatedAt: string;
  vaccineProgress: {
    state: "READY" | "NOT_READY";
    reportingMonth?: string;
    districtTotals?: Record<string, number>;
    serviceUnits?: Array<{
      serviceUnitCode: string;
      serviceUnitName: string;
      totals: Record<string, number>;
      delayedMovement?: {
        previousMonthDelayed: number;
        currentMonthDelayed: number;
        improvedFromPreviousMonth: number;
      };
    }>;
  };
  dataQuality: {
    confirmedUnits: number;
    totalUnits: number;
    confirmedChildren: number;
    provisionalChildren: number;
    unitsNeedingFollowUp: number;
    serviceUnits: Array<{
      serviceUnitCode: string;
      serviceUnitName: string;
      baselineStatus: string;
      confirmedChildren: number;
      provisionalChildren: number;
      pendingIssueCount: number;
      lastUpdatedAt: string;
    }>;
  };
}
```

The Apps Script HTML page calls only this aggregate endpoint before login. Operational functions remain behind staff login and role checks.

## Security And Privacy

The public aggregate page intentionally has no login and no token in the first design. Risk is reduced by returning only aggregate whitelisted data and by avoiding all row-level payloads.

The implementation must verify the public endpoint cannot return:

- Child names.
- CID, masked or full.
- Addresses.
- Worker names.
- Row-level validation issues.
- Raw JSON records.
- Import batch details beyond aggregate counts and statuses.

This decision is recorded separately in ADR 0044 because it changes access expectations and is not obvious from code alone.

## Release Plan

Release 1:

- Public page with two tabs.
- Vaccine progress tab as the default view, using a transparent "not ready yet" state if monthly aggregate data is not available.
- Data quality tab powered by current baseline aggregate data.
- Staff login button leading to operational workflow.
- Warm official community-service visual theme.

Release 2:

- Monthly vaccine-progress aggregate schema.
- Stacked status proportions by service unit.
- Month-to-month delayed-group movement.
- Drill-down links that require login before showing any child-level or reason-level detail.

Future:

- Field-worker PIN login.
- Role-scoped drill-down and exports.
- Proactive activity and alternative-vaccine aggregate dashboard modules.

## Acceptance Criteria

- A user opening the public URL sees the vaccine progress tab first without logging in.
- The public page includes a data quality tab beside the vaccine progress tab.
- The public model contains aggregate fields only.
- The data quality tab can show baseline readiness from the current backend.
- The vaccine progress tab never shows fake values when backend data is not ready.
- Staff actions require login and existing role checks.
- The UI works on desktop and mobile without overlapping text or cramped dashboard cards.

