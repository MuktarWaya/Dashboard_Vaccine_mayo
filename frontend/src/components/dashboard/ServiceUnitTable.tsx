import React from 'react';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import StatusBadge from '../ui/StatusBadge';
import type { ServiceUnitData } from '@/types/vaccine';

interface ServiceUnitTableProps {
  data: ServiceUnitData[];
  loading?: boolean;
  onRowClick?: (unit: ServiceUnitData) => void;
}

const ServiceUnitTable: React.FC<ServiceUnitTableProps> = ({
  data,
  loading = false,
  onRowClick,
}) => {
  const getCoverageColor = (coverage: number) => {
    if (coverage >= 95) return 'text-status-success';
    if (coverage >= 85) return 'text-status-warning';
    return 'text-status-error';
  };

  const getCoverageBarColor = (coverage: number) => {
    if (coverage >= 95) return 'bg-status-success';
    if (coverage >= 85) return 'bg-status-warning';
    return 'bg-status-error';
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/50">
        <h3 className="headline-lg text-surface-800">สถานะรายหน่วยบริการ</h3>
        <p className="body-sm text-surface-500 mt-1">
          ข้อมูลการรายงานวัคซีนรายเดือนของแต่ละหน่วยบริการ
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-elegant">
          <thead>
            <tr>
              <th className="w-[120px]">รหัส</th>
              <th>ชื่อหน่วยบริการ</th>
              <th className="w-[140px]">สถานะ</th>
              <th className="w-[140px] text-right">
                <div className="flex items-center justify-end gap-1">
                  ความครอบคลุม
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="w-[100px] text-right">เด็กทั้งหมด</th>
              <th className="w-[120px] text-right">ต้องติดตาม</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><div className="h-4 w-16 shimmer rounded" /></td>
                  <td><div className="h-4 w-40 shimmer rounded" /></td>
                  <td><div className="h-6 w-24 shimmer rounded-full" /></td>
                  <td><div className="h-4 w-16 shimmer rounded ml-auto" /></td>
                  <td><div className="h-4 w-12 shimmer rounded ml-auto" /></td>
                  <td><div className="h-4 w-16 shimmer rounded ml-auto" /></td>
                  <td><div className="h-8 w-8 shimmer rounded" /></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-surface-400">
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            ) : (
              data.map((unit) => (
                <tr
                  key={unit.serviceUnitCode}
                  className={clsx(
                    'transition-all duration-200',
                    onRowClick && 'cursor-pointer hover:bg-surface-50'
                  )}
                  onClick={() => onRowClick?.(unit)}
                >
                  <td className="font-mono text-body-sm text-surface-500">
                    {unit.serviceUnitCode}
                  </td>
                  <td>
                    <span className="font-medium text-surface-800">
                      {unit.serviceUnitName}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={unit.reportStatus} />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={clsx('label-lg font-semibold', getCoverageColor(unit.coverage))}>
                        {unit.coverage.toFixed(1)}%
                      </span>
                      <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-500', getCoverageBarColor(unit.coverage))}
                          style={{ width: `${unit.coverage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="text-right font-medium text-surface-700">
                    {unit.totalChildren.toLocaleString()}
                  </td>
                  <td className="text-right">
                    <span className={clsx(
                      'font-semibold',
                      unit.needFollowUp > 0 ? 'text-status-error' : 'text-status-success'
                    )}>
                      {unit.needFollowUp.toLocaleString()}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick?.(unit);
                      }}
                    >
                      <MoreHorizontal className="w-4 h-4 text-surface-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-3 border-t border-surface-200 bg-surface-50/50">
        <div className="flex items-center justify-between text-body-sm text-surface-500">
          <span>แสดง {data.length} จาก 14 หน่วยบริการ</span>
          <span>อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}</span>
        </div>
      </div>
    </div>
  );
};

export default ServiceUnitTable;
