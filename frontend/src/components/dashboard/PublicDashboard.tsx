import React, { useState, useEffect } from 'react';
import { Users, Activity, AlertTriangle, Clock, RefreshCw, Check } from 'lucide-react';
import { clsx } from 'clsx';
import KPICard from '../ui/KPICard';
import ServiceUnitTable from './ServiceUnitTable';
import { VaccineProgressChart } from './ProgressChart';
import { useVaccineData } from '@/services/gasApi';
import type { PublicDashboardData } from '@/types/vaccine';

const PublicDashboard: React.FC = () => {
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'progress' | 'quality'>('progress');
  const [error, setError] = useState<string | null>(null);
  const { getPublicDashboard } = useVaccineData(true);

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center p-4">
        <div className="card-elevated p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-status-error mx-auto mb-4" />
          <h2 className="headline-lg text-surface-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="body-md text-surface-500 mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="btn btn-primary w-full"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-surface-200/50">
        <div className="container-elegant py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-elegant-md">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="headline-lg text-surface-800">Dashboard Vaccine</h1>
                <p className="body-sm text-surface-500">อำเภอมายอ - จังหวัดตรัง</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  'bg-surface-100 hover:bg-surface-200',
                  loading && 'animate-spin'
                )}
              >
                <RefreshCw className="w-5 h-5 text-surface-600" />
              </button>
              <div className="text-right">
                <p className="label-md text-surface-500">อัปเดตล่าสุด</p>
                <p className="body-sm text-surface-700">
                  {data?.lastUpdatedAt ? new Date(data.lastUpdatedAt).toLocaleString('th-TH') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-elegant py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white rounded-elegant p-1.5 shadow-elegant-sm w-fit">
          <button
            onClick={() => setActiveTab('progress')}
            className={clsx(
              'px-6 py-2.5 rounded-elegant font-medium transition-all',
              activeTab === 'progress'
                ? 'bg-primary-600 text-white shadow-elegant-md'
                : 'text-surface-600 hover:bg-surface-50'
            )}
          >
            ความก้าวหน้าวัคซีน
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={clsx(
              'px-6 py-2.5 rounded-elegant font-medium transition-all',
              activeTab === 'quality'
                ? 'bg-primary-600 text-white shadow-elegant-md'
                : 'text-surface-600 hover:bg-surface-50'
            )}
          >
            คุณภาพข้อมูล
          </button>
        </div>

        {activeTab === 'progress' ? (
          // Vaccine Progress Tab
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="เด็กทั้งหมด"
                value={data?.vaccineProgress.district?.totalChildren ?? 0}
                subtitle="ในความรับผิดชอบ"
                icon={<Users className="w-5 h-5" />}
              />
              <KPICard
                title="ความครอบคลุม"
                value={`${data?.vaccineProgress.district?.coverage?.toFixed(1) ?? '0.0'}%`}
                subtitle="เป้าหมาย 95%"
                accent
                icon={<Activity className="w-5 h-5" />}
              />
              <KPICard
                title="ตามกำหนด"
                value={data?.vaccineProgress.district?.onSchedule ?? 0}
                trend={{ value: 2.5, label: 'จากเดือนที่แล้ว' }}
                icon={<Clock className="w-5 h-5 text-status-success" />}
              />
              <KPICard
                title="ต้องติดตาม"
                value={data?.vaccineProgress.district?.needFollowUp ?? 0}
                subtitle="ล่าช้า + ปฏิเสธ"
                trend={{ value: -5.2, label: 'จากเดือนที่แล้ว' }}
                icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VaccineProgressChart
                data={{
                  onSchedule: data?.vaccineProgress.district?.onSchedule ?? 0,
                  delayed: data?.vaccineProgress.district?.delayed ?? 0,
                  refused: data?.vaccineProgress.district?.refused ?? 0,
                  total: data?.vaccineProgress.district?.totalChildren ?? 0,
                }}
                loading={loading}
              />

              <div className="card-elevated p-6">
                <h3 className="headline-lg text-surface-800 mb-4">สถานะรายหน่วยบริการ</h3>
                <div className="space-y-3">
                  {[
                    { label: 'ส่งข้อมูลครบแล้ว', value: data?.dataQuality.unitsCompleted ?? 0, total: 14 },
                    { label: 'ยังต้องติดตาม', value: data?.dataQuality.unitsNeedFollowUp ?? 0, total: 14 },
                    { label: 'ยังไม่ได้ส่งข้อมูล', value: 14 - (data?.dataQuality.unitsReported ?? 0), total: 14 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                      <span className="body-md text-surface-600">{item.label}</span>
                      <span className="label-lg font-medium text-surface-800">
                        {item.value} / {item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Service Units Table */}
            <ServiceUnitTable
              data={data?.vaccineProgress.serviceUnits ?? []}
              loading={loading}
            />
          </div>
        ) : (
          // Data Quality Tab
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="หน่วยบริการที่รายงาน"
                value={`${data?.dataQuality.unitsReported ?? 0} / ${data?.dataQuality.totalUnits ?? 14}`}
                subtitle="หน่วยบริการ"
                icon={<Users className="w-5 h-5" />}
              />
              <KPICard
                title="ส่งข้อมูลครบ"
                value={data?.dataQuality.unitsCompleted ?? 0}
                subtitle="หน่วยบริการ"
                icon={<Check className="w-5 h-5 text-status-success" />}
              />
              <KPICard
                title="ต้องติดตาม"
                value={data?.dataQuality.unitsNeedFollowUp ?? 0}
                subtitle="หน่วยบริการ"
                icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
              />
            </div>

            <ServiceUnitTable
              data={data?.dataQuality.serviceUnits ?? []}
              loading={loading}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white/50 backdrop-blur-sm mt-12">
        <div className="container-elegant py-6">
          <div className="flex items-center justify-between text-body-sm text-surface-500">
            <p>© 2026 Dashboard Vaccine - อำเภอมายอ สำนักงานสาธารณสุขจังหวัดตรัง</p>
            <p>พัฒนาเพื่อการติดตามวัคซีนเด็กครอบคลุมและมีประสิทธิภาพ</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicDashboard;
