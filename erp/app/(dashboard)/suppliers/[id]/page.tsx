'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, FileDown } from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';
import { formatSom } from '@/lib/dashboard';
import { createWorkbook, addSheet, downloadWorkbook } from '@/lib/excel';
import { format } from 'date-fns';

interface SupplierDetail {
  id: string;
  fullname: string;
  phone: string | null;
  bank_account: string | null;
  note: string | null;
  is_active: boolean;
  total_purchases: number;
  total_payments: number;
  debt: number;
  purchases: {
    id: string;
    product_id: string;
    quantity: number;
    unit_cost: number | string;
    total: number | string;
    created_at: string;
    product?: { name: string };
  }[];
  payments: {
    id: string;
    amount: number | string;
    created_at: string;
    note: string | null;
  }[];
}

function PaymentForm({
  supplierId,
  onSuccess,
}: {
  supplierId: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { amount: number; note?: string }) =>
      apiPost(`/admin/suppliers/${supplierId}/payments`, body),
    onSuccess: () => {
      setAmount('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onSuccess();
      toast.success('To‘lov qayd etildi');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
    if (Number.isNaN(num) || num <= 0) {
      toast.error('Summa 0 dan katta bo‘lishi kerak');
      return;
    }
    mutation.mutate({ amount: num, note: note.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <Label htmlFor="amount">Summa (so‘m)</Label>
        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100000"
        />
      </div>
      <div className="min-w-[180px]">
        <Label htmlFor="note">Izoh</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="To‘lov izohi"
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        To‘lov qayd etish
      </Button>
    </form>
  );
}

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => apiGet<SupplierDetail>(`/admin/suppliers/${id}`),
    enabled: !!id,
  });

  if (error || (!isLoading && !data)) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Link>
        </Button>
        <p className="text-danger">Taminotchi topilmadi</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-3)]">
        Yuklanmoqda…
      </div>
    );
  }

  const num = (v: number | string) => (typeof v === 'number' ? v : Number(v));

  const handleExportExcel = () => {
    const wb = createWorkbook();
    const safeName = (data.fullname || 'Taminotchi').replace(/[/\\?*\[\]:]/g, '_').slice(0, 50);
    addSheet(wb, "Ma'lumot", {
      title: `Taminotchi: ${data.fullname}`,
      headers: ['Ko‘rsatkich', 'Qiymat'],
      rows: [
        ['Telefon', data.phone ?? '—'],
        ['Bank hisob', data.bank_account ?? '—'],
        ['Xaridlar jami (so\'m)', data.total_purchases],
        ['To‘langan (so\'m)', data.total_payments],
        ['Qoldiq qarz (so\'m)', data.debt],
      ],
    });
    addSheet(wb, 'Xaridlar', {
      headers: ['Sana', 'Mahsulot nomi', 'Miqdor', 'Birlik narx (so\'m)', 'Jami (so\'m)'],
      rows: data.purchases.map((p) => [
        format(new Date(p.created_at), 'dd.MM.yyyy HH:mm'),
        p.product?.name ?? '—',
        p.quantity,
        num(p.unit_cost),
        num(p.total),
      ]),
    });
    addSheet(wb, "To'lovlar", {
      headers: ['Sana', 'Summa (so\'m)', 'Izoh'],
      rows: data.payments.map((pay) => [
        format(new Date(pay.created_at), 'dd.MM.yyyy HH:mm'),
        num(pay.amount),
        pay.note ?? '—',
      ]),
    });
    const ts = format(new Date(), 'yyyy-MM-dd_HH-mm');
    downloadWorkbook(wb, `Taminotchi_${safeName}_${ts}.xlsx`);
    toast.success('Excel fayl yuklandi');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">
              {data.fullname}
            </h1>
            <p className="text-sm text-[var(--text-3)]">
              {data.phone ?? '—'} {data.bank_account ? `• ${data.bank_account}` : ''}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileDown className="mr-2 h-4 w-4" />
          Excel yuklab olish
        </Button>
      </div>

      {/* Qarz va to'lov */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Qarz va to‘lov</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--text-3)]">Xaridlar jami</p>
              <p className="font-mono text-lg font-semibold">
                {formatSom(data.total_purchases)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-3)]">To‘langan</p>
              <p className="font-mono text-lg font-semibold">
                {formatSom(data.total_payments)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-3)]">Qoldiq qarz</p>
              <p
                className={`font-mono text-lg font-semibold ${
                  data.debt > 0 ? 'text-danger' : 'text-[var(--text-1)]'
                }`}
              >
                {formatSom(data.debt)}
              </p>
            </div>
          </div>
          <PaymentForm
            supplierId={id}
            onSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ['supplier', id] })
            }
          />
        </CardContent>
      </Card>

      {/* So'ngi xaridlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">So‘ngi xaridlar</CardTitle>
        </CardHeader>
        <CardContent>
          {data.purchases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-2)]/50 py-10 px-4 text-center">
              <p className="text-sm font-medium text-[var(--text-2)]">
                Xaridlar yo‘q
              </p>
              <p className="mt-1 text-sm text-[var(--text-3)] max-w-sm mx-auto">
                «Ombor (Zapchast)»da yangi mahsulot qo‘shganda taminotchini tanlang
                yoki mahsulot uchun «Kirim qo‘shish»da taminotchini belgilang — xarid va qarz avtomatik yoziladi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Mahsulot</th>
                    <th className="text-right">Miqdor</th>
                    <th className="text-right">Narx (birlik)</th>
                    <th className="text-right">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="text-[var(--text-3)]">
                        {new Date(p.created_at).toLocaleDateString('uz-UZ')}
                      </td>
                      <td className="font-medium">
                        {p.product?.name ?? '—'}
                      </td>
                      <td className="text-right">{p.quantity}</td>
                      <td className="text-right">
                        {formatSom(num(p.unit_cost))}
                      </td>
                      <td className="text-right font-medium">
                        {formatSom(num(p.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* To'lovlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">To‘lovlar</CardTitle>
        </CardHeader>
        <CardContent>
          {data.payments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-2)]/50 py-8 px-4 text-center">
              <p className="text-sm text-[var(--text-3)]">To‘lovlar yo‘q</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                Taminotchiga to‘lov qilganda «To‘lov qayd etish» orqali yozing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th className="text-right">Summa</th>
                    <th>Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="text-[var(--text-3)]">
                        {new Date(pay.created_at).toLocaleString('uz-UZ')}
                      </td>
                      <td className="text-right font-medium text-success">
                        {formatSom(num(pay.amount))}
                      </td>
                      <td className="text-[var(--text-3)]">{pay.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
