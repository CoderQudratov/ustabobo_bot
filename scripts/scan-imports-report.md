# src/ Import & Type Scan Report

## 1. BadRequestException ishlatadigan fayllar

| Fayl | Import qilingan? | Manba |
|------|------------------|--------|
| `src/admin/admin-reports.controller.ts` | ✅ Ha | `@nestjs/common` (line 2) |
| `src/admin/admin.service.ts` | ✅ Ha | `@nestjs/common` (line 2) |
| `src/bot/bot.update.ts` | ✅ Ha | `@nestjs/common` (line 2) |
| `src/common/pipes/phone-validation.pipe.ts` | ✅ Ha | `@nestjs/common` (line 2) |
| `src/orders/orders.controller.ts` | ✅ Ha | `@nestjs/common` (line 2) |
| `src/orders/orders.service.ts` | ✅ Ha | `@nestjs/common` (line 2) |
| `src/upload/upload.controller.ts` | ✅ Ha | `@nestjs/common` (line 2) |

**Xulosa:** Barcha fayllar `BadRequestException` ni `@nestjs/common` dan import qilgan. **Import qilmagan fayl yo‘q.**

---

## 2. Redis ishlatadigan fayllar va type

| Fayl | Redis ishlatishi | Type / Izoh |
|------|-------------------|-------------|
| `src/broadcast/redis-health.service.ts` | `this.queue.client` (BullMQ) | **Tuzatilgan:** `queue.client` → `Promise<RedisClient>` (BullMQ tipi), `const client = await this.queue.client` bilan ishlatiladi; `client` tipi Redis (resolve qilingan). |
| `src/config/configuration.ts` | `getRedisUrl()`, `getRedisConnectionOptions()` | Redis URL/options; type: `string \| undefined` va `{ host, port, password?, tls?, maxRetriesPerRequest? }`. |
| `src/app.module.ts` | `getRedisConnectionOptions()` | Faqat config; Redis client emas. |

**Xulosa:** Faqat `redis-health.service.ts` da Redis client (BullMQ orqali) ishlatiladi. Type mismatch **bartaraf etilgan** (`await this.queue.client`).

---

## 3. Promise&lt;X&gt; bilan noto‘g‘ri typed

| Joy | Muammo | Holat |
|-----|--------|--------|
| `src/broadcast/redis-health.service.ts` | `this.queue.client` tipi `Promise<RedisClient>`; to‘g‘ridan-to‘g‘ri `Redis` sifatida ishlatilganda xato | ✅ **Tuzatilgan:** `const client = await this.queue.client` |

Boshqa fayllarda `Promise<...>` faqat async funksiyalar qaytish tipi sifatida ishlatilgan (masalan `Promise<void>`, `Promise<boolean>`) — bu noto‘g‘ri emas.

---

## 4. Import muammolari ro‘yxati

- **BadRequestException:** Hech qanday faylda import yetishmayapti.
- **Redis type:** `redis-health.service.ts` da tuzatilgan (`await this.queue.client`).
- Boshqa aniq import xatolari (scan bo‘yicha) topilmadi.

---

## Tekshirish / Fix buyruqlari

```bash
# Build (barcha type/import xatolarini ko‘rsatadi)
npm run build

# Lint
npm run lint

# E2E (integration)
npm run test:e2e
```

**Fix qilish kerak bo‘lgan qo‘shimcha fayl yo‘q.** Agar kelajakda yangi faylga `BadRequestException` qo‘shilsa, import qo‘shing:

```ts
import { BadRequestException, ... } from '@nestjs/common';
```
