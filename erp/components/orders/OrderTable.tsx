'use client';

import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Order, OrderStatus } from '@/lib/types';
import { orderStatusLabel } from '@/lib/types';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_STATUSES: OrderStatus[] = [
  'draft',
  'waiting_confirmation',
  'waiting_master_work_start',
  'broadcasted',
  'accepted',
  'received_by_driver',
  'waiting_master_delivery_confirmation',
  'delivered_by_driver',
  'received_by_master',
  'working',
  'waiting_customer_confirmation',
  'completed',
  'cancelled',
];

function getServiceName(order: Order): string {
  const svc = order.orderItems?.find((i) => i.service?.name);
  return svc?.service?.name ?? '—';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || '—').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-teal-500/20 text-teal-400',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
  'bg-cyan-500/20 text-cyan-400',
];
function avatarColor(str: string): string {
  let n = 0;
  for (let i = 0; i < str.length; i++) n += str.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function OrderTable({
  orders,
  onRowClick,
  onStatusChange,
  isUpdating,
}: {
  orders: Order[];
  onRowClick: (order: Order) => void;
  onStatusChange?: (order: Order, status: OrderStatus) => void;
  isUpdating?: (id: string) => boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[var(--border)] hover:bg-transparent">
            <TableHead className="h-11 bg-[var(--bg-2)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              #
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Mijoz
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Mashina
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Xizmat turi
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Usta
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Summa
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Holati
            </TableHead>
            <TableHead className="bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Vaqt
            </TableHead>
            <TableHead className="w-[120px] bg-[var(--bg-2)] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
              Amallar
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow
              key={o.id}
              className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-2)]"
              onClick={() => onRowClick(o)}
            >
              <TableCell className="px-4 py-[13px] font-mono text-[13.5px] text-[var(--text-3)]">
                {o.id.slice(0, 8)}
              </TableCell>
              <TableCell className="px-4 py-[13px] text-[13.5px]">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      avatarColor(o.client_name || '')
                    )}
                  >
                    {initials(o.client_name || '—')}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--text-1)]">{o.client_name}</div>
                    <div className="font-mono text-xs tracking-wide text-[var(--text-3)]">{o.client_phone}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-[13px] text-[13.5px]">
                <div>
                  <div>{o.car_number}</div>
                  {o.car_model && (
                    <div className="text-xs text-[var(--text-3)]">{o.car_model}</div>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-4 py-[13px] text-[13.5px]">{getServiceName(o)}</TableCell>
              <TableCell className="px-4 py-[13px] text-[13.5px]">{o.master?.fullname ?? '—'}</TableCell>
              <TableCell className="px-4 py-[13px] text-right font-mono text-[13.5px] font-semibold text-[var(--success)]">
                {Number(o.total_amount).toLocaleString('uz-UZ')} so&apos;m
              </TableCell>
              <TableCell className="px-4 py-[13px]" onClick={(e) => e.stopPropagation()}>
                {onStatusChange ? (
                  <Select
                    value={o.status}
                    onValueChange={(v) => onStatusChange(o, v as OrderStatus)}
                    disabled={isUpdating?.(o.id)}
                  >
                    <SelectTrigger className="h-8 w-36 border-0 bg-transparent shadow-none hover:bg-[var(--bg-2)]">
                      <SelectValue>
                        <StatusBadge status={o.status} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {orderStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={o.status} />
                )}
              </TableCell>
              <TableCell className="px-4 py-[13px] font-mono text-xs text-[var(--text-3)]">
                {format(new Date(o.created_at), 'dd.MM.yy HH:mm')}
              </TableCell>
              <TableCell className="px-4 py-[13px]" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[30px] w-[30px] rounded-md border-0 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
                    onClick={() => onRowClick(o)}
                    title="Ko'rish"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[30px] w-[30px] rounded-md border-0 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                    onClick={() => onRowClick(o)}
                    title="Tahrirlash"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
