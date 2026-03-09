'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { StockInDialog } from '@/components/products/StockInDialog';
import { PriceHistoryDialog } from '@/components/products/PriceHistoryDialog';
import { toast } from 'sonner';

type Product = {
  id: string;
  name: string;
  cost_price: string;
  sale_price: string;
  stock_count: number;
  min_limit: number;
  is_low_stock?: boolean;
};
type ProductsRes = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};
type LowStockRes = {
  products: Product[];
  total_low_stock_count: number;
  page: number;
  limit: number;
};

type SortBy = 'name' | 'cost_price' | 'sale_price' | 'stock_count';
type SortOrder = 'asc' | 'desc';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [priceHistoryProduct, setPriceHistoryProduct] =
    useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, activeTab, sortBy, sortOrder],
    queryFn: (): Promise<ProductsRes | LowStockRes> =>
      activeTab === 'low'
        ? apiGet<LowStockRes>(
            `/admin/products/low-stock?page=${page}&limit=50`
          )
        : apiGet<ProductsRes>(
            `/admin/products?page=${page}&limit=50&sortBy=${sortBy}&sortOrder=${sortOrder}`
          ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/products/${id}`),
    onSuccess: () => {
      setDeleteProduct(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('O‘chirildi');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items =
    activeTab === 'low'
      ? data && 'products' in data
        ? data.products
        : []
      : data && 'items' in data
        ? data.items
        : [];
  const total =
    activeTab === 'low'
      ? data && 'total_low_stock_count' in data
        ? data.total_low_stock_count
        : 0
      : data && 'total' in data
        ? data.total
        : 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['products'] });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ombor (Zapchast)</h1>
        <Button onClick={() => setAddOpen(true)}>Qo‘shish</Button>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as 'all' | 'low');
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">Barchasi</TabsTrigger>
          <TabsTrigger value="low">Kam qolganlar</TabsTrigger>
        </TabsList>
        {activeTab === 'all' && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Saralash</span>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortBy)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nomi</SelectItem>
                  <SelectItem value="cost_price">Kelgan narx</SelectItem>
                  <SelectItem value="sale_price">Sotish narx</SelectItem>
                  <SelectItem value="stock_count">Mavjud soni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Tartib</span>
              <Select
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as SortOrder)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">O‘sish</SelectItem>
                  <SelectItem value="desc">Kamayish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left">Nomi</th>
                        <th className="p-3 text-right">Kelgan narx</th>
                        <th className="p-3 text-right">Sotish narx</th>
                        <th className="p-3 text-right">Mavjud soni</th>
                        <th className="p-3 text-right">Min limit</th>
                        <th className="p-3 text-left">Holat</th>
                        <th className="p-3 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="p-3">{p.name}</td>
                          <td className="p-3 text-right">
                            {Number(p.cost_price).toLocaleString('uz-UZ')}
                          </td>
                          <td className="p-3 text-right">
                            {Number(p.sale_price).toLocaleString('uz-UZ')}
                          </td>
                          <td className="p-3 text-right">
                            <Badge
                              variant={
                                (p.is_low_stock ?? p.stock_count <= p.min_limit)
                                  ? 'destructive'
                                  : 'default'
                              }
                              className={
                                (p.is_low_stock ?? p.stock_count <= p.min_limit)
                                  ? 'bg-destructive/90'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }
                            >
                              {p.stock_count}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">{p.min_limit}</td>
                          <td className="p-3">
                            {(p.is_low_stock ?? p.stock_count <= p.min_limit) ? (
                              <Badge variant="destructive">Kam</Badge>
                            ) : (
                              <Badge variant="secondary">Yaxshi</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStockInProduct(p)}
                              >
                                Kirim qo‘shish
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPriceHistoryProduct(p)}
                              >
                                Narx tarixi
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditProduct(p)}
                              >
                                Tahrirlash
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteProduct(p)}
                              >
                                O‘chirish
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between border-t px-4 py-2">
                    <span className="text-muted-foreground">Jami: {total}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Oldingi
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * 50 >= total}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Keyingi
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {addOpen && (
        <ProductFormDialog
          onSuccess={() => {
            setAddOpen(false);
            invalidate();
            toast.success('Qo‘shildi');
          }}
          onCancel={() => setAddOpen(false)}
        />
      )}
      {editProduct && (
        <ProductFormDialog
          product={editProduct}
          onSuccess={() => {
            setEditProduct(null);
            invalidate();
            toast.success('Saqlandi');
          }}
          onCancel={() => setEditProduct(null)}
        />
      )}
      {stockInProduct && (
        <StockInDialog
          productId={stockInProduct.id}
          productName={stockInProduct.name}
          onSuccess={() => {
            setStockInProduct(null);
            invalidate();
            toast.success('Kirim qo‘shildi');
          }}
          onCancel={() => setStockInProduct(null)}
        />
      )}
      {priceHistoryProduct && (
        <PriceHistoryDialog
          productId={priceHistoryProduct.id}
          productName={priceHistoryProduct.name}
          onCancel={() => setPriceHistoryProduct(null)}
        />
      )}

      <AlertDialog
        open={!!deleteProduct}
        onOpenChange={(o) => !o && setDeleteProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zapchastni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Ushbu zapchastni o‘chirishni tasdiqlaysizmi? Bu amalni qaytarib
              bo‘lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteProduct && deleteMutation.mutate(deleteProduct.id)
              }
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Kutilmoqda...' : 'O‘chirish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
