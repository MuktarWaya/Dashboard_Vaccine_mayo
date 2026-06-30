import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarClock,
  FileText,
  HelpCircle,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Siren,
  Stethoscope,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useVaccineData } from '@/services/gasApi';
import { buildDashboardViewModel } from '@/services/dashboardViewModel';
import type { PublicDashboardData } from '@/types/vaccine';

const PublicDashboard: React.FC = () => {
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'progress' | 'quality' | 'reports'>('progress');
  const [error, setError] = useState<string | null>(null);
  const { getPublicDashboard } = useVaccineData(false);
  const viewModel = useMemo(() => buildDashboardViewModel(data), [data]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicDashboard();
      setData(result);
    } catch (err) {
      setError('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const lastUpdated = data?.lastUpdatedAt
    ? new Date(data.lastUpdatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

  return (
    <div className="min-h-screen bg-[#f9faf6] text-[#1a1c1a]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-[#002b1a] focus:px-4 focus:py-2 focus:text-white"
      >
        ข้ามไปที่เนื้อหาหลัก
      </a>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#d9dad7] bg-[#f9faf6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-[#9b4145]" />
            <div>
              <h1 className="text-lg font-extrabold leading-5 text-[#002b1a]">Mayo District</h1>
              <p className="text-xs font-medium text-[#717973]">Vaccine Dashboard</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <button onClick={() => setActiveTab('progress')} className={navClass(activeTab === 'progress')}>
              ความก้าวหน้าวัคซีน
            </button>
            <button onClick={() => setActiveTab('quality')} className={navClass(activeTab === 'quality')}>
              ติดตามคุณภาพข้อมูล
            </button>
            <a href="#facilities" className="text-sm font-semibold text-[#414943] transition-colors hover:text-[#002b1a]">
              หน่วยบริการ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs font-medium text-[#717973] sm:flex">
              <span className={clsx('h-2 w-2 rounded-full', error ? 'bg-[#ba1a1a]' : 'bg-[#3E7B5A]')} />
              <span>อัปเดต {lastUpdated}</span>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-[#9b4145] px-3 py-2 text-sm font-semibold text-[#9b4145] transition-colors hover:bg-[#9b4145] hover:text-white">
              <LogIn className="h-4 w-4" />
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </nav>

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Stethoscope className="h-8 w-8 text-[#14422d]" />
              <h2 className="text-2xl font-extrabold leading-tight text-[#002b1a] md:text-3xl">
                ภาพรวมความครอบคลุมวัคซีน
              </h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-[#414943] md:text-base">
              ติดตามความก้าวหน้าวัคซีนเด็กและความพร้อมของข้อมูลรายหน่วยบริการสุขภาพ อำเภอมายอ
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#bceecf] bg-[#edf8f0] px-3 py-2 text-sm font-bold text-[#224f39]">
            <span className="h-2 w-2 rounded-full bg-[#3E7B5A]" />
            แสดงเฉพาะข้อมูลสถิติรวม
          </div>
        </header>

        <div className="mb-8 flex overflow-x-auto border-b border-[#d9dad7]" role="tablist">
          <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>
            ความก้าวหน้าวัคซีน
          </TabButton>
          <TabButton active={activeTab === 'quality'} onClick={() => setActiveTab('quality')}>
            ติดตามคุณภาพข้อมูล
          </TabButton>
          <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>
            รายงาน
          </TabButton>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                icon={<Activity className="h-6 w-6" />}
                label="เป้าหมายรวมอำเภอ"
                value={viewModel.districtCoverageLabel}
                footnote={viewModel.progressReady ? 'ข้อมูลรวมจากหน่วยบริการที่รายงาน' : 'ยังไม่แสดงตัวเลขจนกว่าข้อมูลพร้อม'}
                loading={loading}
                accent
              />
              <MetricCard
                icon={<Building2 className="h-6 w-6" />}
                label="หน่วยบริการที่รายงาน"
                value={viewModel.reportedUnitsLabel}
                footnote="หน่วยบริการสุขภาพทั้งหมด 14 แห่ง"
                loading={loading}
              />
              <MetricCard
                icon={<Users className="h-6 w-6" />}
                label="เด็กในทะเบียนรวม"
                value={viewModel.totalChildrenLabel}
                footnote={viewModel.progressReady ? 'รวมเฉพาะข้อมูลสถิติระดับหน่วยบริการ' : 'รอข้อมูลรายเดือนที่ผ่านการตรวจสอบ'}
                loading={loading}
              />
            </div>

            <section id="facilities" className="overflow-hidden rounded-xl border border-[#d9dad7] bg-white/85 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
              <div className="flex flex-col gap-3 border-b border-[#d9dad7] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-[#14422d]" />
                  <h3 className="text-lg font-extrabold text-[#002b1a]">เปรียบเทียบความครอบคลุมรายหน่วยบริการ</h3>
                </div>
                <span className="w-fit rounded-full bg-[#edeeea] px-3 py-1 text-xs font-semibold text-[#717973]">
                  เป้าหมายอำเภอแสดงเมื่อข้อมูลพร้อม
                </span>
              </div>

              <div className="space-y-4 p-5 md:p-6">
                {viewModel.progressReady && viewModel.facilityComparison.length > 0 ? (
                  viewModel.facilityComparison.map((facility, index) => (
                    <FacilityBar key={facility.name} facility={facility} highlighted={index === 0} />
                  ))
                ) : (
                  <NotReadyState
                    message={viewModel.statusMessage}
                    onRetry={fetchDashboardData}
                    loading={loading}
                  />
                )}

                <div className="flex flex-wrap gap-4 border-t border-[#d9dad7] pt-4 text-xs font-medium text-[#717973]">
                  <Legend color="#14422d" label="ตามเกณฑ์" />
                  <Legend color="#c5a059" label="ต้องติดตาม/ล่าช้า" />
                  <Legend color="#9b4145" label="ปฏิเสธหรืออื่น ๆ" />
                  <span className="ml-auto inline-flex items-center gap-2 italic">
                    <CalendarClock className="h-4 w-4" />
                    ข้อมูลจริงจากระบบรายเดือนเมื่อพร้อม
                  </span>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-[#d9dad7] bg-white/85 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
              <div className="border-b border-[#d9dad7] p-5">
                <h3 className="flex items-center gap-3 text-lg font-extrabold text-[#002b1a]">
                  <CalendarClock className="h-6 w-6" />
                  ความก้าวหน้าการฉีดวัคซีนรายเดือน
                </h3>
              </div>
              <NotReadyState message={viewModel.statusMessage} onRetry={fetchDashboardData} loading={loading} roomy />
            </section>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <section id="quality" className="rounded-xl border border-[#d9dad7] bg-white/85 p-5 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
              <h4 className="mb-4 flex items-center gap-2 text-base font-extrabold text-[#002b1a]">
                <Building2 className="h-5 w-5 text-[#c5a059]" />
                คุณภาพข้อมูลหน่วยบริการ
              </h4>
              <div className="space-y-4">
                <QualityLine label="ส่งข้อมูลแล้ว" value={viewModel.reportedUnitsLabel} />
                <QualityLine label="ส่งข้อมูลครบ" value={`${viewModel.completedUnitsLabel} หน่วย`} />
                <QualityLine label="ต้องติดตาม" value={`${viewModel.followUpUnitsLabel} หน่วย`} />
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-[#c0c9c1] bg-[#edeeea] p-3 text-center">
                <p className="text-xs font-medium text-[#717973]">ข้อมูลฉบับเต็มของหน่วยบริการจะแสดงหลังการตรวจสอบเสร็จสิ้น</p>
              </div>
            </section>

            <section className="rounded-xl border border-[#f4b4b4] bg-[#fff1f1] p-4">
              <div className="flex gap-3">
                <Siren className="h-6 w-6 shrink-0 text-[#9b4145]" />
                <div>
                  <h5 className="mb-1 text-sm font-extrabold text-[#7d2a2f]">ประกาศความปลอดภัยข้อมูล</h5>
                  <p className="text-xs leading-6 text-[#7d2a2f]">
                    หน้าจอนี้แสดงเฉพาะข้อมูลสถิติรวม ไม่แสดงชื่อเด็ก เลขประจำตัว ที่อยู่ รายชื่อผู้ปฏิบัติงาน หรือข้อมูลระดับรายการ
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#d9dad7] bg-white/85 p-5 shadow-[0_2px_8px_rgba(0,43,26,0.06)]">
              <h4 className="mb-4 flex items-center gap-2 text-base font-extrabold text-[#002b1a]">
                <HelpCircle className="h-5 w-5" />
                เชื่อมโยงด่วน
              </h4>
              <div className="space-y-2">
                <QuickLink icon={<FileText className="h-5 w-5" />} label="รายงานสำหรับเจ้าหน้าที่" />
                <QuickLink icon={<ShieldCheck className="h-5 w-5" />} label="เข้าสู่ระบบงานภายใน" />
                <QuickLink icon={<HelpCircle className="h-5 w-5" />} label="คู่มือการใช้งาน" />
              </div>
            </section>
          </aside>
        </div>
      </main>

      <footer className="border-t border-[#d9dad7] bg-[#f9faf6] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-[#717973] sm:px-6 md:flex-row lg:px-8">
          <p>© 2569 Dashboard Vaccine อำเภอมายอ แสดงเฉพาะข้อมูลสถิติรวม</p>
          <p>ข้อมูลปฏิบัติการและข้อมูลส่วนบุคคลอยู่หลังระบบยืนยันตัวตน</p>
        </div>
      </footer>
    </div>
  );
};

function navClass(active: boolean) {
  return clsx(
    'border-b-2 pb-1 text-sm transition-colors',
    active ? 'border-[#9b4145] font-extrabold text-[#9b4145]' : 'border-transparent font-semibold text-[#414943] hover:text-[#002b1a]'
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap border-b-[3px] px-6 py-3 text-sm transition-colors',
        active ? 'border-[#9b4145] font-extrabold text-[#9b4145]' : 'border-transparent font-semibold text-[#717973] hover:text-[#002b1a]'
      )}
    >
      {children}
    </button>
  );
}

function MetricCard({
  icon,
  label,
  value,
  footnote,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  footnote: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <article className="rounded-xl border border-white/70 bg-white/85 p-5 shadow-[0_2px_8px_rgba(0,43,26,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,43,26,0.12)]">
      <div className="mb-3 flex items-center justify-between">
        <div className={accent ? 'text-[#c5a059]' : 'text-[#9b4145]'}>{icon}</div>
        <span className="rounded-full bg-[#edeeea] px-2 py-1 text-xs font-semibold text-[#717973]">Aggregate</span>
      </div>
      <p className="mb-1 text-sm font-medium text-[#717973]">{label}</p>
      <p className="min-h-10 text-3xl font-extrabold text-[#002b1a] md:text-4xl">
        {loading ? '...' : value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[#414943]">{footnote}</p>
    </article>
  );
}

function FacilityBar({ facility, highlighted }: { facility: { name: string; coverage: number; onSchedulePercent: number; followUpPercent: number; refusedPercent: number }; highlighted: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr_52px] items-center gap-3 md:grid-cols-[180px_1fr_60px]">
      <span className={clsx('truncate text-sm', highlighted ? 'font-extrabold text-[#002b1a]' : 'font-semibold text-[#414943]')}>
        {facility.name}
      </span>
      <div className="flex h-6 overflow-hidden rounded-full bg-[#edeeea]">
        <div className="h-full bg-[#14422d]" style={{ width: `${facility.onSchedulePercent}%` }} />
        <div className="h-full bg-[#c5a059]" style={{ width: `${facility.followUpPercent}%` }} />
        <div className="h-full bg-[#9b4145]" style={{ width: `${facility.refusedPercent}%` }} />
      </div>
      <span className="text-right text-sm font-extrabold text-[#414943]">{facility.coverage.toFixed(1)}%</span>
    </div>
  );
}

function NotReadyState({ message, onRetry, loading, roomy = false }: { message: string; onRetry: () => void; loading: boolean; roomy?: boolean }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center', roomy ? 'p-12' : 'rounded-lg border border-dashed border-[#c0c9c1] bg-[#f9faf6] p-8')}>
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#c0c9c1] bg-[#edeeea]">
        <CalendarClock className="h-10 w-10 text-[#717973]" />
      </div>
      <h4 className="mb-2 text-xl font-extrabold text-[#002b1a]">กำลังเตรียมข้อมูลรายเดือน</h4>
      <p className="max-w-md text-sm leading-6 text-[#414943]">
        {message} ระบบจะแสดงตัวเลขความก้าวหน้าหลังข้อมูลผ่านการตรวจสอบและพร้อมเผยแพร่เป็นข้อมูลสถิติรวม
      </p>
      <button
        onClick={onRetry}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#edeeea] px-5 py-2.5 text-sm font-bold text-[#002b1a] transition-colors hover:bg-[#e2e3df] disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function QualityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-4 text-sm">
        <span className="font-medium text-[#414943]">{label}</span>
        <span className="font-extrabold text-[#002b1a]">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#edeeea]">
        <div className="h-full w-2/3 rounded-full bg-[#14422d]" />
      </div>
    </div>
  );
}

function QuickLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <a href="#" className="flex items-center gap-3 rounded-lg p-3 text-sm font-bold text-[#002b1a] transition-colors hover:bg-[#edeeea]">
      <span className="text-[#c5a059]">{icon}</span>
      {label}
    </a>
  );
}

export default PublicDashboard;
