'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, Eye, Truck, FileDown } from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';
import { formatSom } from '@/lib/dashboard';
import { createWorkbook, addSheet, downloadWorkbook } from '@/lib/excel';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface Supplier {
  id: string;
  fullname: string;
  phone: string | null;
  bank_account: string | null;
  note: string | null;
  is_active: boolean;
}

interface SuppliersRes {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
}

interface DebtSummaryRes {
  suppliers: {
    id: string;
    fullname: string;
    phone: string | null;
    total_purchases: number;
    total_payments: number;
    debt: number;
    age_0_30: number;
    age_31_60: number;
    age_61_plus: number;
  }[];
}

function SupplierFormDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [bank_account, setBank_account] = useState('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname.trim()) {
      toast.error('Ism-familiya kiritilishi shart');
      return;
    }
    try {
      await apiPost('/admin/suppliers', {
        fullname: fullname.trim(),
        phone: phone.trim() || undefined,
        bank_account: bank_account.trim() || undefined,
        note: note.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'debt-summary'] });
      onSuccess();
      setFullname('');
      setPhone('');
      setBank_account('');
      setNote('');
      onClose();
      toast.success('Taminotchi qo‘shildi');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-[var(--text-1)] mb-4">
            Yangi taminotchi
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="fullname">Ism-familiya *</Label>
              <Input
                id="fullname"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="mt-1"
                placeholder="Abdullayev Ali"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                placeholder="+998901234567"
              />
            </div>
            <div>
              <Label htmlFor="bank_account">Bank hisob raqami</Label>
              <Input
                id="bank_account"
                value={bank_account}
                onChange={(e) => setBank_account(e.target.value)}
                className="mt-1"
                placeholder="8600 1234 5678 9012"
              />
            </div>
            <div>
              <Label htmlFor="note">Izoh</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
                placeholder="Qisqa izoh"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit">Saqlash</Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Bekor qilish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuppliersPage() {
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiGet<SuppliersRes>('/admin/suppliers?page=1&limit=100'),
  });

  const { data: debtData } = useQuery({
    queryKey: ['suppliers', 'debt-summary'],
    queryFn: () => apiGet<DebtSummaryRes>('/admin/suppliers/debt-summary'),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const debtSummary = debtData?.suppliers ?? [];

  const handleExportExcel = async () => {
    try {
      const wb = createWorkbook();
      if (debtSummary.length > 0) {
        addSheet(wb, 'Qarz xulosa', {
          headers: ['Taminotchi', 'Telefon', 'Xaridlar jami (so\'m)', 'To\'langan (so\'m)', 'Qarz (so\'m)'],
          rows: debtSummary.map((s) => [
            s.fullname,
            s.phone ?? '—',
            s.total_purchases,
            s.total_payments,
            s.debt,
          ]),
        });
      }
      if (items.length > 0) {
        addSheet(wb, 'Ro\'yxat', {
          headers: ['Ism-familiya', 'Telefon', 'Bank hisob', 'Izoh'],
          rows: items.map((s) => [
            s.fullname,
            s.phone ?? '—',
            s.bank_account ?? '—',
            s.note ?? '—',
          ]),
        });
      }
      const purchasesRes = await apiGet<{ purchases: { supplier_name: string; product_name: string; quantity: number; unit_cost: number; total: number; created_at: string }[] }>('/admin/suppliers/all-purchases');
      const purchases = purchasesRes?.purchases ?? [];
      if (purchases.length > 0) {
        addSheet(wb, 'Xaridlar batafsil', {
          headers: ['Taminotchi', 'Sana', 'Mahsulot nomi', 'Miqdor', 'Birlik narx (so\'m)', 'Jami (so\'m)'],
          rows: purchases.map((p) => [
            p.supplier_name,
            format(new Date(p.created_at), 'dd.MM.yyyy HH:mm'),
            p.product_name,
            p.quantity,
            p.unit_cost,
            p.total,
          ]),
          colWidths: [20, 18, 25, 10, 16, 14],
        });
      }
      if (wb.SheetNames.length === 0) {
        toast.error('Eksport qilish uchun ma\'lumot yo\'q');
        return;
      }
      const ts = format(new Date(), 'yyyy-MM-dd_HH-mm');
      downloadWorkbook(wb, `Taminotchilar_${ts}.xlsx`);
      toast.success('Excel fayl yuklandi');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-5 border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">
              Taminotchilar
            </h1>
            <p className="mt-0.5 text-[13px] text-[var(--text-3)]">
              Jami {total} ta taminotchi
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={items.length === 0 && debtSummary.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Excel yuklab olish
            </Button>
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Taminotchi qo‘shish
            </Button>
          </div>
        </div>
      </div>

      {/* Kimdan qancha qarz — diagramma */}
      {debtSummary.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-[var(--text-2)] mb-4">
              Kimdan qancha qarz
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={debtSummary.map((s) => ({
                    name: s.fullname.length > 12 ? s.fullname.slice(0, 10) + '…' : s.fullname,
                    fullname: s.fullname,
                    qarz: s.debt,
                  }))}
                  margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2 text-sm shadow">
                          <p className="font-medium">{d.fullname}</p>
                          <p className="text-[var(--text-3)]">
                            Qarz: {formatSom(d.qarz)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="qarz" radius={[4, 4, 0, 0]} name="Qarz">
                    {debtSummary.map((_, i) => (
                      <Cell
                        key={i}
                        fill={debtSummary[i].debt > 0 ? 'var(--destructive)' : 'var(--muted)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {debtSummary.every((s) => s.debt === 0) && (
              <p className="text-center text-sm text-[var(--text-3)] mt-2">
                Barcha taminotchilarda qarz yo‘q
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Qarz summary */}
      {debtSummary.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-[var(--text-2)] mb-3">
              Qarz xulosa
            </h2>
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Taminotchi</th>
                    <th>Telefon</th>
                    <th className="text-right">Xaridlar jami</th>
                    <th className="text-right">To‘langan</th>
                    <th className="text-right">Qarz</th>
                    <th className="text-right">0–30 kun</th>
                    <th className="text-right">31–60 kun</th>
                    <th className="text-right">61+ kun</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {debtSummary.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.fullname}</td>
                      <td className="text-[var(--text-3)]">{s.phone ?? '—'}</td>
                      <td className="text-right">{formatSom(s.total_purchases)}</td>
                      <td className="text-right">{formatSom(s.total_payments)}</td>
                      <td
                        className={`text-right font-medium ${
                          s.debt > 0 ? 'text-danger' : 'text-[var(--text-2)]'
                        }`}
                      >
                        {formatSom(s.debt)}
                      </td>
                      <td className="text-right text-[var(--text-3)]">
                        {s.age_0_30 ? formatSom(s.age_0_30) : '—'}
                      </td>
                      <td className="text-right text-[var(--text-3)]">
                        {s.age_31_60 ? formatSom(s.age_31_60) : '—'}
                      </td>
                      <td className="text-right text-[var(--text-3)]">
                        {s.age_61_plus ? formatSom(s.age_61_plus) : '—'}
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/suppliers/${s.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-3)]">
              Yuklanmoqda…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-3)]">
              <Truck className="h-12 w-12 mb-3 opacity-50" />
              <p>Taminotchilar yo‘q</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Birinchi taminotchini qo‘shing
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Ism-familiya</th>
                    <th>Telefon</th>
                    <th>Bank hisob</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.fullname}</td>
                      <td>{s.phone ?? '—'}</td>
                      <td className="text-[var(--text-3)]">
                        {s.bank_account ?? '—'}
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/suppliers/${s.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['suppliers'] })}
      />
    </div>
  );
}
