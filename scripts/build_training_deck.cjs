const pptxgen = require("pptxgenjs");
const path = require("path");

const outDir = path.join("outputs", "training");
const outPath = path.join(outDir, "baseline_import_training_mayo.pptx");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Dashboard Vaccine Mayo";
pptx.subject = "Baseline registry import training";
pptx.title = "การเตรียมไฟล์ทะเบียนตั้งต้นวัคซีนเด็ก";
pptx.company = "อำเภอมายอ";
pptx.lang = "th-TH";
pptx.theme = {
  headFontFace: "Leelawadee UI",
  bodyFontFace: "Leelawadee UI",
  lang: "th-TH",
};
pptx.defineLayout({ name: "CUSTOM_WIDE", width: 13.333, height: 7.5 });
pptx.layout = "CUSTOM_WIDE";

const C = {
  green: "0F766E",
  green2: "115E59",
  mint: "D9EDE8",
  pale: "F6FBF9",
  ink: "16302B",
  gray: "667085",
  line: "C9D7D2",
  warn: "F59E0B",
  warnBg: "FFF2CC",
  blue: "2563EB",
  white: "FFFFFF",
};

function addFooter(slide, page) {
  slide.addText("Dashboard Vaccine อำเภอมายอ | อบรมการนำเข้าทะเบียนตั้งต้น", {
    x: 0.55,
    y: 7.08,
    w: 9.8,
    h: 0.2,
    fontFace: "Leelawadee UI",
    fontSize: 8.5,
    color: C.gray,
    margin: 0,
  });
  slide.addText(String(page), {
    x: 12.25,
    y: 7.05,
    w: 0.45,
    h: 0.2,
    fontFace: "Leelawadee UI",
    fontSize: 9,
    bold: true,
    align: "right",
    color: C.green,
    margin: 0,
  });
}

function titleSlide(title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: C.pale };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.pale }, line: { color: C.pale } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.42, h: 7.5, fill: { color: C.green }, line: { color: C.green } });
  slide.addText("ทะเบียนตั้งต้น", {
    x: 0.78,
    y: 0.85,
    w: 3.8,
    h: 0.34,
    fontFace: "Leelawadee UI",
    fontSize: 15,
    bold: true,
    color: C.green,
    margin: 0,
  });
  slide.addText(title, {
    x: 0.75,
    y: 1.42,
    w: 10.9,
    h: 1.35,
    fontFace: "Leelawadee UI",
    fontSize: 38,
    bold: true,
    color: C.ink,
    breakLine: false,
    fit: "shrink",
    margin: 0,
  });
  slide.addText(subtitle, {
    x: 0.8,
    y: 3.15,
    w: 9.4,
    h: 0.9,
    fontFace: "Leelawadee UI",
    fontSize: 20,
    color: C.gray,
    fit: "shrink",
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.8, y: 4.55, w: 8.7, h: 0, line: { color: C.green, width: 2 } });
  slide.addText("ใช้ไฟล์ Excel เดิมให้เกิดประโยชน์สูงสุด ลดการกรอกรายคน และคุมคุณภาพข้อมูลก่อนนำเข้า", {
    x: 0.8,
    y: 4.85,
    w: 9.7,
    h: 0.62,
    fontFace: "Leelawadee UI",
    fontSize: 17,
    color: C.ink,
    bold: true,
    margin: 0,
  });
  slide.addText("สำหรับเจ้าหน้าที่ 14 หน่วยบริการ อำเภอมายอ", {
    x: 0.8,
    y: 6.55,
    w: 6,
    h: 0.26,
    fontFace: "Leelawadee UI",
    fontSize: 11,
    color: C.gray,
    margin: 0,
  });
}

function sectionSlide(title, lead, page) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  slide.addText(title, {
    x: 0.62,
    y: 0.48,
    w: 11.8,
    h: 0.52,
    fontFace: "Leelawadee UI",
    fontSize: 26,
    bold: true,
    color: C.ink,
    margin: 0,
  });
  slide.addText(lead, {
    x: 0.64,
    y: 1.12,
    w: 11.2,
    h: 0.42,
    fontFace: "Leelawadee UI",
    fontSize: 15.5,
    color: C.gray,
    margin: 0,
  });
  addFooter(slide, page);
  return slide;
}

function addStep(slide, n, title, body, x, y, w) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, fill: { color: C.green }, line: { color: C.green } });
  slide.addText(String(n), { x, y: y + 0.07, w: 0.42, h: 0.2, fontFace: "Leelawadee UI", fontSize: 11, bold: true, color: C.white, align: "center", margin: 0 });
  slide.addText(title, { x: x + 0.58, y: y - 0.02, w, h: 0.28, fontFace: "Leelawadee UI", fontSize: 14.5, bold: true, color: C.ink, margin: 0 });
  slide.addText(body, { x: x + 0.58, y: y + 0.33, w, h: 0.55, fontFace: "Leelawadee UI", fontSize: 11.5, color: C.gray, fit: "shrink", margin: 0 });
}

function addCallout(slide, title, body, x, y, w, h, color = C.green) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: color === C.warn ? C.warnBg : C.mint },
    line: { color, width: 1.3 },
  });
  slide.addText(title, { x: x + 0.18, y: y + 0.14, w: w - 0.36, h: 0.28, fontFace: "Leelawadee UI", fontSize: 13.5, bold: true, color: C.ink, margin: 0 });
  slide.addText(body, { x: x + 0.18, y: y + 0.52, w: w - 0.36, h: h - 0.65, fontFace: "Leelawadee UI", fontSize: 11.2, color: C.gray, fit: "shrink", margin: 0 });
}

titleSlide("การแปลงไฟล์ Excel เดิม\nเป็นไฟล์นำเข้าทะเบียนตั้งต้น", "ลดภาระกรอกรายคน และทำให้ข้อมูลทั้งอำเภอใช้หัวตารางเดียวกัน");

{
  const slide = sectionSlide("เป้าหมายของการอบรม", "หลังจบช่วงนี้ หน่วยบริการควรเตรียมไฟล์ส่งอำเภอได้ด้วยตนเอง", 2);
  addStep(slide, 1, "เข้าใจไฟล์ต้นฉบับ", "รู้ว่าคอลัมน์เดิมใดถูกนำไปใช้ในระบบใหม่ และคอลัมน์ใดต้องเติมเพิ่ม", 0.9, 2.0, 4.6);
  addStep(slide, 2, "ใช้ template กลาง", "วางข้อมูลเดิมลงแท็บ ข้อมูลจากไฟล์เดิม แล้วตรวจผลใน BASELINE_TEMPLATE", 0.9, 3.25, 4.6);
  addStep(slide, 3, "ตรวจคุณภาพก่อนส่ง", "ตรวจ CID, หน่วยบริการ, บ้านเลขที่, หมู่, อสม.หลัก และ ผรส.หลัก", 0.9, 4.5, 4.6);
  addCallout(slide, "หลักคิดสำคัญ", "หน่วยบริการเตรียมข้อมูลได้เอง แต่อำเภอนำเข้าผ่าน workflow กลางเพื่อคุม validation, approval และ coverage", 7.15, 2.0, 4.8, 2.0);
  addCallout(slide, "ไม่ต้องกรอกรายคนใหม่ทั้งหมด", "ใช้ข้อมูลจาก Excel เดิมเป็นฐาน แล้วเติมเฉพาะช่องที่ระบบต้องใช้แต่ไฟล์เดิมยังไม่มี", 7.15, 4.35, 4.8, 1.55, C.warn);
}

{
  const slide = sectionSlide("Flow งานจริงที่ต้องทำ", "ใช้ไฟล์ Excel ของหน่วยเป็นแหล่งตั้งต้น แล้วส่งผลลัพธ์เข้า Google Sheet กลางของอำเภอ", 3);
  const items = [
    ["1", "เปิดไฟล์ template", "เลือกหน่วยบริการหรือใช้ไฟล์แยกของหน่วย"],
    ["2", "วางข้อมูลเดิม", "copy จากไฟล์ Excel/CSV เดิมลงแท็บ ข้อมูลจากไฟล์เดิม"],
    ["3", "ตรวจ BASELINE_TEMPLATE", "ระบบแปลงข้อมูลหลักให้เป็น 17 หัวตาราง"],
    ["4", "เติม อสม./ผรส.", "เติมผู้รับผิดชอบหลักให้ครบทุกคน"],
    ["5", "ส่งให้อำเภอ", "copy ค่า หรือส่ง TSV/Excel ตามที่อำเภอกำหนด"],
  ];
  let x = 0.72;
  items.forEach((item, i) => {
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.1, w: 2.18, h: 2.45, rectRadius: 0.06, fill: { color: i % 2 ? "F8FAFC" : C.pale }, line: { color: C.line, width: 1 } });
    slide.addText(item[0], { x: x + 0.15, y: 2.28, w: 0.45, h: 0.34, fontFace: "Leelawadee UI", fontSize: 16, bold: true, color: C.green, margin: 0 });
    slide.addText(item[1], { x: x + 0.15, y: 2.82, w: 1.8, h: 0.42, fontFace: "Leelawadee UI", fontSize: 14.2, bold: true, color: C.ink, fit: "shrink", margin: 0 });
    slide.addText(item[2], { x: x + 0.15, y: 3.44, w: 1.78, h: 0.65, fontFace: "Leelawadee UI", fontSize: 10.8, color: C.gray, fit: "shrink", margin: 0 });
    if (i < items.length - 1) {
      slide.addShape(pptx.ShapeType.chevron, { x: x + 2.08, y: 3.05, w: 0.32, h: 0.38, fill: { color: C.green }, line: { color: C.green } });
    }
    x += 2.45;
  });
  addCallout(slide, "จุดควบคุมของอำเภอ", "การนำเข้าจริงยังอยู่ในระบบกลาง: stage -> district approve -> unit confirm", 1.0, 5.35, 10.7, 0.75);
}

{
  const slide = sectionSlide("ไฟล์ Excel template ที่หน่วยจะได้รับ", "หนึ่งไฟล์มีหลายแท็บ แต่ละแท็บมีหน้าที่ชัดเจน", 4);
  const rows = [
    ["วิธีใช้", "อ่านลำดับงานและข้อควรระวัง"],
    ["ตั้งค่าหน่วยบริการ", "เลือก/ตรวจรหัสหน่วยบริการ 5 หลัก"],
    ["ข้อมูลจากไฟล์เดิม", "วางข้อมูลจากไฟล์ Excel/CSV เดิมของหน่วย"],
    ["BASELINE_TEMPLATE", "ผลลัพธ์มาตรฐาน 17 คอลัมน์ที่ระบบใช้"],
    ["หัวตารางและคำอธิบาย", "อธิบายว่าแต่ละคอลัมน์คืออะไร"],
    ["รายการที่ต้องตรวจ", "สูตรนับรายการผิดพลาดก่อนส่งกลับอำเภอ"],
  ];
  slide.addTable([["แท็บ", "ใช้ทำอะไร"], ...rows], {
    x: 0.9,
    y: 1.9,
    w: 11.2,
    h: 4.25,
    border: { type: "solid", color: C.line, pt: 0.8 },
    fill: { color: "FFFFFF" },
    fontFace: "Leelawadee UI",
    fontSize: 12.2,
    color: C.ink,
    valign: "mid",
    fit: "shrink",
    margin: 0.08,
    autoFit: false,
    colW: [3.2, 8.0],
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.9, w: 11.2, h: 0.54, fill: { color: C.green }, line: { color: C.green } });
  slide.addText("แท็บ", { x: 1.05, y: 2.06, w: 2.8, h: 0.22, fontFace: "Leelawadee UI", fontSize: 12, bold: true, color: C.white, margin: 0 });
  slide.addText("ใช้ทำอะไร", { x: 4.1, y: 2.06, w: 5.8, h: 0.22, fontFace: "Leelawadee UI", fontSize: 12, bold: true, color: C.white, margin: 0 });
}

{
  const slide = sectionSlide("หัวตารางที่ดึงจากไฟล์เดิมได้ทันที", "คอลัมน์เหล่านี้ช่วยลดการกรอกซ้ำรายคน", 5);
  const rows = [
    ["CID", "เลขที่บัตรประชาชนCID"],
    ["ชื่อ-นามสกุล", "ชื่อNAME + นามสกุลLNAME"],
    ["เพศ / วันเกิด", "เพศSEX + วันเกิดBIRTH"],
    ["ที่อยู่", "บ้านเลขที่ + หมู่"],
    ["สถานะวัคซีนตั้งต้น", "สถานะ วัคซีน ณ.เดือน พ.ค. 2569"],
    ["เป้าหมาย PPA / วัคซีนทางเลือก", "คอลัมน์เป้าหมายเดิม"],
  ];
  slide.addTable([["ข้อมูลในระบบใหม่", "มาจาก Excel เดิม"], ...rows], {
    x: 1.0,
    y: 1.88,
    w: 10.9,
    h: 3.8,
    border: { type: "solid", color: C.line, pt: 0.8 },
    fontFace: "Leelawadee UI",
    fontSize: 13,
    color: C.ink,
    fit: "shrink",
    margin: 0.08,
    colW: [4.0, 6.9],
  });
  addCallout(slide, "สถานะ “ล่าช้า”", "template จะแปลงเป็น “ล่าช้า-ยังไม่ได้เริ่ม/ไม่มีความคืบหน้า” เพื่อให้ตรงกับค่ามาตรฐานของระบบ", 1.0, 5.95, 10.9, 0.72, C.warn);
}

{
  const slide = sectionSlide("ช่องที่ต้องเติมเพิ่มเอง", "จาก dry run รพ.สต.ตรัง พบว่าไฟล์เดิมมักไม่มีข้อมูลผู้รับผิดชอบหลัก", 6);
  addCallout(slide, "primary_vhv_name", "ชื่อ อสม.หลักที่รับผิดชอบเด็กคนนั้น ต้องเติมให้ครบทุกแถว", 1.0, 2.05, 5.25, 1.35, C.warn);
  addCallout(slide, "primary_family_health_volunteer_name", "ชื่อ ผรส.หลักที่รับผิดชอบเด็กคนนั้น ต้องเติมให้ครบทุกแถว", 6.75, 2.05, 5.25, 1.35, C.warn);
  slide.addText("ถ้าสองช่องนี้ว่าง ระบบจะ reject ชุดนำเข้า", {
    x: 1.15,
    y: 4.3,
    w: 10.4,
    h: 0.55,
    fontFace: "Leelawadee UI",
    fontSize: 24,
    bold: true,
    color: C.ink,
    align: "center",
    margin: 0,
  });
  slide.addText("เหตุผล: ระบบต้องรู้ผู้รับผิดชอบหลักเพื่อใช้ติดตามงาน สนับสนุนการอบรม และต่อยอดงานภาคสนาม", {
    x: 1.4,
    y: 5.08,
    w: 9.8,
    h: 0.52,
    fontFace: "Leelawadee UI",
    fontSize: 14,
    color: C.gray,
    align: "center",
    margin: 0,
  });
}

{
  const slide = sectionSlide("วิธีแปลงเป็น TSV / ค่าพร้อมนำเข้า", "เน้นส่งค่าที่เห็น ไม่ส่งสูตร", 7);
  addStep(slide, 1, "ตรวจ BASELINE_TEMPLATE", "ดูว่ามีข้อมูลครบ 17 คอลัมน์ และแถวเด็กครบตามจำนวนจริง", 0.9, 1.95, 4.5);
  addStep(slide, 2, "copy เฉพาะข้อมูล", "เลือกตั้งแต่แถวที่ 2 ลงไป ไม่ต้อง copy header ถ้า Google Sheet มี header แล้ว", 0.9, 3.1, 4.5);
  addStep(slide, 3, "paste as values", "วางเป็นค่าเท่านั้น เพื่อไม่พาสูตร Excel ไปยัง Google Sheet กลาง", 0.9, 4.25, 4.5);
  addStep(slide, 4, "ส่งเป็น TSV ได้", "ถ้าต้องส่งไฟล์ ให้ Save As เป็น Text (Tab delimited) หรือให้แอดมินช่วยแปลง", 6.7, 2.55, 4.8);
  addCallout(slide, "ห้ามแก้ header", "ชื่อหัวตารางภาษาอังกฤษใน BASELINE_TEMPLATE เป็น machine-readable header ที่ระบบใช้ตรวจไฟล์", 6.72, 4.55, 4.85, 1.05, C.warn);
}

{
  const slide = sectionSlide("รายการที่ต้องตรวจก่อนส่งกลับอำเภอ", "ใช้แท็บ รายการที่ต้องตรวจ เป็นด่านสุดท้าย", 8);
  const rows = [
    ["จำนวน CID", "ต้องตรงกับจำนวนเด็กที่นำเข้า"],
    ["CID ไม่ครบ 13 หลัก", "ต้องเป็น 0"],
    ["อสม.หลักว่าง", "ต้องเป็น 0"],
    ["ผรส.หลักว่าง", "ต้องเป็น 0"],
    ["บ้านเลขที่/หมู่ว่าง", "ต้องเป็น 0 หรือแก้เหตุให้ชัด"],
    ["รหัสหน่วยบริการ", "ต้องตรงกับหน่วยตนเท่านั้น"],
  ];
  slide.addTable([["ตรวจอะไร", "ผ่านเมื่อ"], ...rows], {
    x: 1.0,
    y: 1.9,
    w: 10.9,
    h: 4.35,
    border: { type: "solid", color: C.line, pt: 0.8 },
    fontFace: "Leelawadee UI",
    fontSize: 13,
    color: C.ink,
    fit: "shrink",
    margin: 0.08,
    colW: [4.0, 6.9],
  });
}

{
  const slide = sectionSlide("สิ่งที่อำเภอทำหลังได้รับไฟล์", "หน่วยบริการไม่ต้องกังวลเรื่อง approval workflow แต่อำเภอจะใช้ขั้นตอนกลาง", 9);
  addStep(slide, 1, "Stage", "นำไฟล์มาตรวจ header, CID, หน่วยบริการ, วันเกิด, สถานะ และผู้รับผิดชอบ", 1.0, 2.0, 4.6);
  addStep(slide, 2, "District approve", "ผู้รับผิดชอบอำเภออนุมัติชุดข้อมูลที่ผ่าน validation", 1.0, 3.2, 4.6);
  addStep(slide, 3, "Unit confirm", "ผู้ยืนยันหน่วยบริการยืนยันว่าทะเบียนตั้งต้นของหน่วยถูกต้อง", 1.0, 4.4, 4.6);
  addCallout(slide, "ก่อน confirm ยังเป็น provisional", "ข้อมูลที่อนุมัติแล้วแต่หน่วยยังไม่ยืนยัน จะยังไม่ถือว่าเป็น coverage สมบูรณ์ของหน่วย", 7.05, 2.45, 4.75, 1.4);
  addCallout(slide, "หลัง confirm", "dashboard จะแสดง coverage เพิ่มเป็นจำนวนหน่วยที่ยืนยันแล้วจาก 14 หน่วย", 7.05, 4.25, 4.75, 1.25);
}

{
  const slide = sectionSlide("ข้อผิดพลาดที่เจอบ่อย", "เตรียมข้อมูลดีตั้งแต่ต้น จะลดรอบแก้ไขระหว่างหน่วยกับอำเภอ", 10);
  const rows = [
    ["CID ไม่ครบ 13 หลัก", "กลับไปตรวจเลขบัตรประชาชน"],
    ["มี CID ซ้ำ", "ตรวจว่าเด็กซ้ำในไฟล์เดียวกันหรือซ้ำกับหน่วยอื่น"],
    ["รหัสหน่วยผิด", "เลือก service_unit_code ของหน่วยตนเท่านั้น"],
    ["สถานะวัคซีนไม่ตรง dropdown", "เลือกจากรายการมาตรฐาน"],
    ["ยังไม่เติม อสม./ผรส.", "เติมผู้รับผิดชอบหลักทุกแถว"],
    ["ส่งสูตรแทนค่า", "copy แล้ว paste as values ก่อนส่ง"],
  ];
  slide.addTable([["ปัญหา", "วิธีแก้"], ...rows], {
    x: 0.85,
    y: 1.82,
    w: 11.45,
    h: 4.55,
    border: { type: "solid", color: C.line, pt: 0.8 },
    fontFace: "Leelawadee UI",
    fontSize: 12.5,
    color: C.ink,
    fit: "shrink",
    margin: 0.08,
    colW: [4.1, 7.35],
  });
}

{
  const slide = sectionSlide("Checklist วันอบรม", "ใช้เช็คทีละหน่วยก่อนกลับไปทำไฟล์จริง", 11);
  const checks = [
    "เปิดไฟล์ template ของหน่วยตนได้",
    "เลือก/เห็นรหัสหน่วยบริการถูกต้อง",
    "วางข้อมูลจากไฟล์เดิมลงแท็บ ข้อมูลจากไฟล์เดิม",
    "เห็นผลใน BASELINE_TEMPLATE ครบ 17 คอลัมน์",
    "เติม อสม.หลัก และ ผรส.หลัก ได้ครบ",
    "ตรวจแท็บ รายการที่ต้องตรวจ แล้วค่าผิดพลาดเป็น 0",
  ];
  checks.forEach((text, i) => {
    const y = 1.82 + i * 0.68;
    slide.addShape(pptx.ShapeType.rect, { x: 1.0, y, w: 0.22, h: 0.22, fill: { color: C.white }, line: { color: C.green, width: 1.2 } });
    slide.addText(text, { x: 1.42, y: y - 0.05, w: 9.8, h: 0.32, fontFace: "Leelawadee UI", fontSize: 14.5, color: C.ink, margin: 0 });
  });
  addCallout(slide, "เป้าหมายหลังอบรม", "แต่ละหน่วยกลับไปเตรียมไฟล์ทะเบียนตั้งต้นของตนเองได้ โดยไม่ต้องกรอกเด็กทีละคนในระบบ", 1.0, 6.05, 10.8, 0.65);
}

{
  const slide = sectionSlide("สรุป", "ขอให้ทุกหน่วยยึด header กลางและตรวจข้อมูลก่อนส่ง", 12);
  slide.addText("ไฟล์เดิมยังมีประโยชน์มาก", { x: 1.0, y: 1.9, w: 8.4, h: 0.45, fontFace: "Leelawadee UI", fontSize: 24, bold: true, color: C.ink, margin: 0 });
  slide.addText("เราใช้ข้อมูลเดิมเป็นฐาน แล้วเติมข้อมูลที่ระบบต้องใช้เพิ่ม เพื่อให้ทั้งอำเภอมีทะเบียนตั้งต้นที่ตรวจสอบได้", { x: 1.0, y: 2.65, w: 9.9, h: 0.7, fontFace: "Leelawadee UI", fontSize: 16, color: C.gray, fit: "shrink", margin: 0 });
  addCallout(slide, "จำให้ขึ้นใจ", "CID ถูกต้อง, หน่วยบริการถูกต้อง, สถานะวัคซีนมาตรฐาน, อสม./ผรส.ครบ", 1.0, 4.25, 10.9, 1.0, C.green);
  slide.addText("ขั้นต่อไป: หน่วยบริการเตรียมไฟล์ -> อำเภอตรวจ stage -> อำเภอ approve -> หน่วย confirm", { x: 1.0, y: 5.75, w: 10.9, h: 0.35, fontFace: "Leelawadee UI", fontSize: 14.5, bold: true, color: C.green2, margin: 0 });
}

for (let i = 1; i < pptx._slides.length; i += 1) {
  // Footer already added by sectionSlide; the cover intentionally has a different treatment.
}

pptx.writeFile({ fileName: outPath });
