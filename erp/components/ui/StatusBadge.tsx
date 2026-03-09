'use client';

import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import { orderStatusLabel } from '@/lib/types';

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  completed: {
    label: 'Tugallandi',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  working: {
    label: 'Jarayonda',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  accepted: {
    label: 'Qabul qilindi',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  received_by_master: {
    label: 'Usta qabul qildi',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  waiting_confirmation: {
    label: 'Tasdiq kutmoqda',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  waiting_customer_confirmation: {
    label: 'Mijoz kutmoqda',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  broadcasted: {
    label: "E'lon qilindi",
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  delivered_by_driver: {
    label: 'Yetkazildi',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  received_by_driver: {
    label: 'Haydovchi oldi',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  waiting_master_delivery_confirmation: {
    label: 'Yetkazilishi kutilmoqda',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  waiting_master_work_start: {
    label: 'Usta boshlashi kutilmoqda',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  cancelled: {
    label: 'Bekor qilindi',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  draft: {
    label: 'Qoralama',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus | string;
  className?: string;
}) {
  const config =
    STATUS_CONFIG[status] ?? {
      label: orderStatusLabel(status as OrderStatus),
      className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
