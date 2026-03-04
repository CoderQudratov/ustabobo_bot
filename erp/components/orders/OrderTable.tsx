'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Order } from '@/lib/types';
import { orderStatusLabel } from '@/lib/types';

export function OrderTable({
  orders,
  onRowClick,
}: {
  orders: Order[];
  onRowClick: (order: Order) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Sana</TableHead>
          <TableHead>Mijoz</TableHead>
          <TableHead>Mashina raqami</TableHead>
          <TableHead>Usta</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Summa</TableHead>
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
              {new Date(o.created_at).toLocaleDateString('uz-UZ')}
            </TableCell>
            <TableCell>{o.client_name}</TableCell>
            <TableCell>{o.car_number}</TableCell>
            <TableCell>{o.master?.fullname ?? '—'}</TableCell>
            <TableCell>{orderStatusLabel(o.status)}</TableCell>
            <TableCell className="text-right">
              {Number(o.total_amount).toLocaleString('uz-UZ')} so‘m
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
