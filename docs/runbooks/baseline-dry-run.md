# Baseline Registry Dry Run

## Purpose

Verify the standardised import, automatic validation, district approval, service-unit confirmation, and aggregate coverage using one service unit before district-wide import.

## Required Evidence

- Approved `CFG_SERVICE_UNITS` row for the selected service unit, using its official five-digit unit code.
- Named district approver and named service-unit confirmer in `CFG_BASELINE_USERS`.
- Standardised baseline file with machine-readable headers matching `BASELINE_HEADERS`.
- Validation result, import batch ID, approval timestamp, and unit-confirmation timestamp.

## Procedure

1. Deploy the test web app against the dry-run spreadsheet and run `provisionBaselineTables`.
2. Add only the approved dry-run unit and appointed actors; do not load other service units for this rehearsal.
3. Stage the standardised file and resolve all validation issues before district approval.
4. Confirm that `VALIDATED` rows remain staged and do not enter `CHILD_REGISTRY` before district approval.
5. Approve as the district approver, confirm approved rows enter `CHILD_REGISTRY`, and confirm the page shows children/rows only as provisional.
6. Confirm as the service-unit confirmer and confirm coverage changes to `1 จาก 14 หน่วยบริการ`.
7. Inspect staging and batch tables for recorded actors and timestamps.
8. Record pass/fail; do not reuse a failed dry-run spreadsheet as the production data store.

## Pass Criteria

- Invalid CID, unknown unit code, duplicate CID, and missing principal worker data are rejected.
- Validated rows cannot enter `CHILD_REGISTRY` before district approval.
- Unauthorized users, non-approvers, and wrong-unit confirmers cannot execute controlled transitions.
- A clean batch cannot count as confirmed before service-unit confirmation.
- The coverage view contains counts/status only, with no child name or CID.
- The batch record identifies staging, approval, and confirmation actors and timestamps.
