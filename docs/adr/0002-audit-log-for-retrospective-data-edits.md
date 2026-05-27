# Audit retrospective changes to monthly tracking data

The dashboard is used for executive reporting and past monthly totals may change if recorded vaccine status or follow-up details are corrected later. Google Apps Script will automatically write edits to a central `LOG_การแก้ไขข้อมูล` sheet containing edit timestamp, editor, CID, service unit, data month, edited field, previous value, and new value, so corrections remain possible without allowing unexplained changes to historical reports.
