import React from 'react';
import { Check, Clock, X, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { ServiceUnitReportStatus } from '@/types/vaccine';

interface StatusBadgeProps {
  status: ServiceUnitReportStatus | 'ยืนยันแล้ว' | 'รอยืนยัน' | 'ต้องติดตาม' | 'ยังไม่นำเข้า';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig = {
  'ส่งครบ': {
    variant: 'success' as const,
    icon: Check,
    label: 'ส่งครบ',
  },
  'ยืนยันแล้ว': {
    variant: 'success' as const,
    icon: Check,
    label: 'ยืนยันแล้ว',
  },
  'ส่งแต่ยังติดตาม': {
    variant: 'warning' as const,
    icon: Clock,
    label: 'ส่งแต่ยังติดตาม',
  },
  'รอยืนยัน': {
    variant: 'pending' as const,
    icon: Clock,
    label: 'รอยืนยัน',
  },
  'ต้องติดตาม': {
    variant: 'error' as const,
    icon: AlertCircle,
    label: 'ต้องติดตาม',
  },
  'ยังไม่ส่ง': {
    variant: 'default' as const,
    icon: X,
    label: 'ยังไม่ส่ง',
  },
  'ส่งไม่ครบ': {
    variant: 'error' as const,
    icon: X,
    label: 'ส่งไม่ครบ',
  },
  'ยังไม่นำเข้า': {
    variant: 'default' as const,
    icon: X,
    label: 'ยังไม่นำเข้า',
  },
};

const variantStyles = {
  success: 'bg-status-success/10 text-status-success border-status-success/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  error: 'bg-status-error/10 text-status-error border-status-error/20',
  pending: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  default: 'bg-surface-100 text-surface-500 border-surface-200',
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1.5 text-xs',
  lg: 'px-3 py-2 text-sm',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200',
        variantStyles[config.variant],
        sizeStyles[size]
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
