# Service Unit GAS Setup Runbook

## Purpose

Each service unit keeps its own Google Sheet and uses a bound `Code.gs` script to send aggregate monthly data to the central Dashboard Vaccine GAS API.

## Steps

1. Open the service unit Google Sheet.
2. Open Extensions > Apps Script.
3. Paste the generated `Code.gs` from the Dashboard Settings page.
4. Save the script.
5. Reload the Google Sheet.
6. Open Dashboard Vaccine > ส่งข้อมูลรายเดือน.
7. Confirm the response says `ACCEPTED`.
8. Open the public dashboard and verify the unit appears as submitted.

## Safety

The unit script sends aggregate counts only. It must not send names, CID, addresses, worker names, row notes, or raw records.
