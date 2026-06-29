import React, { useState, useEffect } from 'react';
import { Trophy, Award, Target, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx } from 'clsx';
import KPICard from '../ui/KPICard';
import StatusBadge from '../ui/StatusBadge';
import type { ExecutiveDashboardData } from '@/types/vaccine';

const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    // Mock data for demo
    setTimeout(() => {
      setData({
        lastUpdatedAt: new Date().toISOString(),
        reportMonth: '2026-06',
        vaccineProgress: {
          state: 'READY',
          district: {
            name: 'อำเภอมายอ',
            totalChildren: 1856,
            coverage: 94.8,
            onSchedule: 1680,
            delayed: 132,
            refused: 44,
            needFollowUp: 176,
          },
          serviceUnits: [],
        },
        dataQuality: {
          unitsReported: 14,
          totalUnits: 14,
          unitsCompleted: 12,
          unitsNeedFollowUp: 2,
          serviceUnits: [],
        },
        executiveView: {
          kpiScores: {
            district: 94.8,
            bestUnit: { code: '09947', name: 'รพ.สต.มายอ', score: 98.5 },
            needsAttention: { code: '09951', name: 'รพ.สต.ป่าโนน', score: 89.2 },
          },
          trends: {
            monthOverMonth: 2.3,
            comparedToLastMonth: 42,
          },
          rankings: [
            { serviceUnitCode: '09947', serviceUnitName: 'รพ.สต.มายอ', reportStatus: 'ส่งครบ', coverage: 98.5, totalChildren: 145, needFollowUp: 2, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09944', serviceUnitName: 'รพ.สต.ท่าแพะ', reportStatus: 'ส่งครบ', coverage: 97.2, totalChildren: 132, needFollowUp: 4, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09949', serviceUnitName: 'รพ.สต.บาตอง', reportStatus: 'ส่งครบ', coverage: 96.8, totalChildren: 128, needFollowUp: 4, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09943', serviceUnitName: 'รพ.สต.ตะโกะ', reportStatus: 'ส่งครบ', coverage: 96.1, totalChildren: 142, needFollowUp: 6, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09942', serviceUnitName: 'รพ.สต.ทับปุด', reportStatus: 'ส่งครบ', coverage: 95.4, totalChildren: 138, needFollowUp: 6, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09948', serviceUnitName: 'รพ.สต.ตะเคิด', reportStatus: 'ส่งครบ', coverage: 95.1, totalChildren: 125, needFollowUp: 6, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09945', serviceUnitName: 'รพ.สต.ปาโจะ', reportStatus: 'ส่งแต่ยังติดตาม', coverage: 94.8, totalChildren: 135, needFollowUp: 7, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09946', serviceUnitName: 'รพ.สต.ป่าไก่', reportStatus: 'ส่งครบ', coverage: 94.2, totalChildren: 129, needFollowUp: 8, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09950', serviceUnitName: 'รพ.สต.ไหล่ป่า', reportStatus: 'ส่งครบ', coverage: 93.7, totalChildren: 131, needFollowUp: 8, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09941', serviceUnitName: 'รพ.สต.บาตัง', reportStatus: 'ส่งแต่ยังติดตาม', coverage: 92.9, totalChildren: 140, needFollowUp: 10, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09952', serviceUnitName: 'รพ.สต.ห้วยลาด', reportStatus: 'ส่งครบ', coverage: 91.8, totalChildren: 127, needFollowUp: 10, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09954', serviceUnitName: 'รพ.สต.โคกโต๊ะ', reportStatus: 'ส่งครบ', coverage: 91.2, totalChildren: 124, needFollowUp: 11, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09953', serviceUnitName: 'รพ.สต.ท่าลาด', reportStatus: 'ส่งแต่ยังติดตาม', coverage: 90.5, totalChildren: 130, needFollowUp: 12, lastUpdated: new Date().toISOString() },
            { serviceUnitCode: '09951', serviceUnitName: 'รพ.สต.ป่าโนน', reportStatus: 'ส่งแต่ยังติดตาม', coverage: 89.2, totalChildren: 120, needFollowUp: 13, lastUpdated: new Date().toISOString() },
          ],
        },
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900">
      {/* Premium Header */}
      <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
        <div className="container-elegant py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold to-accent-goldDark flex items-center justify-center shadow-gold-glow">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-display-md text-white font-bold">Executive Dashboard</h1>
                  <span className="px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold text-xs font-medium border border-accent-gold/30">
                    PREMIUM
                  </span>
                </div>
                <p className="body-md text-surface-400 mt-0.5">ภาพรวมผลการดำเนินงานระดับอำเภอ</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Period Selector */}
              <div className="flex bg-surface-800/50 rounded-elegant p-1 border border-white/10">
                {(['month', 'quarter', 'year'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={clsx(
                      'px-4 py-2 rounded-elegant text-sm font-medium transition-all',
                      selectedPeriod === period
                        ? 'bg-accent-gold text-white shadow-elegant-md'
                        : 'text-surface-400 hover:text-white'
                    )}
                  >
                    {period === 'month' ? 'รายเดือน' : period === 'quarter' ? 'รายไตรมาส' : 'รายปี'}
                  </button>
                ))}
              </div>

              <div className="text-right">
                <p className="label-md text-surface-500">อัปเดตล่าสุด</p>
                <p className="body-sm text-white">
                  {data?.lastUpdatedAt ? new Date(data.lastUpdatedAt).toLocaleString('th-TH') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-elegant py-10">
        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Overall Score */}
          <div className="relative bg-gradient-to-br from-accent-gold/20 to-accent-goldDark/10 rounded-elegant-xl p-6 border border-accent-gold/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent-gold/20">
                  <Trophy className="w-5 h-5 text-accent-gold" />
                </div>
                <span className="label-md text-accent-gold uppercase tracking-wide">คะแนนรวมอำเภอ</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-display-lg text-white font-bold">
                  {data?.executiveView.kpiScores.district.toFixed(1)}
                </span>
                <span className="text-body-lg text-surface-400">/ 100</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {data?.executiveView.trends.monthOverMonth && data.executiveView.trends.monthOverMonth > 0 ? (
                  <ArrowUp className="w-4 h-4 text-status-success" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-status-error" />
                )}
                <span className={clsx(
                  'text-sm font-medium',
                  (data?.executiveView.trends.monthOverMonth || 0) > 0 ? 'text-status-success' : 'text-status-error'
                )}>
                  {Math.abs(data?.executiveView.trends.monthOverMonth || 0)}% จากเดือนที่แล้ว
                </span>
              </div>
            </div>
          </div>

          {/* Best Unit */}
          <div className="bg-surface-800/50 rounded-elegant-xl p-6 border border-status-success/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-status-success/20">
                <Award className="w-5 h-5 text-status-success" />
              </div>
              <span className="label-md text-status-success uppercase tracking-wide">หน่วยบริการยอดเยี่ยม</span>
            </div>
            <p className="headline-lg text-white mb-1">{data?.executiveView.kpiScores.bestUnit.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-surface-400">{data?.executiveView.kpiScores.bestUnit.code}</span>
              <span className="label-lg font-semibold text-status-success">
                {data?.executiveView.kpiScores.bestUnit.score.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-surface-800/50 rounded-elegant-xl p-6 border border-status-warning/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-status-warning/20">
                <Target className="w-5 h-5 text-status-warning" />
              </div>
              <span className="label-md text-status-warning uppercase tracking-wide">ต้องติดตาม</span>
            </div>
            <p className="headline-lg text-white mb-1">{data?.executiveView.kpiScores.needsAttention.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-surface-400">{data?.executiveView.kpiScores.needsAttention.code}</span>
              <span className="label-lg font-semibold text-status-warning">
                {data?.executiveView.kpiScores.needsAttention.score.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Target Achievement */}
          <div className="bg-surface-800/50 rounded-elegant-xl p-6 border border-primary-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <BarChart3 className="w-5 h-5 text-primary-400" />
              </div>
              <span className="label-md text-primary-400 uppercase tracking-wide">บรรลุเป้าหมาย</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-sm text-surface-400">หน่วยบริการ</span>
              <span className="label-lg font-semibold text-white">
                {data?.dataQuality.unitsCompleted} / {data?.dataQuality.totalUnits}
              </span>
            </div>
            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-gold transition-all duration-700"
                style={{ width: `${((data?.dataQuality.unitsCompleted || 0) / (data?.dataQuality.totalUnits || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rankings Table */}
        <div className="bg-surface-800/50 rounded-elegant-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 bg-surface-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="headline-lg text-white">การจัดอันดับหน่วยบริการ</h2>
                <p className="body-sm text-surface-400 mt-1">เรียงตามคะแนนความครอบคลุมวัคซีน</p>
              </div>
              <div className="flex items-center gap-2 text-accent-gold">
                <Trophy className="w-5 h-5" />
                <span className="label-md">Top Performers</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-900/50">
                  <th className="text-left py-4 px-6 text-label-md text-surface-400 font-medium">อันดับ</th>
                  <th className="text-left py-4 px-6 text-label-md text-surface-400 font-medium">หน่วยบริการ</th>
                  <th className="text-center py-4 px-6 text-label-md text-surface-400 font-medium">สถานะ</th>
                  <th className="text-right py-4 px-6 text-label-md text-surface-400 font-medium">คะแนน</th>
                  <th className="text-right py-4 px-6 text-label-md text-surface-400 font-medium">เด็กทั้งหมด</th>
                  <th className="text-right py-4 px-6 text-label-md text-surface-400 font-medium">ต้องติดตาม</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-4 px-6"><div className="h-4 w-8 shimmer rounded" /></td>
                      <td className="py-4 px-6"><div className="h-4 w-40 shimmer rounded" /></td>
                      <td className="py-4 px-6 text-center"><div className="h-6 w-20 shimmer rounded-full mx-auto" /></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 w-12 shimmer rounded ml-auto" /></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 w-10 shimmer rounded ml-auto" /></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 w-10 shimmer rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  data?.executiveView.rankings.map((unit, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    const isLowest = rank >= 12;

                    return (
                      <tr
                        key={unit.serviceUnitCode}
                        className={clsx(
                          'border-b border-white/5 transition-colors hover:bg-white/5',
                          isTop3 && 'bg-status-success/5'
                        )}
                      >
                        <td className="py-4 px-6">
                          <div className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold',
                            isTop3 && 'bg-gradient-to-br from-accent-gold to-accent-goldDark text-white',
                            !isTop3 && 'bg-surface-700 text-surface-400'
                          )}>
                            {rank}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className={clsx('font-medium', isTop3 ? 'text-white' : 'text-surface-300')}>
                              {unit.serviceUnitName}
                            </p>
                            <p className="text-xs text-surface-500">{unit.serviceUnitCode}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <StatusBadge status={unit.reportStatus} size="sm" />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={clsx(
                            'label-lg font-semibold',
                            isTop3 && 'text-accent-gold',
                            isLowest && 'text-status-warning',
                            !isTop3 && !isLowest && 'text-surface-300'
                          )}>
                            {unit.coverage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-surface-400">
                          {unit.totalChildren.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={clsx(
                            'font-semibold',
                            unit.needFollowUp === 0 ? 'text-status-success' : 'text-status-error'
                          )}>
                            {unit.needFollowUp.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights Panel */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-primary-900/50 to-primary-800/30 rounded-elegant-xl p-6 border border-primary-500/20">
            <h3 className="headline-lg text-white mb-4">ข้อเสนอแนะ</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-surface-300">
                <ArrowUp className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
                <span>รพ.สต.มายอ มีคะแนนดีที่สุด 98.5% ควรนำเสนอเป็นตัวอย่าง</span>
              </li>
              <li className="flex items-start gap-3 text-surface-300">
                <ArrowDown className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
                <span>รพ.สต.ป่าโนน ต้องการความช่วยเหลือเพิ่มเติม คะแนน 89.2%</span>
              </li>
              <li className="flex items-start gap-3 text-surface-300">
                <Target className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5" />
                <span>เดือนนี้บรรลุเป้าหมาย 12/14 หน่วยบริการ ดีกว่าเดือนที่แล้ว</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-accent-gold/10 to-accent-goldDark/5 rounded-elegant-xl p-6 border border-accent-gold/20">
            <h3 className="headline-lg text-white mb-4">เป้าหมายรายไตรมาส</h3>
            <div className="space-y-4">
              {[
                { label: 'ความครอบคลุมเฉลี่ย 95%', current: 94.8, target: 95 },
                { label: 'หน่วยบริการที่บรรลุเป้าหมาย 90%', current: 85.7, target: 90 },
                { label: 'เด็กที่ต้องติดตามลดลง 50%', current: 176, target: 150 },
              ].map((goal) => (
                <div key={goal.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-surface-300">{goal.label}</span>
                    <span className={clsx('label-md font-semibold', goal.current >= goal.target ? 'text-status-success' : 'text-status-warning')}>
                      {typeof goal.current === 'number' && goal.current > 100 ? goal.current.toFixed(1) : goal.current} / {goal.target}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full transition-all duration-700',
                        goal.current >= goal.target ? 'bg-gradient-to-r from-status-success to-primary-500' : 'bg-gradient-to-r from-status-warning to-status-error'
                      )}
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-white/10 bg-surface-900/50 mt-12">
        <div className="container-elegant py-6">
          <div className="flex items-center justify-between text-body-sm text-surface-500">
            <p>© 2026 Executive Dashboard - อำเภอมายอ</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span>Live Data</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ExecutiveDashboard;
