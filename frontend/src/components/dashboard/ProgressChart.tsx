import React from 'react';
import { clsx } from 'clsx';

interface ProgressItem {
  label: string;
  value: number;
  total: number;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ProgressChartProps {
  data: ProgressItem[];
  title?: string;
  showTotal?: boolean;
  loading?: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  title,
  showTotal = true,
  loading = false,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card-elevated p-6">
      {title && (
        <div className="mb-6">
          <h3 className="headline-lg text-surface-800">{title}</h3>
        </div>
      )}

      <div className="space-y-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 shimmer rounded" />
                <div className="h-4 w-16 shimmer rounded" />
              </div>
              <div className="h-3 w-full shimmer rounded-full" />
            </div>
          ))
        ) : (
          data.map((item, index) => {
            const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
            const isLast = index === data.length - 1;

            return (
              <div
                key={item.label}
                className={clsx('space-y-2', !isLast && 'pb-4 border-b border-surface-100')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-surface-700">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm text-surface-500">
                      {item.value.toLocaleString()} / {item.total.toLocaleString()}
                    </span>
                    <span className={clsx('label-lg font-semibold', item.color)}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="relative h-3 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out',
                      item.color.replace('text-', 'bg-')
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}

        {showTotal && !loading && (
          <div className="pt-4 border-t border-surface-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-surface-700">รวมทั้งหมด</span>
              <span className="headline-lg text-gradient">
                {total.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// สร้าง component เฉพาะสำหรับ Vaccine Progress
export const VaccineProgressChart: React.FC<{
  data: {
    onSchedule: number;
    delayed: number;
    refused: number;
    total: number;
  };
  loading?: boolean;
}> = ({ data, loading }) => {
  const chartData: ProgressItem[] = [
    {
      label: 'ได้รับตามกำหนด',
      value: data.onSchedule,
      total: data.total,
      color: 'text-status-success',
    },
    {
      label: 'ได้รับล่าช้า',
      value: data.delayed,
      total: data.total,
      color: 'text-status-warning',
    },
    {
      label: 'ปฏิเสธการฉีด',
      value: data.refused,
      total: data.total,
      color: 'text-status-error',
    },
  ];

  return (
    <ProgressChart
      data={chartData}
      title="ความครอบคลุมวัคซีนรายเดือน"
      loading={loading}
    />
  );
};

export default ProgressChart;
