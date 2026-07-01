export interface GenerateUnitCodeGsTemplateInput {
  centralApiUrl: string;
  serviceUnitCode: string;
  serviceUnitName: string;
  sheetName: string;
  token: string;
}

export function generateUnitCodeGsTemplate(input: GenerateUnitCodeGsTemplateInput): string {
  return `const DASHBOARD_VACCINE_API_URL = ${JSON.stringify(input.centralApiUrl)};
const SERVICE_UNIT_CODE = ${JSON.stringify(input.serviceUnitCode)};
const SERVICE_UNIT_NAME = ${JSON.stringify(input.serviceUnitName)};
const SOURCE_SHEET_NAME = ${JSON.stringify(input.sheetName)};
const UNIT_TOKEN = ${JSON.stringify(input.token)};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dashboard Vaccine')
    .addItem('ส่งข้อมูลรายเดือน', 'submitCurrentMonthAggregate')
    .addToUi();
}

function submitCurrentMonthAggregate() {
  const reportMonth = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
  const payload = buildMonthlyAggregate(reportMonth);
  const response = UrlFetchApp.fetch(DASHBOARD_VACCINE_API_URL + '?action=submitUnitMonthly', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  SpreadsheetApp.getUi().alert(response.getContentText());
}

function buildMonthlyAggregate(reportMonth) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SOURCE_SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต ' + SOURCE_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const rows = values.slice(1);
  const statusIndex = headers.indexOf('สถานะวัคซีน');
  if (statusIndex === -1) throw new Error('ไม่พบคอลัมน์ สถานะวัคซีน');

  const counts = {
    totalChildren: rows.filter(function(row) { return row.join('').trim() !== ''; }).length,
    onSchedule: 0,
    delayed: 0,
    refused: 0,
    postponed: 0,
    notFound: 0,
    followedUp: 0,
  };

  rows.forEach(function(row) {
    const status = String(row[statusIndex] || '').trim();
    if (status === 'ตามกำหนด') counts.onSchedule += 1;
    else if (status === 'ล่าช้า') counts.delayed += 1;
    else if (status === 'ปฏิเสธ') counts.refused += 1;
    else if (status === 'เลื่อนนัด') counts.postponed += 1;
    else if (status === 'ไม่พบ') counts.notFound += 1;
    else if (status) counts.followedUp += 1;
  });

  return {
    serviceUnitCode: SERVICE_UNIT_CODE,
    reportMonth: reportMonth,
    totalChildren: counts.totalChildren,
    onSchedule: counts.onSchedule,
    delayed: counts.delayed,
    refused: counts.refused,
    postponed: counts.postponed,
    notFound: counts.notFound,
    followedUp: counts.followedUp,
    submittedAt: new Date().toISOString(),
    token: UNIT_TOKEN,
  };
}
`;
}
