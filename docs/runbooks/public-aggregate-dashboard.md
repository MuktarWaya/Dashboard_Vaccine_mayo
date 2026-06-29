# Public aggregate dashboard runbook

## Purpose

The public Google Apps Script web app URL opens the non-login aggregate dashboard for Dashboard Vaccine อำเภอมายอ.

The public dashboard shows:

- `Dashboard ความก้าวหน้าวัคซีน` as the first tab.
- `กำลังเตรียมข้อมูลรายเดือน` while monthly vaccine aggregate data is not ready.
- `Dashboard ติดตามคุณภาพข้อมูล` with aggregate baseline readiness by service unit.

The public dashboard must not expose child-level, worker-level, row-level issue, raw record, import, approval, export, or audit payloads.

## Backing Google Sheet

Both public and staff deployments read from the shared Dashboard Vaccine datastore:

```text
https://docs.google.com/spreadsheets/d/1H4ShB4fZCHt22J8coGXHn1KDgykjrxi3TueJDJ9ZoA8/edit
```

The code opens this sheet by ID instead of relying on `SpreadsheetApp.getActive()`, because the public and staff Apps Script projects are standalone deployments. To override the backing sheet later, set this Apps Script script property in both deployments:

```text
DASHBOARD_VACCINE_SPREADSHEET_ID
```

The public deployment runs as the deployer, so the deployer account must have access to this sheet. The staff deployment runs as the user accessing the app, so staff users who operate the staff workflow must also have the required sheet access, or the sheet should be shared appropriately within the organization.

## Deployment manifests

Use two manifests from the same codebase.

Public aggregate deployment:

- Manifest: `appsscript.json`
- Clasp target: `.clasp.public.json`
- Web app access: `ANYONE_ANONYMOUS`
- Execute as: `USER_DEPLOYING`
- Purpose: non-login aggregate visibility only
- Build command: `npm run build`
- Push command: `npm run push:public`

Staff operational deployment:

- Manifest: `appsscript.staff.json`
- Clasp target: `.clasp.staff.json`
- Web app access: `DOMAIN`
- Execute as: `USER_ACCESSING`
- Purpose: staff identity, role checks, import, approval, confirmation, and operational workflows
- Build command: `npm run build:staff`
- Push command: `npm run push:staff`

## URLs

Open the public dashboard from the public deployment URL without query parameters.

Open the staff baseline workflow from the staff deployment URL with:

```text
?page=staff
```

Do not rely on the public deployment for staff actions, because the public deployment executes as the deployer and is intended only for aggregate data.

## Clasp target setup

Create two local target files before pushing. These files are intentionally ignored by git because they contain deployment-specific Script IDs.

Public target:

```text
Copy .clasp.public.json.example to .clasp.public.json
Set scriptId to the public aggregate Apps Script project ID
```

Staff target:

```text
Copy .clasp.staff.json.example to .clasp.staff.json
Set scriptId to the staff operational Apps Script project ID
```

The two Script IDs should be different. Keeping separate Apps Script projects prevents the public anonymous manifest from replacing the staff domain-login manifest, and prevents the staff manifest from closing the public dashboard.

## Pre-push checks

Run tests before deployment:

```text
npm test
```

Build the public deployment:

```text
npm run build
```

Confirm these files exist in `dist`:

- `Code.js`
- `appsscript.json`
- `publicDashboard.html`
- `adminBaseline.html`

For staff deployment, run:

```text
npm run build:staff
```

Then confirm `dist/appsscript.json` contains:

```json
{
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"
  }
}
```

## Privacy checks

The public model must remain aggregate-only. It must not include:

- CID, full or masked.
- Child names.
- Birth dates.
- Addresses.
- Worker names.
- Raw records or `record_json`.
- Row-level validation issue details.
- Import batch action payloads.
- Approval, confirmation, export, or audit actions.

If the monthly vaccine aggregate backend is not ready, the vaccine progress tab must show `กำลังเตรียมข้อมูลรายเดือน` instead of placeholder numbers.
