import React, { useMemo, useState } from 'react';
import {
  GAS_WEB_APP_URL,
  adminLogin,
  generateUnitCodeGsTemplate,
  generateUnitToken,
  getSettings,
  saveSettings,
  testUnitConnection,
} from '@/services/gasApi';
import type { ServiceUnitSettingView } from '@/types/vaccine';

interface GeneratedScript {
  serviceUnitCode: string;
  serviceUnitName: string;
  token: string;
  code: string;
}

const SettingsPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [settings, setSettings] = useState<ServiceUnitSettingView[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);

  const configuredApi = useMemo(() => !GAS_WEB_APP_URL.includes('YOUR_GAS_WEB_APP_URL'), []);

  const login = async () => {
    setError('');
    setNotice('');
    try {
      const session = await adminLogin(password);
      setSessionToken(session.sessionToken);
      setSettings(await getSettings(session.sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  const updateSetting = (serviceUnitCode: string, patch: Partial<ServiceUnitSettingView>) => {
    setSettings((current) =>
      current.map((unit) => (unit.serviceUnitCode === serviceUnitCode ? { ...unit, ...patch } : unit)),
    );
  };

  const saveAll = async () => {
    setError('');
    setNotice('');
    try {
      await saveSettings(sessionToken, settings);
      setNotice('บันทึกการตั้งค่าแล้ว');
      setSettings(await getSettings(sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  };

  const testConnection = async (unit: ServiceUnitSettingView) => {
    setBusyCode(unit.serviceUnitCode);
    setError('');
    setNotice('');
    try {
      const result = await testUnitConnection(sessionToken, unit.serviceUnitCode);
      updateSetting(unit.serviceUnitCode, { lastError: result.ok ? '' : result.message });
      setNotice(`${unit.serviceUnitCode}: ${result.message}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ทดสอบการเชื่อมต่อไม่สำเร็จ');
    } finally {
      setBusyCode(null);
    }
  };

  const generateScript = async (unit: ServiceUnitSettingView) => {
    if (!configuredApi) {
      setError('ยังไม่ได้ตั้งค่า VITE_GAS_WEB_APP_URL');
      return;
    }
    setBusyCode(unit.serviceUnitCode);
    setError('');
    setNotice('');
    try {
      const tokenResult = await generateUnitToken(sessionToken, unit.serviceUnitCode);
      updateSetting(unit.serviceUnitCode, { tokenStatus: tokenResult.tokenStatus });
      const code = generateUnitCodeGsTemplate({
        centralApiUrl: GAS_WEB_APP_URL,
        serviceUnitCode: unit.serviceUnitCode,
        serviceUnitName: unit.serviceUnitName,
        sheetName: unit.sheetName,
        token: tokenResult.token,
      });
      setGeneratedScript({
        serviceUnitCode: unit.serviceUnitCode,
        serviceUnitName: unit.serviceUnitName,
        token: tokenResult.token,
        code,
      });
      setNotice(`สร้าง token และ Code.gs สำหรับ ${unit.serviceUnitCode} แล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้าง token ไม่สำเร็จ');
    } finally {
      setBusyCode(null);
    }
  };

  const copyGeneratedCode = async () => {
    if (!generatedScript) return;
    await navigator.clipboard.writeText(generatedScript.code);
    setNotice('คัดลอก Code.gs แล้ว');
  };

  const downloadGeneratedCode = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Code_${generatedScript.serviceUnitCode}.gs`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!sessionToken) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] px-4 py-16 text-[#1a1c1a]">
        <section className="mx-auto max-w-md rounded-lg border border-[#d9dad7] bg-white p-6 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
          <h1 className="text-2xl font-extrabold text-[#002b1a]">ตั้งค่าระบบ</h1>
          <p className="mt-2 text-sm text-[#414943]">สำหรับผู้ดูแลระบบอำเภอเท่านั้น</p>
          <label className="mt-6 block text-sm font-bold text-[#002b1a]">
            รหัสผ่านผู้ดูแล
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void login();
              }}
              type="password"
              className="mt-2 w-full rounded-md border border-[#c8ccc6] px-3 py-2 text-sm outline-none focus:border-[#14422d]"
            />
          </label>
          {error && <p className="mt-3 text-sm font-semibold text-[#9b4145]">{error}</p>}
          <button onClick={login} className="mt-6 w-full rounded-md bg-[#14422d] px-4 py-2 text-sm font-bold text-white">
            เข้าสู่หน้าตั้งค่า
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-4 py-8 text-[#1a1c1a]">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-[#d9dad7] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#002b1a]">ตั้งค่าการเชื่อมต่อ 14 หน่วยบริการ</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#414943]">
              แก้ Spreadsheet ID, ชื่อชีต, สถานะใช้งาน, ทดสอบการเชื่อมต่อ และสร้าง Code.gs สำหรับติดตั้งใน Google Sheet ของแต่ละหน่วยบริการ
            </p>
          </div>
          <button onClick={saveAll} className="rounded-md bg-[#14422d] px-5 py-2 text-sm font-bold text-white">
            บันทึกทั้งหมด
          </button>
        </div>

        {!configuredApi && (
          <div className="mt-4 rounded-md border border-[#f0c36d] bg-[#fff8e8] p-3 text-sm font-semibold text-[#6b4b00]">
            ยังไม่ได้ตั้งค่า VITE_GAS_WEB_APP_URL จึงยังสร้าง Code.gs สำหรับ production ไม่ได้
          </div>
        )}
        {notice && <p className="mt-4 rounded-md border border-[#bceecf] bg-[#edf8f0] p-3 text-sm font-semibold text-[#224f39]">{notice}</p>}
        {error && <p className="mt-4 rounded-md border border-[#f4b4b4] bg-[#fff1f1] p-3 text-sm font-semibold text-[#9b4145]">{error}</p>}

        <div className="mt-6 overflow-x-auto rounded-lg border border-[#d9dad7] bg-white">
          <table className="min-w-[1180px] w-full text-sm">
            <thead className="bg-[#edeeea] text-left text-[#002b1a]">
              <tr>
                <th className="px-3 py-3">เปิด</th>
                <th className="px-3 py-3">รหัส</th>
                <th className="px-3 py-3">หน่วยบริการ</th>
                <th className="px-3 py-3">Spreadsheet ID</th>
                <th className="px-3 py-3">Sheet</th>
                <th className="px-3 py-3">Token</th>
                <th className="px-3 py-3">ส่งล่าสุด</th>
                <th className="px-3 py-3">คำสั่ง</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((unit) => (
                <tr key={unit.serviceUnitCode} className="border-t border-[#d9dad7] align-top">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={unit.enabled}
                      onChange={(event) => updateSetting(unit.serviceUnitCode, { enabled: event.target.checked })}
                      className="h-4 w-4 accent-[#14422d]"
                      aria-label={`เปิดใช้งาน ${unit.serviceUnitCode}`}
                    />
                  </td>
                  <td className="px-3 py-3 font-mono font-bold">{unit.serviceUnitCode}</td>
                  <td className="px-3 py-3 font-semibold">{unit.serviceUnitName}</td>
                  <td className="px-3 py-3">
                    <input
                      value={unit.spreadsheetId}
                      onChange={(event) => updateSetting(unit.serviceUnitCode, { spreadsheetId: event.target.value.trim() })}
                      className="w-72 rounded-md border border-[#c8ccc6] px-2 py-1.5 font-mono text-xs outline-none focus:border-[#14422d]"
                      placeholder="Google Spreadsheet ID"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      value={unit.sheetName}
                      onChange={(event) => updateSetting(unit.serviceUnitCode, { sheetName: event.target.value })}
                      className="w-40 rounded-md border border-[#c8ccc6] px-2 py-1.5 text-xs outline-none focus:border-[#14422d]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-[#edeeea] px-2 py-1 text-xs font-bold text-[#414943]">{unit.tokenStatus}</span>
                    {unit.lastError && <p className="mt-2 max-w-44 text-xs text-[#9b4145]">{unit.lastError}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-[#414943]">{unit.lastSubmittedAt || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void testConnection(unit)}
                        disabled={busyCode === unit.serviceUnitCode}
                        className="rounded-md border border-[#14422d] px-3 py-1.5 text-xs font-bold text-[#14422d] disabled:opacity-50"
                      >
                        ทดสอบ
                      </button>
                      <button
                        onClick={() => void generateScript(unit)}
                        disabled={busyCode === unit.serviceUnitCode}
                        className="rounded-md bg-[#9b4145] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        สร้าง Code.gs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {generatedScript && (
          <section className="mt-6 rounded-lg border border-[#d9dad7] bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-[#002b1a]">
                  Code.gs สำหรับ {generatedScript.serviceUnitCode}
                </h2>
                <p className="mt-1 text-sm text-[#414943]">
                  Token จะแสดงครั้งนี้เท่านั้น ให้นำโค้ดนี้ไปวางใน Apps Script ของ Google Sheet หน่วยบริการ
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void copyGeneratedCode()} className="rounded-md border border-[#14422d] px-4 py-2 text-sm font-bold text-[#14422d]">
                  คัดลอก
                </button>
                <button onClick={downloadGeneratedCode} className="rounded-md bg-[#14422d] px-4 py-2 text-sm font-bold text-white">
                  ดาวน์โหลด
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={generatedScript.code}
              className="mt-4 h-96 w-full rounded-md border border-[#c8ccc6] bg-[#101512] p-4 font-mono text-xs text-[#e6f2ea]"
            />
          </section>
        )}
      </section>
    </main>
  );
};

export default SettingsPage;
