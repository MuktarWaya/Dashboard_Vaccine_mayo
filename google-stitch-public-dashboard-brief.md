# Google Stitch Brief: Dashboard Vaccine Public Aggregate Dashboard

## Project Context

Dashboard Vaccine is a Google Apps Script web app backed by Google Sheets. It supports vaccine follow-up work for children across 14 service units in Mayo District.

The first public-facing page should help district leaders quickly understand overall progress without requiring login. Operational work, child-level data, staff workflows, imports, approvals, confirmations, exports, and audit details stay behind staff login and role checks.

Design this as a real public-sector health operations dashboard, not a marketing landing page.

## Primary Design Goal

Create a Thai-first public aggregate dashboard that opens without login and gives district leadership a clear overview of vaccine progress and data readiness.

The page should feel:

- Official
- Warm
- Trustworthy
- Calm under operational pressure
- Compact enough for repeated work
- Easy to read on desktop and mobile

## Visual Direction

Use an official but warm community-service theme.

Preferred visual cues:

- Soft official background
- Muted green for health/service readiness
- Deep maroon for institutional weight and emphasis
- Restrained gold accents for important highlights
- Clear Thai typography
- Compact dashboard density
- Strong contrast for older users and field staff

Avoid:

- Generic SaaS purple/blue gradient style
- Marketing hero layout
- Oversized decorative cards
- Decorative charts without operational meaning
- Dark dashboard unless there is a clear usability reason
- Fake-looking medical stock imagery
- Child photos or identifiable human imagery

## Users

### District Leadership

They need a quick executive overview: current progress, incomplete coverage, delayed groups, and which service units need attention.

### District Vaccine Team

They need to monitor baseline readiness, data quality, pending issues, and unit-level reporting status.

### Service Unit Staff

They may open the public page to see shared progress, but operational actions must happen after staff login.

## Entry Point

The public URL opens without login.

The top-right area should include a small button:

`เข้าสู่ระบบเจ้าหน้าที่`

This button leads to the staff login or operational staff page. The public page itself must not show staff-only actions.

## Page Structure

Use a single-page dashboard with two tabs.

### Tab 1: Dashboard ความก้าวหน้าวัคซีน

This is the default active tab.

Purpose: executive progress view.

It should show aggregate vaccine progress across 14 service units.

Long-term content:

- Current reporting month
- Last updated time
- District-level vaccine status proportions
- Counts by status, such as on-schedule, delayed, refused, and other approved reporting statuses
- Service-unit-level proportional rows or stacked bars
- Month-to-month movement, especially delayed children who improved this month

Important first-release behavior:

If monthly vaccine-progress data is not ready yet, do not show fake values. Show a transparent empty state inside the real dashboard frame:

`กำลังเตรียมข้อมูลรายเดือน`

The empty state should still feel like a finished dashboard page, not a broken placeholder.

### Tab 2: Dashboard ติดตามคุณภาพข้อมูล

Purpose: data readiness and baseline registry quality.

This tab should work in the first release using aggregate baseline data.

Show:

- Confirmed service units out of 14
- Confirmed children count
- Provisional or waiting-for-confirmation children count
- Units needing follow-up
- Service-unit-level table

Suggested table columns:

- รหัสหน่วยบริการ
- ชื่อหน่วยบริการ
- สถานะทะเบียนตั้งต้น
- จำนวนเด็กที่ยืนยันแล้ว
- จำนวนเด็กชั่วคราว
- จำนวนประเด็นรอตรวจ
- อัปเดตล่าสุด

Service unit names and codes may be shown because they are organizational aggregate data.

## Layout Guidance

Use an overview-first, details-second structure:

1. Top app header with dashboard title, district label, last updated time, and staff login button.
2. Tab navigation.
3. KPI summary row.
4. Main chart or empty state.
5. Service-unit comparison section.
6. Notes or data caveats.

The page must work on:

- Desktop screens used by district leadership
- Tablets
- Mobile phones used by service-unit staff

Avoid overlapping text, cramped cards, and tiny table text on mobile. On small screens, service-unit detail can become stacked rows instead of a wide table.

## Data Privacy Rules

The public dashboard is intentionally non-login in the first release. It must show only whitelisted aggregate data.

Do not include or design UI for:

- Child names
- CID, full or masked
- Birth dates
- Addresses
- Worker names
- Individual field-worker performance
- Row-level validation issues
- Raw records
- Raw JSON
- Import batch details beyond aggregate counts and statuses
- Approval, confirmation, export, or audit actions
- Drill-down views that reveal child-level or worker-level data

Any drill-down or staff action should require login first.

## Safe Sample Data Shape

Use this sample shape only for design. It contains no real child-level data.

```json
{
  "lastUpdatedAt": "2026-06-02T09:30:00+07:00",
  "district": {
    "name": "อำเภอมายอ",
    "totalServiceUnits": 14
  },
  "vaccineProgress": {
    "state": "NOT_READY",
    "emptyStateMessage": "กำลังเตรียมข้อมูลรายเดือน"
  },
  "dataQuality": {
    "confirmedUnits": 8,
    "totalUnits": 14,
    "confirmedChildren": 1240,
    "provisionalChildren": 360,
    "unitsNeedingFollowUp": 6,
    "serviceUnits": [
      {
        "serviceUnitCode": "00001",
        "serviceUnitName": "รพ.สต.ตัวอย่าง 1",
        "baselineStatus": "ยืนยันแล้ว",
        "confirmedChildren": 120,
        "provisionalChildren": 0,
        "pendingIssueCount": 0,
        "lastUpdatedAt": "2026-06-02T08:45:00+07:00"
      },
      {
        "serviceUnitCode": "00002",
        "serviceUnitName": "รพ.สต.ตัวอย่าง 2",
        "baselineStatus": "รอยืนยัน",
        "confirmedChildren": 0,
        "provisionalChildren": 86,
        "pendingIssueCount": 3,
        "lastUpdatedAt": "2026-06-01T16:10:00+07:00"
      },
      {
        "serviceUnitCode": "00003",
        "serviceUnitName": "PCU ตัวอย่าง",
        "baselineStatus": "ต้องติดตาม",
        "confirmedChildren": 0,
        "provisionalChildren": 42,
        "pendingIssueCount": 8,
        "lastUpdatedAt": "2026-06-01T14:20:00+07:00"
      }
    ]
  }
}
```

## Copy Tone

Use concise Thai labels. The interface should sound like a public health operations tool, not a campaign website.

Good examples:

- `ความก้าวหน้าวัคซีน`
- `ติดตามคุณภาพข้อมูล`
- `ยืนยันแล้ว 8 จาก 14 หน่วยบริการ`
- `ข้อมูลรายเดือนยังไม่พร้อมแสดง`
- `เข้าสู่ระบบเจ้าหน้าที่`
- `อัปเดตล่าสุด`

Avoid vague or inflated language such as:

- `พลิกโฉมการติดตาม`
- `ระบบอัจฉริยะ`
- `ยกระดับแบบไร้ขีดจำกัด`
- `แดชบอร์ดแห่งอนาคต`

## First Release Requirements

- The public page opens without login.
- The vaccine progress tab opens first.
- If vaccine progress data is not ready, show a finished empty state rather than fake numbers.
- The data quality tab shows baseline readiness from aggregate data.
- A staff login button is visible but not visually dominant.
- The design never suggests that child-level data is public.
- The dashboard is readable on mobile.

## Implementation Constraints

The final implementation will run in Google Apps Script HTML Service.

Assume:

- Plain HTML, CSS, and JavaScript are safest.
- The page calls a server function such as `getPublicDashboardModel()`.
- The public model must be aggregate-only.
- The staff page is a separate operational flow.

Design components should be practical to rebuild in static HTML/CSS without requiring a heavy frontend framework.

