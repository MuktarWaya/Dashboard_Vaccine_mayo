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
  const statusIndex = findHeaderIndex(headers, ['สถานะวัคซีน', 'baseline_vaccine_status', 'vaccine_status', 'status']);
  if (statusIndex === -1) {
    throw new Error('ไม่พบคอลัมน์สถานะวัคซีน: ต้องมี สถานะวัคซีน หรือ baseline_vaccine_status');
  }

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
    const bucket = statusBucket(status);
    if (bucket === 'onSchedule') counts.onSchedule += 1;
    else if (bucket === 'delayed') counts.delayed += 1;
    else if (bucket === 'refused') counts.refused += 1;
    else if (bucket === 'postponed') counts.postponed += 1;
    else if (bucket === 'notFound') counts.notFound += 1;
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

function findHeaderIndex(headers, candidates) {
  const normalizedHeaders = headers.map(normalizeText);
  for (var i = 0; i < candidates.length; i += 1) {
    const index = normalizedHeaders.indexOf(normalizeText(candidates[i]));
    if (index !== -1) return index;
  }
  return -1;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/[\\s_-]+/g, '');
}

function statusBucket(status) {
  const value = normalizeText(status);
  if (!value) return '';
  if (value === normalizeText('ตามกำหนด') || value === normalizeText('ฉีดตามเกณฑ์')) return 'onSchedule';
  if (value.indexOf(normalizeText('ปฏิเสธ')) !== -1 || value.indexOf('refused') !== -1) return 'refused';
  if (value.indexOf(normalizeText('เลื่อนนัด')) !== -1 || value.indexOf('postpone') !== -1) return 'postponed';
  if (value.indexOf(normalizeText('ไม่พบ')) !== -1 || value.indexOf('notfound') !== -1) return 'notFound';
  if (
    value.indexOf(normalizeText('ล่าช้า')) !== -1 ||
    value.indexOf(normalizeText('ยังไม่ครบเกณฑ์')) !== -1 ||
    value.indexOf('delayed') !== -1 ||
    value.indexOf('late') !== -1
  ) {
    return 'delayed';
  }
  return 'followedUp';
}
`;
}
