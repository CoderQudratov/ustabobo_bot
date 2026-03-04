'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { useQueryClient } from '@tanstack/react-query';
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
type ProductsRes = { items: Product[]; total: number; page: number; limit: number };
type LowStockRes = { products: Product[]; total_low_stock_count: number; page: number; limit: number };

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, activeTab],
    queryFn: (): Promise<ProductsRes | LowStockRes> =>
      activeTab === 'low'
        ? apiGet<LowStockRes>(`/admin/products/low-stock?page=${page}&limit=50`)
        : apiGet<ProductsRes>(`/admin/products?page=${page}&limit=50`),
  });

  const items = activeTab === 'low' ? (data && 'products' in data ? data.products : []) : (data && 'items' in data ? data.items : []);
  const total = activeTab === 'low' ? (data && 'total_low_stock_count' in data ? data.total_low_stock_count : 0) : (data && 'total' in data ? data.total : 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ombor (Zapchast)</h1>
        <Button onClick={() => setAddOpen(true)}>Qo‘shish</Button>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'all' | 'low'); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">Barchasi</TabsTrigger>
          <TabsTrigger value="low">Kam qolganlar</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? <Skeleton className="h-64 w-full" /> : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left">Nomi</th>
                        <th className="p-3 text-right">Kelgan narx</th>
                        <th className="p-3 text-right">Sotish narx</th>
                        <th className="p-3 text-right">Qoldiq</th>
                        <th className="p-3 text-right">Min limit</th>
                        <th className="p-3 text-left">Holat</th>
                        <th className="p-3 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="p-3">{p.name}</td>
                          <td className="p-3 text-right">{Number(p.cost_price).toLocaleString('uz-UZ')}</td>
                          <td className="p-3 text-right">{Number(p.sale_price).toLocaleString('uz-UZ')}</td>
                          <td className="p-3 text-right">{p.stock_count}</td>
                          <td className="p-3 text-right">{p.min_limit}</td>
                          <td className="p-3">
                            {(p.is_low_stock ?? p.stock_count <= p.min_limit) ? <Badge variant="destructive">Kam</Badge> : <Badge variant="secondary">Yaxshi</Badge>}
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditProduct(p)}>Tahrirlash</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between border-t px-4 py-2">
                    <span className="text-muted-foreground">Jami: {total}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
                      <Button variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
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
          onSuccess={() => { setAddOpen(false); queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Qo‘shildi'); }}
          onCancel={() => setAddOpen(false)}
        />
      )}
      {editProduct && (
        <ProductFormDialog
          product={editProduct}
          onSuccess={() => { setEditProduct(null); queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Saqlandi'); }}
          onCancel={() => setEditProduct(null)}
        />
      )}
    </div>
  );
}
