"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTelegram } from "@/hooks/useTelegram";
import {
  fetchWebAppInit,
  createOrder,
  getApiUrl,
  type WebAppInitResponse,
  type CreateOrderProductItem,
  type CreateOrderManualProductItem,
  type CreateOrderPayload,
} from "@/utils/api";

const MAX_INIT_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const screenStyle = {
  backgroundColor: "var(--tg-theme-bg-color, #1a1a1a)",
  color: "var(--tg-theme-text-color, #fff)",
};

const btnStyle = {
  backgroundColor: "var(--tg-theme-button-color, #2481cc)",
  color: "var(--tg-theme-button-text-color, #fff)",
};

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError && e.message === "Failed to fetch") return true;
  if (e instanceof Error && e.message.toLowerCase().includes("failed to fetch")) return true;
  return false;
}

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

export default function NewOrderPage() {
  const { initData } = useTelegram();
  const [init, setInit] = useState<WebAppInitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [isOrgVehicle, setIsOrgVehicle] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [products, setProducts] = useState<CreateOrderProductItem[]>([]);
  const [manualProducts, setManualProducts] = useState<CreateOrderManualProductItem[]>([]);
  const [deliveryNeeded, setDeliveryNeeded] = useState(false);
  const [carPhotoUrl, setCarPhotoUrl] = useState("");

  const vehiclesOfOrg = init?.vehicles.filter((v) => v.org_id === orgId) ?? [];

  const loadInit = useCallback(() => {
    setError(null);
    setLoading(true);

    const attempt = (retryCount: number): void => {
      fetchWebAppInit(initData)
        .then((data) => {
          setInit(data);
          setLoading(false);
        })
        .catch((e) => {
          if (isNetworkError(e) && retryCount < MAX_INIT_RETRIES) {
            setTimeout(() => attempt(retryCount + 1), RETRY_DELAY_MS);
            return;
          }
          if (isNetworkError(e)) {
            setError(
              `Backend ga ulanish xato. Tekshiring: NEXT_PUBLIC_API_URL (${getApiUrl("")}), tarmoq va CORS.`
            );
          } else {
            setError(getErrorMessage(e, "Init xato"));
          }
          setLoading(false);
        });
    };

    attempt(0);
  }, [initData]);

  useEffect(() => {
    loadInit();
  }, [loadInit]);

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const addProduct = useCallback((productId: string, quantity: number) => {
    setProducts((prev) => {
      const rest = prev.filter((p) => p.product_id !== productId);
      if (quantity <= 0) return rest;
      return [...rest, { product_id: productId, quantity }];
    });
  }, []);

  const addManualProduct = useCallback(
    (name: string, price: number, quantity: number) => {
      if (!name.trim() || price <= 0 || quantity <= 0) return;
      setManualProducts((prev) => [
        ...prev,
        { name: name.trim(), price, quantity },
      ]);
    },
    []
  );

  const removeManualProduct = useCallback((index: number) => {
    setManualProducts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const name = clientName.trim();
      const phone = clientPhone.trim();
      const carNum = carNumber.trim();
      if (!name || !phone || !carNum) {
        setError("Mijoz ismi, telefoni va mashina raqami majburiy.");
        return;
      }

      const hasServices = selectedServiceIds.length > 0;
      const hasProducts = products.length > 0;
      const hasManual = manualProducts.length > 0;
      if (!hasServices && !hasProducts && !hasManual) {
        setError("Kamida bitta xizmat, zapchast yoki qo'lda zapchast tanlang.");
        return;
      }

      const payload: CreateOrderPayload = {
        client_name: name,
        client_phone: phone,
        car_number: carNum,
        car_model: carModel.trim() || undefined,
        car_photo_url: carPhotoUrl.trim() || undefined,
        organization_id: isOrgVehicle && orgId ? orgId : undefined,
        vehicle_id: isOrgVehicle && vehicleId ? vehicleId : undefined,
        delivery_needed: deliveryNeeded,
        service_ids: hasServices ? selectedServiceIds : undefined,
        products: hasProducts ? products : undefined,
        manual_products: hasManual ? manualProducts : undefined,
      };

      setSubmitLoading(true);
      try {
        await createOrder(payload, initData);
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.close) {
          window.Telegram.WebApp.close();
        } else {
          window.location.href = "/";
        }
      } catch (err) {
        if (isNetworkError(err)) {
          setError(
            "Backend ga ulanish xato. NEXT_PUBLIC_API_URL va tarmoqni tekshiring."
          );
        } else {
          setError(getErrorMessage(err, "Saqlash xato"));
        }
      } finally {
        setSubmitLoading(false);
      }
    },
    [
      clientName,
      clientPhone,
      carNumber,
      carModel,
      carPhotoUrl,
      isOrgVehicle,
      orgId,
      vehicleId,
      deliveryNeeded,
      selectedServiceIds,
      products,
      manualProducts,
      initData,
    ]
  );

  if (loading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
        style={screenStyle}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#2481cc)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm opacity-90">Ma'lumotlar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24" style={screenStyle}>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={btnStyle}
        >
          ← Orqaga
        </Link>
        <h1 className="text-lg font-semibold">Yangi buyurtma</h1>
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400"
        >
          {error}
          {!init && (
            <button
              type="button"
              onClick={loadInit}
              className="ml-2 underline focus:outline-none"
            >
              Qayta urinish
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.1 Mijoz ma&apos;lumotlari
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Mijoz ismi/familiya *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
              required
            />
            <input
              type="tel"
              placeholder="Telefon *"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
              required
            />
            <input
              type="text"
              placeholder="Mashina raqami *"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
              required
            />
            <input
              type="text"
              placeholder="Mashina modeli (ixtiyoriy)"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.2 Tashkilot mashinasi
          </h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isOrgVehicle}
              onChange={(e) => {
                setIsOrgVehicle(e.target.checked);
                if (!e.target.checked) {
                  setOrgId("");
                  setVehicleId("");
                }
              }}
              className="h-5 w-5 rounded"
            />
            <span>Tashkilot mashinasi</span>
          </label>
          {isOrgVehicle && (
            <div className="mt-3 space-y-3">
              <select
                value={orgId}
                onChange={(e) => {
                  setOrgId(e.target.value);
                  setVehicleId("");
                }}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
              >
                <option value="">Tashkilotni tanlang</option>
                {init?.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                disabled={!orgId}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)] disabled:opacity-50"
              >
                <option value="">Mashinani tanlang</option>
                {vehiclesOfOrg.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} {v.model ? `— ${v.model}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.3 Xizmatlar
          </h2>
          <div className="space-y-2">
            {init?.services?.map((s) => (
              <label key={s.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedServiceIds.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                  className="h-5 w-5 rounded"
                />
                <span>
                  {s.name} — {s.price.toLocaleString()} so&apos;m
                </span>
              </label>
            ))}
            {init?.services?.length === 0 && (
              <p className="text-sm opacity-70">Xizmatlar ro&apos;yxati bo&apos;sh</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.4 Zapchastlar (ombor)
          </h2>
          <div className="space-y-2">
            {init?.products?.map((p) => (
              <ProductRow
                key={p.id}
                name={p.name}
                salePrice={p.sale_price}
                stockCount={p.stock_count}
                quantity={products.find((x) => x.product_id === p.id)?.quantity ?? 0}
                onQuantityChange={(q) => addProduct(p.id, q)}
              />
            ))}
            {init?.products?.length === 0 && (
              <p className="text-sm opacity-70">Omborda mahsulot yo&apos;q</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.4 Qo&apos;lda zapchast
          </h2>
          <ManualProductForm onAdd={addManualProduct} />
          <ul className="mt-2 space-y-1">
            {manualProducts.map((mp, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
              >
                <span>
                  {mp.name} × {mp.quantity} — {mp.price * mp.quantity} so&apos;m
                </span>
                <button
                  type="button"
                  onClick={() => removeManualProduct(i)}
                  className="text-red-400"
                >
                  O&apos;chirish
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.5 Mashina rasmi
          </h2>
          <input
            type="url"
            placeholder="Rasm URL (keyincha kamera qo&#39;shiladi)"
            value={carPhotoUrl}
            onChange={(e) => setCarPhotoUrl(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium opacity-80">
            6.2.6 Dostavka
          </h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={deliveryNeeded}
              onChange={(e) => setDeliveryNeeded(e.target.checked)}
              className="h-5 w-5 rounded"
            />
            <span>Dostavka kerak</span>
          </label>
        </section>

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full rounded-2xl py-4 text-lg font-medium disabled:opacity-70"
          style={btnStyle}
        >
          {submitLoading ? "Saqlanmoqda..." : "6.2.7 Saqlash"}
        </button>
      </form>
    </div>
  );
}

function ProductRow({
  name,
  salePrice,
  stockCount,
  quantity,
  onQuantityChange,
}: {
  name: string;
  salePrice: number;
  stockCount: number;
  quantity: number;
  onQuantityChange: (q: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
      <span className="text-sm">
        {name} — {salePrice.toLocaleString()} so&apos;m (qoldiq: {stockCount})
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onQuantityChange(quantity - 1)}
          className="h-8 w-8 rounded-lg bg-white/10 text-lg leading-none"
        >
          −
        </button>
        <span className="min-w-[1.5rem] text-center">{quantity}</span>
        <button
          type="button"
          onClick={() => onQuantityChange(quantity + 1)}
          className="h-8 w-8 rounded-lg bg-white/10 text-lg leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ManualProductForm({
  onAdd,
}: {
  onAdd: (name: string, price: number, quantity: number) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  const handleAdd = () => {
    const p = parseFloat(price);
    const q = parseInt(qty, 10);
    if (name.trim() && !Number.isNaN(p) && p > 0 && !Number.isNaN(q) && q >= 1) {
      onAdd(name, p, q);
      setName("");
      setPrice("");
      setQty("1");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        placeholder="Nomi"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-[120px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none"
      />
      <input
        type="number"
        placeholder="Narx"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        min={1}
        className="w-24 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none"
      />
      <input
        type="number"
        placeholder="Soni"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        min={1}
        className="w-16 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-lg px-3 py-2 text-sm font-medium"
        style={btnStyle}
      >
        Qo&apos;shish
      </button>
    </div>
  );
}
