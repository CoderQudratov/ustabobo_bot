"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useTelegram } from "@/hooks/useTelegram";
import { isTelegramWebApp } from "@/utils/telegram-env";
import { TelegramRequired } from "@/components/TelegramRequired";
import {
  fetchWebAppInit,
  fetchWebappServices,
  fetchWebappProducts,
  fetchWebappOrgVehicles,
  createWebappVehicle,
  createOrder,
  uploadCarPhoto,
  getApiUrl,
  type WebAppInitResponse,
  type CreateOrderProductItem,
  type CreateOrderManualProductItem,
  type CreateOrderPayload,
  type WebAppServiceItem,
  type WebAppProductItem,
  type WebAppVehicleItem,
} from "@/utils/api";

const DEBOUNCE_MS = 300;

const MAX_INIT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const btnStyle = {
  backgroundColor: "var(--primary)",
  color: "#fff",
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
  const { isReady } = useTelegram();
  const router = useRouter();
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
  const [orgVehicles, setOrgVehicles] = useState<WebAppVehicleItem[]>([]);
  const [orgVehiclesLoading, setOrgVehiclesLoading] = useState(false);
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleModel, setNewVehicleModel] = useState("");
  const [newVehicleYear, setNewVehicleYear] = useState("");
  const [newVehicleColor, setNewVehicleColor] = useState("");
  const [newVehicleSubmitting, setNewVehicleSubmitting] = useState(false);
  const [newVehicleError, setNewVehicleError] = useState("");
  const [showConfirmScreen, setShowConfirmScreen] = useState(false);
  type SelectedService = { id: string; name: string; price: number; quantity: number };
  type SelectedProduct = { product_id: string; quantity: number; name: string; sale_price: number };
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [manualProducts, setManualProducts] = useState<CreateOrderManualProductItem[]>([]);
  const [deliveryNeeded, setDeliveryNeeded] = useState(false);
  const [carPhotoUrl, setCarPhotoUrl] = useState("");
  const [carPhotoPreview, setCarPhotoPreview] = useState<string | null>(null);
  const [carPhotoUploading, setCarPhotoUploading] = useState(false);

  useEffect(() => {
    if (!orgId || !isOrgVehicle) {
      setOrgVehicles([]);
      return;
    }
    setOrgVehiclesLoading(true);
    fetchWebappOrgVehicles(orgId)
      .then(setOrgVehicles)
      .catch(() => setOrgVehicles([]))
      .finally(() => setOrgVehiclesLoading(false));
  }, [orgId, isOrgVehicle]);

  const selectedVehicle = orgVehicles.find((v) => v.id === vehicleId);
  const isCarFieldsDisabled = Boolean(isOrgVehicle && vehicleId && selectedVehicle);

  const orderTotal = useMemo(
    () =>
      selectedServices.reduce((a, s) => a + s.price * s.quantity, 0) +
      selectedProducts.reduce((a, p) => a + p.sale_price * p.quantity, 0) +
      manualProducts.reduce((a, m) => a + m.price * m.quantity, 0),
    [selectedServices, selectedProducts, manualProducts]
  );
  const orgName = init?.organizations?.find((o) => o.id === orgId)?.name ?? "";

  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceResults, setServiceResults] = useState<WebAppServiceItem[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const serviceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<WebAppProductItem[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (serviceDropdownRef.current?.contains(t) === false) setServiceDropdownOpen(false);
      if (productDropdownRef.current?.contains(t) === false) setProductDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadInit = useCallback(() => {
    setError(null);
    setLoading(true);

    const attempt = (retryCount: number): void => {
      fetchWebAppInit()
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
              `Backend ga ulanish xato. API: ${getApiUrl("")}. Tekshiring: tunnel ishlayaptimi, .env da NEXT_PUBLIC_API_URL to'g'rimi.`
            );
          } else {
            setError(getErrorMessage(e, "Init xato"));
          }
          setLoading(false);
        });
    };

    attempt(0);
  }, []);

  useEffect(() => {
    if (!isReady || !isTelegramWebApp()) return;
    loadInit();
  }, [isReady, loadInit]);

  useEffect(() => {
    if (serviceDebounceRef.current) clearTimeout(serviceDebounceRef.current);
    if (!serviceDropdownOpen) return;
    serviceDebounceRef.current = setTimeout(() => {
      setServiceLoading(true);
      const q = serviceQuery.trim();
      fetchWebappServices(q ? { search: q, limit: 5 } : { sortBy: "usage", limit: 3 })
        .then(setServiceResults)
        .catch(() => setServiceResults([]))
        .finally(() => setServiceLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (serviceDebounceRef.current) clearTimeout(serviceDebounceRef.current);
    };
  }, [serviceQuery, serviceDropdownOpen]);

  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    if (!productDropdownOpen) return;
    productDebounceRef.current = setTimeout(() => {
      setProductLoading(true);
      const q = productQuery.trim();
      fetchWebappProducts(q ? { search: q, limit: 5 } : { sortBy: "usage", limit: 3 })
        .then(setProductResults)
        .catch(() => setProductResults([]))
        .finally(() => setProductLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productQuery, productDropdownOpen]);

  const addService = useCallback((s: WebAppServiceItem) => {
    setSelectedServices((prev) => {
      const i = prev.findIndex((x) => x.id === s.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { id: s.id, name: s.name, price: s.price, quantity: 1 }];
    });
    setServiceQuery("");
    setServiceDropdownOpen(false);
  }, []);

  const removeService = useCallback((index: number) => {
    setSelectedServices((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addProduct = useCallback((p: WebAppProductItem, quantity: number) => {
    const qty = Math.max(1, quantity);
    setSelectedProducts((prev) => {
      const i = prev.findIndex((x) => x.product_id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [...prev, { product_id: p.id, quantity: qty, name: p.name, sale_price: p.sale_price }];
    });
    setProductQuery("");
    setProductDropdownOpen(false);
  }, []);

  const removeProduct = useCallback((index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateProductQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, quantity } : p))
    );
  }, []);

  const productsPayload: CreateOrderProductItem[] = useMemo(
    () => selectedProducts.map((p) => ({ product_id: p.product_id, quantity: p.quantity })),
    [selectedProducts]
  );

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

  const handleContinue = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const name = clientName.trim();
      const phone = clientPhone.trim();
      const carNum = carNumber.trim();
      if (!name || !phone || !carNum) {
        setError("Mijoz ismi, telefoni va mashina raqami majburiy.");
        return;
      }
      const hasServices = selectedServices.length > 0;
      const hasProducts = selectedProducts.length > 0;
      const hasManual = manualProducts.length > 0;
      if (!hasServices && !hasProducts && !hasManual) {
        setError("Kamida bitta xizmat, zapchast yoki qo'lda zapchast tanlang.");
        return;
      }
      setShowConfirmScreen(true);
    },
    [clientName, clientPhone, carNumber, selectedServices, selectedProducts, manualProducts]
  );

  const handleConfirmSubmit = useCallback(async () => {
    setError(null);
    const name = clientName.trim();
    const phone = clientPhone.trim();
    const carNum = carNumber.trim();
    const hasServices = selectedServices.length > 0;
    const hasProducts = selectedProducts.length > 0;
    const hasManual = manualProducts.length > 0;
    const service_ids = hasServices
      ? selectedServices.flatMap((s) => Array(s.quantity).fill(s.id))
      : undefined;
    const payload: CreateOrderPayload = {
      client_name: name,
      client_phone: phone,
      car_number: carNum,
      car_model: carModel.trim() || undefined,
      car_photo_url: carPhotoUrl.trim() || undefined,
      organization_id: isOrgVehicle && orgId ? orgId : undefined,
      vehicle_id: isOrgVehicle && vehicleId ? vehicleId : undefined,
      delivery_needed: deliveryNeeded,
      service_ids,
      products: hasProducts ? productsPayload : undefined,
      manual_products: hasManual ? manualProducts : undefined,
    };
    setSubmitLoading(true);
    try {
      await createOrder(payload);
      setClientName("");
      setClientPhone("");
      setCarNumber("");
      setCarModel("");
      setIsOrgVehicle(false);
      setOrgId("");
      setVehicleId("");
      setSelectedServices([]);
      setSelectedProducts([]);
      setManualProducts([]);
      setDeliveryNeeded(false);
      setCarPhotoUrl("");
      setServiceQuery("");
      setProductQuery("");
      setServiceDropdownOpen(false);
      setProductDropdownOpen(false);
      setShowConfirmScreen(false);
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert("✅ Buyurtma yaratildi!");
      }
      router.push("/orders/active");
    } catch (err) {
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert("❌ Xato yuz berdi. Qayta urinib ko'ring.");
      }
      setError(getErrorMessage(err, "Saqlash xato"));
    } finally {
      setSubmitLoading(false);
    }
  }, [
    router,
    clientName,
    clientPhone,
    carNumber,
    carModel,
    carPhotoUrl,
    isOrgVehicle,
    orgId,
    vehicleId,
    deliveryNeeded,
    selectedServices,
    selectedProducts,
    productsPayload,
    manualProducts,
  ]);

  if (!isTelegramWebApp()) {
    return <TelegramRequired />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 bg-[var(--bg)]">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-[var(--text-2)]">Ma&apos;lumotlar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PageHeader title="Yangi buyurtma" backHref="/" />

      <div className="p-4 space-y-6">
        {error && (
          <div className="mb-2 rounded-xl border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-4 py-2 text-sm text-[var(--danger)]">
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

        <form onSubmit={handleContinue} className="space-y-6">
          {/* 6.2.1 Mijoz ma'lumotlari + mashina */}
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
                className="input-webapp"
                required
              />
              <input
                type="tel"
                placeholder="Telefon *"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="input-webapp"
                required
              />
              <input
                type="text"
                placeholder="Mashina raqami *"
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value)}
                disabled={isCarFieldsDisabled}
                className="input-webapp"
                required
              />
              <input
                type="text"
                placeholder="Mashina modeli (ixtiyoriy)"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                disabled={isCarFieldsDisabled}
                className="input-webapp"
              />
            </div>
          </section>

          {/* 6.2.2 Tashkilot mashinasi */}
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
                    setCarNumber("");
                    setCarModel("");
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
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__new__") {
                      setVehicleId("");
                      setNewVehiclePlate("");
                      setNewVehicleModel("");
                      setNewVehicleYear("");
                      setNewVehicleColor("");
                      setNewVehicleError("");
                      setAddVehicleModalOpen(true);
                    } else if (val === "") {
                      setVehicleId("");
                      setCarNumber("");
                      setCarModel("");
                    } else {
                      setVehicleId(val);
                      const v = orgVehicles.find((x) => x.id === val);
                      if (v) {
                        setCarNumber(v.plate_number);
                        setCarModel(v.model || "");
                      }
                    }
                  }}
                  disabled={!orgId || orgVehiclesLoading}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)] disabled:opacity-50"
                >
                  <option value="">Mashinani tanlang</option>
                  {orgVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚗 {v.plate_number} — {v.model || "—"}
                    </option>
                  ))}
                  {orgId && (
                    <option value="__new__">➕ Yangi mashina qo&apos;sh</option>
                  )}
                </select>
              </div>
            )}
          </section>

          {/* 6.2.3 Xizmatlar */}
          <section>
            <h2 className="mb-3 text-sm font-medium opacity-80">
              6.2.3 Xizmatlar
            </h2>
            <div ref={serviceDropdownRef} className="relative space-y-2">
              <input
                type="text"
                placeholder="🔍 Xizmat qidiring..."
                value={serviceQuery}
                onChange={(e) => {
                  setServiceQuery(e.target.value);
                  setServiceDropdownOpen(true);
                }}
                onFocus={() => setServiceDropdownOpen(true)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
              />
              {serviceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-white/20 bg-[var(--tg-theme-bg-color,#1a1a1a)] shadow-xl">
                  {serviceLoading ? (
                    <div className="p-3 text-center text-sm opacity-70">Yuklanmoqda...</div>
                  ) : (
                    serviceResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addService(s)}
                        className="flex w-full flex-col gap-0.5 border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/10"
                      >
                        <span className="font-medium">🔧 {s.name}</span>
                        <span className="text-sm opacity-80">{s.price.toLocaleString()} so&apos;m</span>
                      </button>
                    ))
                  )}
                  {!serviceLoading && serviceResults.length === 0 && (
                    <div className="p-3 text-sm opacity-70">Hech narsa topilmadi</div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 6.2.4 Zapchastlar (ombor) */}
          <section>
            <h2 className="mb-3 text-sm font-medium opacity-80">
              6.2.4 Zapchastlar (ombor)
            </h2>
            <div ref={productDropdownRef} className="relative space-y-2">
              <input
                type="text"
                placeholder="🔍 Zapchast qidiring..."
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setProductDropdownOpen(true);
                }}
                onFocus={() => setProductDropdownOpen(true)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
              />
              {productDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-white/20 bg-[var(--tg-theme-bg-color,#1a1a1a)] shadow-xl">
                  {productLoading ? (
                    <div className="p-3 text-center text-sm opacity-70">Yuklanmoqda...</div>
                  ) : (
                    productResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p, 1)}
                        className="flex w-full flex-col gap-0.5 border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/10"
                      >
                        <span className="font-medium">📦 {p.name}</span>
                        <span className="text-sm opacity-80">
                          {p.sale_price.toLocaleString()} so&apos;m | {p.stock_count} ta
                        </span>
                      </button>
                    ))
                  )}
                  {!productLoading && productResults.length === 0 && (
                    <div className="p-3 text-sm opacity-70">Hech narsa topilmadi</div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 6.2.4 Qo'lda zapchast */}
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
                    {mp.name} × {mp.quantity} — {(mp.price * mp.quantity).toLocaleString()} so&apos;m
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

          {/* Tanlangan narsalar + Jami */}
          <section className="rounded-xl border border-white/20 bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-medium opacity-80">
              Tanlangan narsalar
            </h2>
            <div className="space-y-2">
              {selectedServices.map((s, i) => (
                <div
                  key={`s-${s.id}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  <span>
                    🔧 {s.name}
                    {s.quantity > 1 ? ` × ${s.quantity}` : ""} — {(s.price * s.quantity).toLocaleString()} so&apos;m
                  </span>
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="shrink-0 text-red-400 hover:underline"
                    aria-label="O'chirish"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedProducts.map((p, i) => (
                <div
                  key={`p-${p.product_id}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  <span>
                    📦 {p.name} × {p.quantity} — {(p.sale_price * p.quantity).toLocaleString()} so&apos;m
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateProductQuantity(i, p.quantity - 1)}
                        className="h-7 w-7 rounded bg-white/10 text-lg leading-none"
                      >
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center">{p.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateProductQuantity(i, p.quantity + 1)}
                        className="h-7 w-7 rounded bg-white/10 text-lg leading-none"
                      >
                        +
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProduct(i)}
                      className="shrink-0 text-red-400 hover:underline"
                      aria-label="O'chirish"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {manualProducts.map((mp, i) => (
                <div
                  key={`m-${i}`}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm opacity-90"
                >
                  <span>
                    {mp.name} × {mp.quantity} — {(mp.price * mp.quantity).toLocaleString()} so&apos;m
                  </span>
                </div>
              ))}
            </div>
            {((selectedServices.length + selectedProducts.length + manualProducts.length) > 0) && (
              <p className="mt-3 border-t border-white/10 pt-3 text-base font-semibold">
                💰 Jami:{" "}
                {(
                  selectedServices.reduce((a, s) => a + s.price * s.quantity, 0) +
                  selectedProducts.reduce((a, p) => a + p.sale_price * p.quantity, 0) +
                  manualProducts.reduce((a, m) => a + m.price * m.quantity, 0)
                ).toLocaleString()}{" "}
                so&apos;m
              </p>
            )}
          </section>

          {/* 6.2.5 Mashina rasmi */}
          <section>
            <h2 className="mb-3 text-sm font-medium opacity-80">
              6.2.5 Mashina rasmi
            </h2>
            <input
              id="car-photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={carPhotoUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const prevUrl = carPhotoPreview;
                setCarPhotoPreview(URL.createObjectURL(file));
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                setCarPhotoUploading(true);
                try {
                  const { url } = await uploadCarPhoto(file);
                  setCarPhotoUrl(url);
                } catch (err) {
                  const msg = getErrorMessage(err, "Rasm yuklanmadi");
                  if (typeof window !== "undefined" && window.Telegram?.WebApp?.showAlert) {
                    window.Telegram.WebApp.showAlert(msg);
                  }
                  setCarPhotoUrl("");
                  setCarPhotoPreview(null);
                } finally {
                  setCarPhotoUploading(false);
                  e.target.value = "";
                }
              }}
            />
            <label
              htmlFor="car-photo-input"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus-within:border-[var(--tg-theme-button-color)] disabled:pointer-events-none disabled:opacity-50"
              style={carPhotoUploading ? { pointerEvents: "none" } : undefined}
            >
              {carPhotoUploading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color)] border-t-transparent" />
                  Uploading...
                </>
              ) : (
                "📸 Mashina rasmini olish"
              )}
            </label>
            {(carPhotoPreview || carPhotoUrl) && !carPhotoUploading && (
              <div className="mt-3">
                <img
                  src={carPhotoPreview || carPhotoUrl}
                  alt="Mashina rasm"
                  className="max-h-48 w-full rounded-xl object-contain bg-white/5"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCarPhotoUrl("");
                    if (carPhotoPreview) {
                      URL.revokeObjectURL(carPhotoPreview);
                      setCarPhotoPreview(null);
                    }
                  }}
                  className="mt-2 text-sm text-red-400 underline"
                >
                  O‘chirish
                </button>
              </div>
            )}
          </section>

          {/* 6.2.6 Dostavka */}
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
            className="btn-primary"
          >
            Davom etish
          </button>
        </form>

        {/* Tasdiqlash ekrani */}
        {showConfirmScreen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden text-[var(--text)]">
              <div className="border-b border-white/10 px-5 py-4 text-center">
                <h2 className="text-lg font-semibold">📋 Buyurtmani tasdiqlang</h2>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <p className="text-sm font-medium opacity-80 mb-1">👤 Mijoz</p>
                  <p className="text-sm pl-4">{clientName.trim()} — {clientPhone.trim()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium opacity-80 mb-1">🚗 Mashina</p>
                  <p className="text-sm pl-4">{carNumber.trim()} — {carModel.trim() || "—"}</p>
                  {isOrgVehicle && orgName && (
                    <p className="text-sm pl-4 opacity-80">Tashkilot: {orgName}</p>
                  )}
                </div>
                {selectedServices.length > 0 && (
                  <div>
                    <p className="text-sm font-medium opacity-80 mb-1">🔧 Xizmatlar</p>
                    <ul className="space-y-0.5 pl-4">
                      {selectedServices.map((s, i) => (
                        <li key={`${s.id}-${i}`} className="text-sm">
                          {s.name} {(s.price * s.quantity).toLocaleString()} so&apos;m
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedProducts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium opacity-80 mb-1">📦 Zapchastlar</p>
                    <ul className="space-y-0.5 pl-4">
                      {selectedProducts.map((p, i) => (
                        <li key={`${p.product_id}-${i}`} className="text-sm">
                          {p.name} × {p.quantity} {(p.sale_price * p.quantity).toLocaleString()} so&apos;m
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {manualProducts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium opacity-80 mb-1">Qo&apos;lda zapchast</p>
                    <ul className="space-y-0.5 pl-4">
                      {manualProducts.map((mp, i) => (
                        <li key={i} className="text-sm">
                          {mp.name} × {mp.quantity} {(mp.price * mp.quantity).toLocaleString()} so&apos;m
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3">
                  <p className="text-base font-semibold">💰 JAMI: {orderTotal.toLocaleString()} so&apos;m</p>
                </div>
              </div>
              <div className="flex gap-3 px-5 py-4 border-t border-white/10">
                <button
                  type="button"
                  disabled={submitLoading}
                  onClick={() => {
                    setShowConfirmScreen(false);
                    setError(null);
                  }}
                  className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-base font-medium disabled:opacity-50"
                >
                  ◀ Orqaga
                </button>
                <button
                  type="button"
                  disabled={submitLoading}
                  onClick={handleConfirmSubmit}
                  className="flex-1 rounded-xl px-4 py-3 text-base font-medium disabled:opacity-50"
                  style={btnStyle}
                >
                  {submitLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Yuklanmoqda...
                    </span>
                  ) : (
                    "✅ Tasdiqlash"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Yangi mashina qo'shish */}
        {addVehicleModalOpen && orgId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              if (!newVehicleSubmitting) {
                setAddVehicleModalOpen(false);
                setNewVehicleError("");
              }
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/20 bg-[var(--tg-theme-bg-color,#1a1a1a)] p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold">Mashina qo&apos;shish</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Raqam"
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={newVehicleModel}
                  onChange={(e) => setNewVehicleModel(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Yil"
                  value={newVehicleYear}
                  onChange={(e) => setNewVehicleYear(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
                />
                <input
                  type="text"
                  placeholder="Rang"
                  value={newVehicleColor}
                  onChange={(e) => setNewVehicleColor(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base outline-none focus:border-[var(--tg-theme-button-color)]"
                />
              </div>
              {newVehicleError && (
                <p className="mt-2 text-sm text-red-400">{newVehicleError}</p>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={newVehicleSubmitting}
                  onClick={() => {
                    setAddVehicleModalOpen(false);
                    setNewVehicleError("");
                  }}
                  className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-base font-medium disabled:opacity-50"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  disabled={newVehicleSubmitting || !newVehiclePlate.trim() || !newVehicleModel.trim()}
                  onClick={async () => {
                    setNewVehicleError("");
                    setNewVehicleSubmitting(true);
                    try {
                      const yearNum = newVehicleYear.trim() ? parseInt(newVehicleYear.trim(), 10) : undefined;
                      const created = await createWebappVehicle(orgId, {
                        plate_number: newVehiclePlate.trim(),
                        model: newVehicleModel.trim(),
                        year: yearNum && !Number.isNaN(yearNum) ? yearNum : undefined,
                        color: newVehicleColor.trim() || undefined,
                      });
                      setOrgVehicles((prev) => [...prev, created]);
                      setVehicleId(created.id);
                      setCarNumber(created.plate_number);
                      setCarModel(created.model || "");
                      setAddVehicleModalOpen(false);
                      setNewVehiclePlate("");
                      setNewVehicleModel("");
                      setNewVehicleYear("");
                      setNewVehicleColor("");
                    } catch (err) {
                      setNewVehicleError(getErrorMessage(err, "Mashina qo‘shilmadi"));
                    } finally {
                      setNewVehicleSubmitting(false);
                    }
                  }}
                  className="flex-1 rounded-xl px-4 py-3 text-base font-medium disabled:opacity-50"
                  style={btnStyle}
                >
                  {newVehicleSubmitting ? "..." : "Qo&apos;shish"}
                </button>
              </div>
            </div>
          </div>
        )}
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

