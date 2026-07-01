import React, { useState } from 'react';
import { adminLogin, getSettings } from '@/services/gasApi';
import type { ServiceUnitSettingView } from '@/types/vaccine';

const SettingsPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [settings, setSettings] = useState<ServiceUnitSettingView[]>([]);
  const [error, setError] = useState('');

  const login = async () => {
    setError('');
    try {
      const session = await adminLogin(password);
      setSessionToken(session.sessionToken);
      setSettings(await getSettings(session.sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  if (!sessionToken) {
    return (
      <main className="min-h-screen bg-[#f9faf6] px-4 py-16 text-[#1a1c1a]">
        <section className="mx-auto max-w-md rounded-xl border border-[#d9dad7] bg-white p-6 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
          <h1 className="text-2xl font-extrabold text-[#002b1a]">ตั้งค่าระบบ</h1>
          <p className="mt-2 text-sm text-[#414943]">สำหรับผู้ดูแลระบบอำเภอเท่านั้น</p>
          <label className="mt-6 block text-sm font-bold text-[#002b1a]">
            รหัสผ่านผู้ดูแล
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-lg border border-[#d9dad7] px-3 py-2"
            />
          </label>
          {error && <p className="mt-3 text-sm font-semibold text-[#9b4145]">{error}</p>}
          <button onClick={login} className="mt-6 w-full rounded-lg bg-[#14422d] px-4 py-2 font-bold text-white">
            เข้าสู่หน้าตั้งค่า
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9faf6] px-4 py-10 text-[#1a1c1a]">
      <section className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-extrabold text-[#002b1a]">ตั้งค่าการเชื่อมต่อ 14 หน่วยบริการ</h1>
        <div className="mt-6 overflow-hidden rounded-xl border border-[#d9dad7] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#edeeea] text-left">
              <tr>
                <th className="px-4 py-3">รหัส</th>
                <th className="px-4 py-3">หน่วยบริการ</th>
                <th className="px-4 py-3">Spreadsheet ID</th>
                <th className="px-4 py-3">Sheet</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">ส่งล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((unit) => (
                <tr key={unit.serviceUnitCode} className="border-t border-[#d9dad7]">
                  <td className="px-4 py-3 font-mono">{unit.serviceUnitCode}</td>
                  <td className="px-4 py-3 font-semibold">{unit.serviceUnitName}</td>
                  <td className="px-4 py-3">{unit.spreadsheetId || '-'}</td>
                  <td className="px-4 py-3">{unit.sheetName}</td>
                  <td className="px-4 py-3">{unit.tokenStatus}</td>
                  <td className="px-4 py-3">{unit.lastSubmittedAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default SettingsPage;
