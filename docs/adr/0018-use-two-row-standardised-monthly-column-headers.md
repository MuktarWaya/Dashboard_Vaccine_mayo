# Use two-row standardised monthly column headers

The prototype contains duplicate Thai month column labels, which prevents reliable aggregation and would become harder to manage across 24 months and 14 service-unit sheets. Each unit sheet will use two header rows for monthly fields: a unique machine-readable key row such as `2026-06.status`, `2026-06.latest_follower`, `2026-06.latest_followup_date`, and `2026-06.followup_state`, plus a Thai display-label row for field staff; Apps Script will read and write by the key row only.
