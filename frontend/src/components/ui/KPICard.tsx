import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accent = false,
  trend,
  loading = false,
}) => {
  return (
    <div
      className={clsx(
        'card-elevated p-6 transition-all duration-300 hover:shadow-elegant-lg',
        accent && 'border-l-4 border-l-accent-gold'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="label-md text-surface-500 uppercase tracking-wide">
          {title}
        </span>
        {icon && (
          <div
            className={clsx(
              'p-2 rounded-lg',
              accent
                ? 'bg-accent-gold/10 text-accent-gold'
                : 'bg-primary-500/10 text-primary-600'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-10 w-32 shimmer rounded" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span
            className={clsx(
              'display-lg font-bold',
              accent ? 'text-gradient-gold' : 'text-gradient'
            )}
          >
            {value}
          </span>
          {subtitle && (
            <span className="body-sm text-surface-500">{subtitle}</span>
          )}
        </div>
      )}

      {/* Trend */}
      {trend && !loading && (
        <div className="flex items-center gap-2 mt-3">
          {trend.value > 0 ? (
            <TrendingUp className="w-4 h-4 text-status-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-status-error" />
          )}
          <span
            className={clsx(
              'text-sm font-medium',
              trend.value > 0 ? 'text-status-success' : 'text-status-error'
            )}
          >
            {Math.abs(trend.value)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
