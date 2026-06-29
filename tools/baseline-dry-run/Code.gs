const DRY_RUN_CONFIG = {
  SERVICE_UNIT_CODE: "09941",
  SERVICE_UNIT_NAME: "รพ.สต.ตรัง",
  DISTRICT_APPROVER_EMAIL: "",
  UNIT_CONFIRMER_EMAIL: "",
  TEMPLATE_ROWS: 300,
};

const BASELINE_HEADERS = [
  "cid",
  "service_unit_code",
  "first_name",
  "last_name",
  "sex",
  "birth_date",
  "house_number",
  "village_no",
  "registry_status",
  "baseline_vaccine_status",
  "next_vaccine_due_date",
  "entry_type",
  "indicator_start_month",
  "is_ppa_target",
  "is_alternative_vaccine_target",
  "primary_vhv_name",
  "primary_family_health_volunteer_name",
];

const BASELINE_VACCINE_STATUSES = [
  "ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า",
  "ได้รับบางส่วน-ยังไม่ครบเกณฑ์",
  "ได้รับบางส่วน-ล่าช้าต่อเนื่อง",
  "ปฏิเสธการฉีด",
  "ฉีดตามเกณฑ์",
];

const LEGACY_MAPPING_NOTES = [
  ["baseline_header", "legacy source from รพ.สต.ตรัง CSV", "dry-run preparation note"],
  ["cid", "เลขที่บัตรประชาชนCID", "ต้องเป็นเลข 13 หลัก"],
  ["service_unit_code", "หน่วยบริการ", `ใส่รหัส ${DRY_RUN_CONFIG.SERVICE_UNIT_CODE} ทุกแถว`],
  ["first_name", "ชื่อNAME", "ตัดช่องว่างหัวท้ายก่อนนำเข้า"],
  ["last_name", "นามสกุลLNAME", "ตัดช่องว่างหัวท้ายก่อนนำเข้า"],
  ["sex", "เพศSEX", "ใช้ค่า ชาย หรือ หญิง"],
  ["birth_date", "วันเกิดBIRTH", "ใช้รูปแบบ YYYY-MM-DD"],
  ["house_number", "บ้านเลขที่", "ต้องไม่ว่าง"],
  ["village_no", "หมู่", "ต้องไม่ว่าง"],
  ["registry_status", "ไม่มีในไฟล์เดิม", "ใช้ อยู่ในทะเบียนติดตาม"],
  ["baseline_vaccine_status", "สถานะ วัคซีน ณ.เดือน พ.ค. 2569", "แปลงเป็นค่ามาตรฐานใน dropdown"],
  ["next_vaccine_due_date", "ไม่มีในไฟล์เดิม", "ใส่เมื่อสถานะได้รับบางส่วนแต่ยังไม่ครบ/ล่าช้าต่อเนื่อง"],
  ["entry_type", "ไม่มีในไฟล์เดิม", "ใช้ ทะเบียนตั้งต้น"],
  ["indicator_start_month", "เดือนเริ่มนับตัวชี้วัด", "ใช้รูปแบบ YYYY-MM เช่น 2026-06"],
  ["is_ppa_target", "เป็นเป้าหมาย PPA", "ใช้ ใช่ หรือ ไม่ใช่"],
  ["is_alternative_vaccine_target", "เป็นเป้าหมาย รับวัคซีนทางเลือก", "ใช้ ใช่ หรือ ไม่ใช่"],
  ["primary_vhv_name", "ชื่อ อสม.ที่รับผิดชอบ", "ต้องเติมชื่อผู้รับผิดชอบหลัก"],
  ["primary_family_health_volunteer_name", "ชื่อ ผรส.ที่รับผิดชอบ", "ต้องเติมชื่อผู้รับผิดชอบหลัก"],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Dashboard Vaccine Dry Run")
    .addItem("สร้างรูปแบบชีต รพ.สต.ตรัง", "setupBaselineDryRunSheets")
    .addToUi();
}

function setupBaselineDryRunSheets() {
  const spreadsheet = SpreadsheetApp.getActive();

  writeSheet(spreadsheet, "CFG_SERVICE_UNITS", [
    ["service_unit_code", "service_unit_name", "active"],
    [DRY_RUN_CONFIG.SERVICE_UNIT_CODE, DRY_RUN_CONFIG.SERVICE_UNIT_NAME, true],
  ]);

  writeSheet(spreadsheet, "CFG_BASELINE_USERS", [
    ["email", "baseline_role", "service_unit_code", "active"],
    [DRY_RUN_CONFIG.DISTRICT_APPROVER_EMAIL, "DISTRICT_APPROVER", "", true],
    [DRY_RUN_CONFIG.UNIT_CONFIRMER_EMAIL, "UNIT_CONFIRMER", DRY_RUN_CONFIG.SERVICE_UNIT_CODE, true],
  ]);

  const template = writeSheet(spreadsheet, "BASELINE_TEMPLATE", [BASELINE_HEADERS]);
  prepareBaselineTemplate(template);

  const notes = writeSheet(spreadsheet, "LEGACY_MAPPING_NOTES", LEGACY_MAPPING_NOTES);
  notes.autoResizeColumns(1, 3);

  SpreadsheetApp.getUi().alert(
    `สร้างรูปแบบชีตสำหรับ ${DRY_RUN_CONFIG.SERVICE_UNIT_NAME} (${DRY_RUN_CONFIG.SERVICE_UNIT_CODE}) แล้ว\n\nเติม email ใน CFG_BASELINE_USERS และเติมข้อมูลเด็กใน BASELINE_TEMPLATE ก่อนนำไป stage ใน web app`,
  );
}

function writeSheet(spreadsheet, sheetName, values) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  sheet.clear();
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, values[0].length).setFontWeight("bold");
  return sheet;
}

function prepareBaselineTemplate(sheet) {
  const rowCount = DRY_RUN_CONFIG.TEMPLATE_ROWS;
  const rows = Array.from({ length: rowCount }, () => Array(BASELINE_HEADERS.length).fill(""));
  rows.forEach((row) => {
    row[1] = DRY_RUN_CONFIG.SERVICE_UNIT_CODE;
    row[8] = "อยู่ในทะเบียนติดตาม";
    row[11] = "ทะเบียนตั้งต้น";
    row[12] = "2026-06";
  });

  sheet.getRange(2, 1, rowCount, BASELINE_HEADERS.length).setValues(rows);
  sheet.getRange(1, 1, rowCount + 1, BASELINE_HEADERS.length).createFilter();
  sheet.autoResizeColumns(1, BASELINE_HEADERS.length);

  setDropdown(sheet, "sex", ["ชาย", "หญิง"]);
  setDropdown(sheet, "registry_status", ["อยู่ในทะเบียนติดตาม"]);
  setDropdown(sheet, "baseline_vaccine_status", BASELINE_VACCINE_STATUSES);
  setDropdown(sheet, "entry_type", ["ทะเบียนตั้งต้น"]);
  setDropdown(sheet, "is_ppa_target", ["ใช่", "ไม่ใช่"]);
  setDropdown(sheet, "is_alternative_vaccine_target", ["ใช่", "ไม่ใช่"]);
  setDateFormat(sheet, "birth_date");
  setDateFormat(sheet, "next_vaccine_due_date");
}

function setDropdown(sheet, header, allowedValues) {
  const column = BASELINE_HEADERS.indexOf(header) + 1;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedValues, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, column, DRY_RUN_CONFIG.TEMPLATE_ROWS, 1).setDataValidation(rule);
}

function setDateFormat(sheet, header) {
  const column = BASELINE_HEADERS.indexOf(header) + 1;
  sheet.getRange(2, column, DRY_RUN_CONFIG.TEMPLATE_ROWS, 1).setNumberFormat("@");
}
