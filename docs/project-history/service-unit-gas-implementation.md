# Service Unit GAS API Implementation - Project History

> **บันทึกนี้สำคัญมากสำหรับ Codex session ถัดไปที่จะมาทำงานต่อ**
>
> อ่านทั้งหมดก่อนเริ่มทำงานใดๆ ในโปรเจคนี้

---

## บริบทโปรเจค (Context)

**โปรเจค:** Dashboard Vaccine Mayo
**เจ้าของ:** ทีมสุขศาสตร์ อำเภอมายอ
**วัตถุประสงค์:** สร้างระบบรับข้อมูลวัคซีนรายเดือนแบบ aggregate จาก 14 หน่วยบริการ (รพ.สต. + PCU) เข้าสู่ Central Dashboard

### ปัญหาเดิม
- Frontend ต้องไล่อ่าน 14 Google Sheets โดยตรง → ช้า, timeout บ่อย
- ไม่มีระบบ settings สำหรับ admin ควบคุมการเชื่อมต่อ
- แต่ละหน่วยบริการไม่มีวิธีส่งข้อมูลเข้าระบบกลาง

### สถาปัตยกรรมใหม่
```
14 หน่วยบริการ (แต่ละหน่วยมี Google Sheets + Code.gs)
        ↓
    ส่ง aggregate payload (POST submitUnitMonthly)
        ↓
Central GAS API (main.ts)
        ↓
บันทึกลง MONTHLY_UNIT_AGGREGATES sheet
        ↓
Frontend อ่านจาก central aggregates (GET publicDashboard)
```

---

## ประวัติการทำงาน Session ก่อนหน้า (Codex คนแรก)

**วันที่:** 30 มิ.ย. 2026 (ประมาณ 6:11 PM - 11:09 PM)
**สถานะสุดท้าย:** Task 1-5 เสร็จ, Task 6 อยู่ระหว่างดำเนินการ

### Tasks ที่ Codex คนแรกทำ:

#### ✅ Task 1: Canonical 14 Service Units (51305a0)
- สร้าง `src/domain/serviceUnitSettings.ts` พร้อม `CANONICAL_SERVICE_UNITS` 14 แห่ง
- ปรับ `src/config/serviceUnits.ts` ให้ใช้ canonical list
- เพิ่ม test `tests/domain/serviceUnitSettings.test.ts`

#### ✅ Task 2: Aggregate Payload Validation (53b2e77 + fixes)
- สร้าง `src/domain/unitAggregate.ts`:
  - `validateUnitAggregateSubmission()` - validate payload
  - `upsertMonthlyAggregate()` - upsert logic
  - `buildPublicDashboardFromAggregates()` - build public model
  - `publicAggregateContainsForbiddenKeys()` - privacy check
- เพิ่ม test `tests/domain/unitAggregate.test.ts`
- **Fix commits:** 6c01322 (forbidden keys), 3303568 (test coverage), 6c3904a (sanitize)

#### ✅ Task 3: Central Sheets Repository (a8a8e85 + fix)
- สร้าง `src/infrastructure/sheetsServiceUnitSettingsRepository.ts`:
  - `CONFIG_HEADERS`, `AGGREGATE_HEADERS` mapping
  - `configToRow()`, `rowToConfig()` converters
  - `aggregateToRow()`, `rowToAggregate()` converters
  - `SheetsServiceUnitSettingsRepository.provision()`
- เพิ่ม test `tests/infrastructure/sheetsServiceUnitSettingsRepository.test.ts`
- **Fix:** 275f1c5 (trim enabled value, exact header tests)

#### ✅ Task 4: Admin Password/Session Domain (a8865cb)
- เพิ่มใน `src/domain/serviceUnitSettings.ts`:
  - `DEFAULT_ADMIN_PASSWORD = "009941"`
  - `ADMIN_PASSWORD_PROPERTY = "DASHBOARD_ADMIN_PASSWORD"`
  - `verifyAdminPassword()`, `createAdminSession()`

#### ✅ Task 5: Central GAS API Actions (4f91cc7)
- ปรับ `src/main.ts`:
  - `routeDashboardApiAction()` - router
  - `doGet()` - JSON output เมื่อ format=json
  - `doPost()` - POST dispatch
  - `adminLogin()`, `getSettings()`, `saveSettings()`, `testUnitConnection()`, `submitUnitMonthly()`
- เพิ่ม repository methods: `listSettings()`, `saveSettings()`, `listMonthlyAggregates()`, `saveMonthlyAggregates()`, `appendIngestionLog()`
- เพิ่ม test `tests/app/serviceUnitApi.test.ts`

#### ⏸️ Task 6: Unit Code.gs Generator (ค้าง)
- สร้าง `src/templates/unitCodeGsTemplate.ts` แล้ว
- Test pass แต่ยังไม่ commit/push
- **ปัญหาที่พบ:** ไดรฟ์ G: หายไปชั่วคราว → ต้องหยุดทำงาน

---

## ประวัติการทำงาน Session นี้ (Codex คนที่ 2)

**วันที่:** 1 ก.ค. 2026 (ต่อจาก session ก่อน)
**เริ่มต้น:** Task 6 ยังไม่ commit อยู่

### สิ่งที่ทำต่อ:

#### ✅ Task 6: Generate Unit Code.gs Template (2183546)
- ตรวจสอบ `src/templates/unitCodeGsTemplate.ts` ที่ Codex คนแรกสร้างไว้
- Template ถูกต้อง:
  - มี unit config (code, name, sheet, token) ครบ
  - **ไม่มี child-level fields** (cid, ชื่อเด็ก) หลุด ← privacy check ผ่าน
- Test: `tests/domain/unitCodeGsTemplate.test.ts` pass
- **Commit:** 2183546
- **Push:** สำเร็จ

#### ✅ Task 7: Frontend Settings API Client (02db64e)
- ปรับ `frontend/src/types/vaccine.ts`:
  - เพิ่ม `ServiceUnitSettingView`, `AdminLoginResponse`
- ปรับ `frontend/src/services/gasApi.ts`:
  - เพิ่ม `postGAS()` - POST helper
  - เพิ่ม `buildSettingsPayload()` - payload builder
  - เพิ่ม `adminLogin()`, `getSettings()`, `saveSettings()`, `testUnitConnection()`
- สร้าง test: `tests/frontend/settingsApiTypes.test.ts`
- **Commit:** 02db64e
- **Push:** สำเร็จ

#### ✅ Task 8: React Settings Page (7c8a1f0)
- สร้าง `frontend/src/components/settings/SettingsPage.tsx`:
  - Login form (password 009941)
  - Settings table (แสดง 14 หน่วยบริการ)
  - Token status, last submitted, last error columns
- ปรับ `frontend/src/App.tsx`:
  - เพิ่ม route `/settings`
- Frontend build: สำเร็จ
- **Commit:** 7c8a1f0
- **Push:** สำเร็จ

#### ✅ Task 9: Public Dashboard Reads Central Aggregates (96e6879)
- ปรับ `frontend/src/services/gasApi.ts`:
  - `fetchPublicDashboard()` → ใช้ `action='publicDashboard'` (เปลี่ยนจาก `'fetch'`)
- ตรวจ `src/main.ts`: ใช้ `buildPublicDashboardFromAggregates()` อยู่แล้ว ✓
- **Commit:** 96e6879
- **Push:** สำเร็จ

#### ✅ Task 10: Runbook and Final Verification (b5b0c44)
- สร้าง `docs/runbooks/service-unit-gas-setup.md`
- ปรับ `README.md`: เพิ่ม link ไป runbook
- **Final Verification:**
  - Tests: 74/74 pass
  - Frontend build: สำเร็จ
- **Commit:** b5b0c44
- **Push:** สำเร็จ

---

## Commit History ทั้งหมด

```
b5b0c44 docs: add service unit gas setup runbook                    # Task 10
96e6879 feat: read dashboard from central aggregates               # Task 9
7c8a1f0 feat: add protected settings page                           # Task 8
02db64e feat: add frontend settings api client                      # Task 7
2183546 feat: generate unit bound gas template                      # Task 6
4f91cc7 feat: add central service unit gas api                       # Task 5
a8865cb feat: add admin settings session domain                     # Task 4
275f1c5 fix: harden service unit sheets contract                    # Task 3 fix
a8a8e85 feat: map service unit settings sheets                      # Task 3
6c3904a fix: sanitize aggregate submissions                         # Task 2 fix
3303568 test: cover aggregate domain edge cases                     # Task 2 fix
6c01322 fix: enforce aggregate forbidden key checks                 # Task 2 fix
53b2e77 feat: validate unit aggregate submissions                    # Task 2
51305a0 feat: define canonical service units                         # Task 1
6fd7896 docs: plan service unit gas api settings                    # Plan
```

---

## สถานะปัจจุบัน (Current State)

### ✅ เสร็จสมบูรณ์
- Backend domain/repository/API: 100%
- Frontend API client/Settings page: 100%
- Documentation: 100%
- Tests: 74/74 passing
- GitHub: synced (main == origin/main)

### 📁 ไฟล์สำคัญที่สร้าง/ปรับ

#### Backend (src/)
```
src/
├── domain/
│   ├── serviceUnitSettings.ts     # 14 หน่วยบริการ + password/session
│   └── unitAggregate.ts            # aggregate validation + public model
├── infrastructure/
│   └── sheetsServiceUnitSettingsRepository.ts  # Google Sheets adapter
├── templates/
│   └── unitCodeGsTemplate.ts       # Code.gs generator สำหรับแต่ละหน่วย
└── main.ts                          # Central GAS API routing/actions
```

#### Frontend (frontend/)
```
frontend/src/
├── components/settings/
│   └── SettingsPage.tsx            # /settings page
├── services/
│   └── gasApi.ts                    # API client (POST helper + settings functions)
└── types/
    └── vaccine.ts                   # ServiceUnitSettingView + AdminLoginResponse
```

#### Tests
```
tests/
├── domain/
│   ├── serviceUnitSettings.test.ts
│   ├── unitAggregate.test.ts
│   └── unitCodeGsTemplate.test.ts
├── infrastructure/
│   └── sheetsServiceUnitSettingsRepository.test.ts
├── app/
│   └── serviceUnitApi.test.ts
└── frontend/
    ├── settingsApiTypes.test.ts
    └── dashboardViewModel.test.ts
```

#### Documentation
```
docs/
├── superpowers/plans/
│   └── 2026-06-30-service-unit-gas-api-settings.md
└── runbooks/
    └── service-unit-gas-setup.md
```

---

## ข้อสังเกตสำคัญสำหรับ Codex คนถัดไป

### 🔴 Privacy Rules (ห้ามทำผิด)
1. **ห้ามส่ง child-level data** ไปยัง public dashboard:
   - ห้ามส่ง: `cid`, `ชื่อเด็ก`, `address`, `worker`, `notes`, `raw`, `record_json`
   - ตรวจสอบด้วย: `publicAggregateContainsForbiddenKeys()` ใน `unitAggregate.ts`

2. **ห้าม hard-code password** นอก domain constant:
   - Password ต้องอยู่ใน `DEFAULT_ADMIN_PASSWORD` เท่านั้น
   - ห้ามใส่ใน URL params หรือ logs

### 🟡 Workflow Rules
1. **Subagent-Driven Development** (ถ้าใช้):
   - ทีละ task, มี spec review → quality review → commit
   - อย่า commit ถ้า review ไม่ผ่าน

2. **Two-Laptop Workflow**:
   - เช็ค `git status --short --branch` ก่อนทำอะไร
   - ถ้าเจอ `main...origin/main` → ใช่, ตรงกัน
   - ถ้าเจอ `main...origin/main [ahead]` → ยังไม่ push

3. **TDD**:
   - Red (test fail) → Green (implementation) → Refactor → Commit

### 🟢 Testing Commands
```bash
# Run all tests
npx vitest run

# Run specific test
npx vitest run tests/domain/unitAggregate.test.ts

# Frontend build
cd frontend && npm run build

# Full verification
npm test && cd frontend && npm run build
```

### 🟢 Git Commands
```bash
# Check status
git status --short --branch

# Recent commits
git log --oneline -10

# Check what will be pushed
git diff --cached --stat

# Safe commit (ไม่ใช้ -A)
git add <specific-files>
git commit -m "type: message"
```

---

## สิ่งที่อาจต้องทำต่อ (Possible Next Steps)

นี่คือสิ่งที่ยังไม่ได้ทำ (out of scope ของ plan นี้):

1. **OAuth Admin Roles** - ปัจจุบันใช้ password 009941 แบบ server-side
2. **Child-level Drilldown** - ปัจจุบันมีเฉพาะ aggregate data
3. **Settings Page Enhancement**:
   - Edit spreadsheet ID / sheet name ใน table
   - Generate Code.gs button
   - Test connection per unit
4. **Unit Code.gs Installation Script** - automate การติดตั้งให้ 14 หน่วย
5. **Ingestion Error Handling** - retry logic, error notification
6. **Monthly Report Email** - สรุปสถิติรายเดือนส่ง email

---

## Emergency Recovery (ถ้าพัง)

ถ้า git พังหรือติด lock:

```bash
# เช็คว่ามี lock ไหม
ls -f .git/*.lock

# เช็คว่ามี git process ทำงานอยู่ไหม (Windows)
tasklist | grep -i git

# ถ้าไม่มี process แต่มี lock → ลบ lock
rm .git/packed-refs.lock
```

ถ้าไดรฟ์ G: หาย:
- เปิด Google Drive ให้เจอไดรฟ์อีกครั้ง
- เช็ค `git status` ว่า working tree ยังอยู่
- ถ้า commit แล้วยังไม่ push → push ซ้ำ

---

**อัปเดตล่าสุด:** 1 ก.ค. 2026
**โดย:** Codex session ที่ 2 (ต่อจาก session แรก)
**สถานะ:** 10/10 tasks complete, ready for production use
