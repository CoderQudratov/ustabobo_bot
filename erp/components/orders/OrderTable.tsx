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
import { Badge } from '@/components/ui/badge';
import type { Order, OrderStatus } from '@/lib/types';
import { orderStatusLabel } from '@/lib/types';
import { Eye, Pencil } from 'lucide-react';

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

function statusVariant(s: OrderStatus): 'default' | 'secondary' | 'destructive' {
  if (s === 'completed') return 'default';
  if (s === 'cancelled') return 'destructive';
  return 'secondary';
}

function getServiceName(order: Order): string {
  const svc = order.orderItems?.find((i) => i.service?.name);
  return svc?.service?.name ?? '—';
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Mijoz</TableHead>
          <TableHead>Mashina</TableHead>
          <TableHead>Xizmat turi</TableHead>
          <TableHead>Usta</TableHead>
          <TableHead className="text-right">Summa</TableHead>
          <TableHead>Holati</TableHead>
          <TableHead>Vaqt</TableHead>
          <TableHead className="w-20">Amallar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow
            key={o.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick(o)}
          >
            <TableCell className="font-mono text-muted-foreground">
              {o.id.slice(0, 8)}
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{o.client_name}</div>
                <div className="text-xs text-muted-foreground">{o.client_phone}</div>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div>{o.car_number}</div>
                {o.car_model && (
                  <div className="text-xs text-muted-foreground">{o.car_model}</div>
                )}
              </div>
            </TableCell>
            <TableCell>{getServiceName(o)}</TableCell>
            <TableCell>{o.master?.fullname ?? '—'}</TableCell>
            <TableCell className="text-right">
              {Number(o.total_amount).toLocaleString('uz-UZ')} so&apos;m
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              {onStatusChange ? (
                <Select
                  value={o.status}
                  onValueChange={(v) => onStatusChange(o, v as OrderStatus)}
                  disabled={isUpdating?.(o.id)}
                >
                  <SelectTrigger className="h-8 w-36 border-0 bg-transparent shadow-none hover:bg-muted/50">
                    <SelectValue>
                      <Badge variant={statusVariant(o.status)}>
                        {orderStatusLabel(o.status)}
                      </Badge>
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
                <Badge variant={statusVariant(o.status)}>
                  {orderStatusLabel(o.status)}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(o.created_at), 'dd.MM.yy HH:mm')}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRowClick(o)}
                  title="Ko'rish"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
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
  );
}
