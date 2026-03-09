# Dashboard chartlari uchun backend endpointlari

ERP dashboard diagrammalari quyidagi 3 ta **yangi** endpointni chaqiradi. Agar ular backendda bo‘lmasa, chartlar xato (404) ko‘rsatadi. NestJS da quyidagicha qo‘shing.

---

## 1. Oxirgi 7 kunlik buyurtmalar soni (BarChart)

- **URL:** `GET /admin/dashboard/weekly-orders`
- **Guard:** JwtAuthGuard + RolesGuard (Role.boss) — mavjud dashboard controller bilan bir xil
- **Response:**

```ts
interface WeeklyOrderItem {
  date: string;   // YYYY-MM-DD, oxirgi 7 kun (bugundan boshlab orqaga)
  count: number;  // shu kundagi buyurtmalar soni
}

// Response
{
  "items": [
    { "date": "2026-02-27", "count": 5 },
    { "date": "2026-02-28", "count": 12 },
    ...
  ]
}
```

- **Mantiq:** Har bir sana uchun `Order.created_at` shu kun bo‘yicha `count` (yoki `created_at` sana bo‘yicha gruppalab count). 7 ta element, sanalar tartibda (eski → yangi).

---

## 2. Oxirgi 7 kunlik tushum (LineChart)

- **URL:** `GET /admin/dashboard/weekly-revenue`
- **Guard:** JwtAuthGuard + RolesGuard (Role.boss)
- **Response:**

```ts
interface WeeklyRevenueItem {
  date: string;    // YYYY-MM-DD
  revenue: number; // shu kunda tugallangan buyurtmalar yig‘indisi (so‘m)
}

// Response
{
  "items": [
    { "date": "2026-02-27", "revenue": 1500000 },
    { "date": "2026-02-28", "revenue": 2300000 },
    ...
  ]
}
```

- **Mantiq:** `status === 'completed'` va `completed_at` shu kun ichida bo‘lgan buyurtmalar uchun `_sum(total_amount)`. 7 kun, har biri uchun bitta yozuv.

---

## 3. Buyurtma holatlari taqsimoti (PieChart)

- **URL:** `GET /admin/dashboard/order-status-counts`
- **Guard:** JwtAuthGuard + RolesGuard (Role.boss)
- **Response:**

```ts
// Frontend 4 ta guruhni kutadi: pending, in_progress, completed, cancelled
interface OrderStatusCountItem {
  status: string;  // "pending" | "in_progress" | "completed" | "cancelled"
  count: number;
}

// Response
{
  "items": [
    { "status": "pending", "count": 10 },
    { "status": "in_progress", "count": 5 },
    { "status": "completed", "count": 120 },
    { "status": "cancelled", "count": 3 }
  ]
}
```

- **Mantiq:** Barcha buyurtmalarni holat bo‘yicha gruppalang. Prisma dagi `OrderStatus` enum ni 4 ta guruhga map qiling, masalan:
  - **pending:** draft, waiting_confirmation, waiting_master_work_start, broadcasted, accepted, received_by_driver, waiting_master_delivery_confirmation, delivered_by_driver, received_by_master
  - **in_progress:** working, waiting_customer_confirmation
  - **completed:** completed
  - **cancelled:** cancelled

Frontend `status` ni o‘ziga qoldiradi, faqat `STATUS_LABELS` da "pending" → "Kutilmoqda" kabi label beriladi.
