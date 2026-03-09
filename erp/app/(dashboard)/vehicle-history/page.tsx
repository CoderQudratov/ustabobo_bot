'use client';

import { useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVehicleHistory } from '@/hooks/useVehicleHistory';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatSom } from '@/lib/dashboard';
import { orderStatusLabel, type OrderStatus } from '@/lib/types';
import type { VehicleHistoryOrder, VehicleHistoryOrderItem } from '@/lib/vehicleHistory';
import { Search, Printer, Car, Wrench } from 'lucide-react';

const RECENT_KEY = 'vehicle_history_recent';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(plate: string) {
  const normalized = plate.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!normalized) return;
  const recent = getRecentSearches().filter((p) => p !== normalized);
  recent.unshift(normalized);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function statusVariant(status: OrderStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

function getServiceName(order: VehicleHistoryOrder): string {
  const svc = order.orderItems.find((i) => i.service?.name);
  return svc?.service?.name ?? '—';
}

function getParts(order: VehicleHistoryOrder): VehicleHistoryOrderItem[] {
  return order.orderItems.filter(
    (i) => i.product?.name || i.item_type === 'manual_product' || i.item_name
  );
}

function PartsCell({ order }: { order: VehicleHistoryOrder }) {
  const parts = getParts(order);
  if (parts.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.slice(0, 3).map((p) => (
        <Badge key={p.id} variant="outline" className="text-xs">
          {p.product?.name ?? p.item_name ?? p.item_type}
          {p.quantity > 1 ? ` ×${p.quantity}` : ''}
        </Badge>
      ))}
      {parts.length > 3 && (
        <Badge variant="secondary" className="text-xs">
          +{parts.length - 3}
        </Badge>
      )}
    </div>
  );
}

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plateParam = searchParams.get('plate');
  const vehicleIdParam = searchParams.get('vehicle_id');
  const initialPlate = plateParam ?? vehicleIdParam ?? '';
  const [plateInput, setPlateInput] = useState(initialPlate);
  const [plate, setPlate] = useState(initialPlate);
  const [page, setPage] = useState(1);


  const recent = typeof window !== 'undefined' ? getRecentSearches() : [];

  const handleSearch = useCallback(() => {
    const p = plateInput.trim();
    if (!p) return;
    const normalized = p.toUpperCase().replace(/\s+/g, ' ');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);
    setPlate(isUuid ? p : normalized);
    setPage(1);
    if (!isUuid) {
      addRecentSearch(normalized);
      router.replace(`/vehicle-history?plate=${encodeURIComponent(normalized)}`, { scroll: false });
    }
  }, [plateInput, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const { data, isLoading, isError, error } = useVehicleHistory(plate, page);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold">Mashina tarixi</h1>
      </div>

      {/* Qidiruv paneli */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="plate">Davlat raqami</Label>
              <div className="flex gap-2">
                <Input
                  id="plate"
                  placeholder="30A123BB"
                  value={plateInput}
                  onChange={(e) => setPlateInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="font-mono uppercase"
                />
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Qidirish
                </Button>
              </div>
            </div>
          </div>
          {recent.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">So&apos;nggi:</span>
              {recent.map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlateInput(p);
                    setPlate(p);
                    setPage(1);
                  }}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!plate && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Davlat raqamini kiriting va qidirish tugmasini bosing
          </CardContent>
        </Card>
      )}

      {plate && isError && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error instanceof Error ? error.message : 'Xatolik yuz berdi'}
          </CardContent>
        </Card>
      )}

      {plate && isLoading && (
        <Skeleton className="h-96 w-full" />
      )}

      {plate && data && (
        <>
          {/* Print header — faqat chop etishda ko'rinadi */}
          <div className="hidden print:block mb-6 pb-4 border-b">
            <div className="h-12 w-32 border border-dashed rounded mb-4 bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
              Logotip
            </div>
            <h2 className="text-lg font-bold">Mashina servis hisob-varaqi</h2>
            <p className="text-sm text-muted-foreground">
              {data.vehicle.plate_number} — {data.vehicle.model} | Egasi: {data.vehicle.organization ?? 'Jismoniy shaxs'}
            </p>
            <p className="text-sm font-medium mt-2">
              Jami: {data.stats.total_services} servis, {formatSom(data.stats.total_spent)}
            </p>
          </div>

          {/* Statistika kartalari */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jami servislar</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.total_services}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eng ko&apos;p xizmat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium truncate">
                  {data.stats.most_used_service ?? '—'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jami sarflangan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatSom(data.stats.total_spent)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oxirgi servis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {data.stats.last_service_date
                    ? format(new Date(data.stats.last_service_date), 'dd.MM.yyyy')
                    : '—'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mashina profili */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Mashina profili
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Mashina</p>
                <p className="font-medium">
                  {data.vehicle.model} — {data.vehicle.plate_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Egasi</p>
                <p className="font-medium">{data.vehicle.organization ?? 'Jismoniy shaxs'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statistika</p>
                <p className="text-sm">
                  {data.stats.total_services} servis, {formatSom(data.stats.total_spent)},{' '}
                  oxirgi: {data.stats.last_service_date
                    ? format(new Date(data.stats.last_service_date), 'dd.MM.yyyy')
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Servis tarixi jadvali */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Servis tarixi</CardTitle>
              <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                <Printer className="mr-2 h-4 w-4" />
                Hisob-varaqni chop etish
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead>Xizmat</TableHead>
                      <TableHead>Usta</TableHead>
                      <TableHead>Zapchastlar</TableHead>
                      <TableHead className="text-right">Summa</TableHead>
                      <TableHead>Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(o.created_at), 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{getServiceName(o)}</TableCell>
                        <TableCell>{o.master?.fullname ?? '—'}</TableCell>
                        <TableCell>
                          <PartsCell order={o} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(o.total_amount).toLocaleString('uz-UZ')} so&apos;m
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(o.status)}>
                            {orderStatusLabel(o.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data.orders.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">Servis yo&apos;q</p>
              )}

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between print:hidden">
                  <p className="text-sm text-muted-foreground">
                    Jami {data.total} ta buyurtma
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Oldingi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Keyingi
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function VehicleHistoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Content />
    </Suspense>
  );
}
