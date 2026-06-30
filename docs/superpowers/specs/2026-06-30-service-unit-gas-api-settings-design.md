# Service Unit GAS API Settings Design

## Goal

Create a configuration and data-ingestion design for Dashboard Vaccine Mayo that connects 14 service units to the public dashboard through Google Apps Script while keeping child-level and operational data out of the public frontend.

The system will support 13 subdistrict health promoting hospitals plus 1 PCU:

| Code | Service unit |
| --- | --- |
| 09940 | โรงพยาบาลส่งเสริมสุขภาพตำบลถนน |
| 09941 | โรงพยาบาลส่งเสริมสุขภาพตำบลตรัง |
| 09942 | โรงพยาบาลส่งเสริมสุขภาพตำบลกระหวะ |
| 09943 | โรงพยาบาลส่งเสริมสุขภาพตำบลลุโบะยิไร |
| 09944 | โรงพยาบาลส่งเสริมสุขภาพตำบลลางา |
| 09945 | โรงพยาบาลส่งเสริมสุขภาพตำบลกระเสาะ |
| 09946 | โรงพยาบาลส่งเสริมสุขภาพตำบลเกาะจัน |
| 09947 | โรงพยาบาลส่งเสริมสุขภาพตำบลปะโด |
| 09948 | โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอบน |
| 09949 | โรงพยาบาลส่งเสริมสุขภาพตำบลสาคอใต้ |
| 09950 | โรงพยาบาลส่งเสริมสุขภาพตำบลสะกำ |
| 09951 | โรงพยาบาลส่งเสริมสุขภาพตำบลปานัน |
| 41083 | โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านน้ำใส |
| 77483 | ศูนย์สุขภาพชุมชนตำบลมายอ |

## Recommended Architecture

Use a push-based aggregate ingestion model.

Each service unit keeps its own Google Sheet. A bound Apps Script `Code.gs` runs inside that sheet, reads local rows, converts them into aggregate monthly counts, and submits only those aggregate counts to the central Dashboard Vaccine GAS API.

The public Cloudflare React dashboard reads from the central GAS API only. It never reads child-level service-unit spreadsheets directly.

## Why This Approach

This is the best fit for the project because it keeps the public dashboard fast, simple, and privacy-safe.

Directly reading 14 separate service-unit Google Sheets from the public dashboard would create more permissions work, slower page loads, and a greater risk of exposing row-level fields. Pushing aggregate data into one central store gives the district dashboard one stable API and creates a clear boundary: local sheets may contain operational detail, but the central public API contains only approved summary values.

## Data Flow

1. A service unit updates its own Google Sheet.
2. The bound `Code.gs` in that sheet reads the configured monthly sheet.
3. The bound script computes aggregate counts for one reporting month.
4. The bound script sends an authenticated POST request to Central GAS.
5. Central GAS validates service-unit code, token, month, and payload shape.
6. Central GAS stores the submitted aggregate in the central dashboard spreadsheet.
7. The Cloudflare React dashboard calls Central GAS for public aggregate dashboard data.

## Settings Page

Add a protected Settings page to the React frontend, reachable from the dashboard through a system settings action. The page is for the district system owner only.

The first screen asks for an admin password. For the initial release the admin password is `009941`, but it must be validated by Central GAS, not hardcoded as a trusted frontend secret. The React app may collect the password, but Central GAS decides whether the session can read or change settings.

After successful login, the Settings page shows one row per service unit:

- service unit code
- service unit name
- spreadsheet ID
- monthly sheet name
- unit token status
- last successful submission time
- last error
- actions: save, test connection, generate `Code.gs`

The Settings page must not show child records, raw rows, or operational issue lists.

## Central GAS API

Central GAS should expose these actions:

| Method | Action | Purpose |
| --- | --- | --- |
| GET | `publicDashboard` | Return public aggregate dashboard data for a month. |
| POST | `adminLogin` | Validate admin password and issue a short-lived admin session token. |
| GET | `getSettings` | Return service-unit configuration after admin validation. |
| POST | `saveSettings` | Save service-unit spreadsheet IDs, sheet names, and tokens after admin validation. |
| POST | `testUnitConnection` | Check whether Central GAS can identify a configured service unit and current status. |
| POST | `submitUnitMonthly` | Receive aggregate monthly counts from a service-unit bound script. |

Admin sessions can be stored as short-lived tokens in `CacheService`. Persistent configuration belongs in the central dashboard spreadsheet or `PropertiesService`, depending on size and audit needs. For 14 rows, a `CONFIG_SERVICE_UNITS` sheet is easier for the user to inspect and back up than raw script properties.

## Unit `Code.gs` Template

The Settings page should generate a unit-specific `Code.gs` template. The user copies it into the service unit's Google Sheet extension.

The generated script includes:

- central API URL
- service unit code
- service unit name
- unit token
- source sheet name
- expected header names or column mappings
- a menu item such as `Dashboard Vaccine > ส่งข้อมูลรายเดือน`
- a function to submit the selected or current report month

The bound script sends only aggregate data:

```json
{
  "serviceUnitCode": "09941",
  "reportMonth": "2026-06",
  "totalChildren": 120,
  "onSchedule": 100,
  "delayed": 12,
  "refused": 3,
  "postponed": 0,
  "notFound": 5,
  "followedUp": 0,
  "submittedAt": "2026-06-30T10:00:00+07:00",
  "token": "unit-secret-token"
}
```

The bound script must not submit names, CID, address, worker names, raw notes, or row-level details.

## Central Storage

Use the central dashboard spreadsheet as the durable store.

Recommended sheets:

- `CONFIG_SERVICE_UNITS`: one row per service unit, including code, name, spreadsheet ID, monthly sheet name, token hash or token reference, enabled state, and timestamps.
- `MONTHLY_UNIT_AGGREGATES`: one row per service unit per reporting month, including aggregate counts and submission metadata.
- `INGESTION_LOG`: append-only log of submissions, validation failures, admin changes, and test connection attempts.

`MONTHLY_UNIT_AGGREGATES` should be upserted by `(reportMonth, serviceUnitCode)` so the latest corrected submission replaces the aggregate row while the append-only log preserves history.

## Security And Privacy

The frontend must treat `009941` as an input only, not as a real secret. Real validation happens in Central GAS.

Recommended initial security controls:

- Hash the admin password in GAS configuration or compare through a server-side-only value.
- Use short-lived admin session tokens for settings actions.
- Give each service unit its own token.
- Store only token hashes where practical.
- Validate that `serviceUnitCode` in a submission matches the token.
- Log every settings change and ingestion submission.
- Return only aggregate public data from public endpoints.

This is sufficient for the initial internal dashboard while preserving a path toward stronger Google account-based admin login later.

## Error Handling

Central GAS should return clear structured errors:

- unknown service unit code
- invalid token
- invalid report month
- missing required aggregate field
- negative count
- total count mismatch
- disabled service unit

The Settings page should show these errors without exposing row-level service-unit data.

The public dashboard should continue showing partial data when some units have not submitted, with visible coverage such as `9/14 หน่วยบริการ`.

## Testing Strategy

Add pure TypeScript tests for:

- the canonical 14 service-unit list
- payload validation
- aggregate upsert behavior
- public response omitting forbidden personal keys
- settings access requiring admin validation

Add Apps Script adapter tests where feasible for:

- `submitUnitMonthly`
- `getSettings`
- `saveSettings`
- `publicDashboard`

Manual verification should include one dry run with `09941` using the template file referenced by the user, then a second dry run with a different unit to confirm that unit-specific token checks work.

## Implementation Boundaries

This design does not add child-level drilldown, named worker reporting, Google OAuth admin roles, or direct public reads from the 14 service-unit spreadsheets.

The first implementation should focus on:

1. Canonical 14-unit config.
2. Central GAS settings and aggregate ingestion API.
3. Settings UI protected by server-side password validation.
4. Generated unit `Code.gs` template.
5. Public dashboard reading central aggregate data.
