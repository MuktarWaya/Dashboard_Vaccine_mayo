# Store all mobile follow-up events in a central log

The 14 service-unit sheets must remain easy to use with one child per row, while mobile field workers may record multiple follow-up events for one child within a month and those events are needed for audit and KPI logic. Google Apps Script will store each mobile event in a central `LOG_การติดตาม` sheet with timestamp, reporting month, CID, service-unit code, recorder, result, information-source type, limited note, and verification state; unit sheets will retain only each month's latest follow-up summary alongside official monthly status.
