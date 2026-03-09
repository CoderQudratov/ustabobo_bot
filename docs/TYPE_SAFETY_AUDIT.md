# TypeScript Type Safety Audit — ustabobo_bot

## 1. @Injectable() services (28 ta)

| Fayl | Import / Type | Holat |
|------|----------------|--------|
| `src/app.service.ts` | `Injectable` from `@nestjs/common` | OK |
| `src/auth/auth.service.ts` | `Injectable`, `UnauthorizedException` | OK |
| `src/auth/webapp.service.ts` | `Injectable` | OK |
| `src/auth/strategies/jwt.strategy.ts` | `Injectable`, `UnauthorizedException` | OK |
| `src/auth/guards/telegram-initdata.guard.ts` | `Injectable`, `ForbiddenException`, `UnauthorizedException` | OK |
| `src/auth/guards/telegram-webapp.guard.ts` | `Injectable`, `UnauthorizedException` | OK |
| `src/auth/guards/master-auth.guard.ts` | `Injectable`, `UnauthorizedException` | OK |
| `src/admin/admin.service.ts` | `Injectable`, `BadRequestException`, `ConflictException`, `NotFoundException` | OK |
| `src/admin/admin-dashboard.service.ts` | `Injectable` | OK |
| `src/bot/bot.update.ts` | `Injectable`, `BadRequestException`, `ConflictException`, `ForbiddenException`, `NotFoundException` | OK |
| `src/bot/bot-notify.service.ts` | `Injectable`, `@InjectBot()` (nestjs-telegraf) | OK |
| `src/bot/bot-webhook-setup.service.ts` | `Injectable`, `@InjectBot()` | OK |
| `src/bot/auth.scene.ts` | `Injectable` | OK |
| `src/broadcast/broadcast-producer.service.ts` | `Injectable`, `@InjectQueue('broadcast_queue')` | OK |
| `src/broadcast/broadcast.processor.ts` | `Injectable`, `@InjectBot()` | OK |
| `src/broadcast/redis-health.service.ts` | `Injectable`, `@InjectQueue('broadcast_queue')`, `await this.queue.client` | OK (Promise handled) |
| `src/common/pipes/phone-validation.pipe.ts` | `Injectable`, `BadRequestException` | OK |
| `src/common/guards/jwt-auth.guard.ts` | `Injectable`, `UnauthorizedException` | OK |
| `src/common/guards/roles.guard.ts` | `Injectable`, `ForbiddenException` | OK |
| `src/orders/orders.service.ts` | `Injectable`, `BadRequestException`, `ConflictException`, `ForbiddenException`, `NotFoundException` | OK |
| `src/organizations/organizations.service.ts` | `Injectable`, `NotFoundException` | OK |
| `src/products/products.service.ts` | `Injectable`, `NotFoundException` | OK |
| `src/products/stock-alert.service.ts` | `Injectable`, `@InjectBot()` | OK |
| `src/prisma/prisma.service.ts` | `Injectable` | OK |
| `src/services/services.service.ts` | `Injectable`, `NotFoundException` | OK |
| `src/telegram/telegram-initdata.service.ts` | `Injectable`, `UnauthorizedException` | OK |
| `src/upload/upload.service.ts` | `Injectable` | OK |
| `src/upload/s3.service.ts` | `Injectable` | OK |
| `src/users/users.service.ts` | `Injectable`, `ConflictException` | OK |
| `src/vehicles/vehicles.service.ts` | `Injectable`, `NotFoundException` | OK |

**Xulosa:** Barcha `@Injectable()` servicelar to‘g‘ri import va type bilan. Hech qanday fix kerak emas.

---

## 2. @Controller() classes (21 ta)

| Fayl | Route | Exception imports | Holat |
|------|--------|-------------------|--------|
| `src/app.controller.ts` | `''` | `ServiceUnavailableException` | OK |
| `src/admin/admin-dashboard.controller.ts` | `admin` | — | OK |
| `src/admin/admin-orders.controller.ts` | `admin/orders` | — | OK |
| `src/admin/admin-organizations.controller.ts` | `admin/organizations` | — | OK |
| `src/admin/admin-products.controller.ts` | `admin/products` | — | OK |
| `src/admin/admin-reports.controller.ts` | `admin` | `BadRequestException` | OK |
| `src/admin/admin-services.controller.ts` | `admin/services` | — | OK |
| `src/admin/admin-users.controller.ts` | `admin/users` | — | OK |
| `src/admin/admin-vehicles.controller.ts` | `admin/vehicles` | — | OK |
| `src/auth/auth.controller.ts` | `admin/auth` | `UnauthorizedException` | OK |
| `src/auth/webapp.controller.ts` | `webapp` | — | OK |
| `src/bot/telegram-webhook.controller.ts` | `telegram` | `@InjectBot()` | OK |
| `src/debug/debug.controller.ts` | `debug` | — | OK |
| `src/orders/orders.controller.ts` | `orders` | `BadRequestException`, `ForbiddenException`, `InternalServerErrorException` | OK |
| `src/orders/customer.controller.ts` | `customer` | — | OK |
| `src/orders/driver-orders.controller.ts` | `driver/orders` | — | OK |
| `src/orders/wallet.controller.ts` | `wallet` | — | OK |
| `src/organizations/organizations.controller.ts` | `admin/organizations` | — | OK |
| `src/products/products.controller.ts` | `admin/products` | — | OK |
| `src/services/services.controller.ts` | `admin/services` | — | OK |
| `src/upload/upload.controller.ts` | `api` | `BadRequestException` | OK |
| `src/users/users.controller.ts` | `admin/users` | — | OK |
| `src/vehicles/vehicles.controller.ts` | `admin/vehicles` | — | OK |

**Xulosa:** Barcha controller’lar to‘g‘ri. Exception ishlatadiganlar import qilgan.

---

## 3. InjectRedis() / @Inject() decorators

| Qidiruv | Natija |
|---------|--------|
| `InjectRedis` | **Ishlatilmaydi** — loyihada Redis to‘g‘ridan-to‘g‘ri inject qilinmaydi. |
| `@Inject(...)` | **Ishlatilmaydi** — faqat `@InjectQueue()`, `@InjectBot()` mavjud. |

**Mavjud inject decorators:**

| Fayl | Decorator | Manba |
|------|-----------|--------|
| `src/broadcast/broadcast-producer.service.ts` | `@InjectQueue('broadcast_queue')` | `@nestjs/bullmq` |
| `src/broadcast/redis-health.service.ts` | `@InjectQueue('broadcast_queue')` | `@nestjs/bullmq` |
| `src/bot/bot-notify.service.ts` | `@InjectBot()` | `nestjs-telegraf` |
| `src/bot/bot-webhook-setup.service.ts` | `@InjectBot()` | `nestjs-telegraf` |
| `src/bot/telegram-webhook.controller.ts` | `@InjectBot()` | `nestjs-telegraf` |
| `src/products/stock-alert.service.ts` | `@InjectBot()` | `nestjs-telegraf` |
| `src/broadcast/broadcast.processor.ts` | `@InjectBot()` | `nestjs-telegraf` |

**Xulosa:** `InjectRedis` yo‘q; `@InjectQueue` va `@InjectBot` to‘g‘ri ishlatilgan.

---

## 4. Exception throws — import tekshiruvi

| Fayl | Ishlatilgan Exception(lar) | Import qilindi? |
|------|----------------------------|-----------------|
| `src/admin/admin.service.ts` | BadRequest, Conflict, NotFound | Ha — `@nestjs/common` |
| `src/admin/admin-reports.controller.ts` | BadRequest | Ha |
| `src/app.controller.ts` | ServiceUnavailable | Ha |
| `src/auth/auth.controller.ts` | Unauthorized | Ha |
| `src/auth/auth.service.ts` | Unauthorized | Ha |
| `src/auth/guards/master-auth.guard.ts` | Unauthorized | Ha |
| `src/auth/guards/telegram-initdata.guard.ts` | Forbidden, Unauthorized | Ha |
| `src/auth/guards/telegram-webapp.guard.ts` | Unauthorized | Ha |
| `src/auth/strategies/jwt.strategy.ts` | Unauthorized | Ha |
| `src/bot/bot.update.ts` | BadRequest (instanceof check) | Ha |
| `src/common/guards/jwt-auth.guard.ts` | Unauthorized | Ha |
| `src/common/guards/roles.guard.ts` | Forbidden | Ha |
| `src/common/pipes/phone-validation.pipe.ts` | BadRequest | Ha |
| `src/orders/orders.controller.ts` | BadRequest, Forbidden, InternalServerError | Ha |
| `src/orders/orders.service.ts` | BadRequest, Conflict, Forbidden, NotFound | Ha |
| `src/organizations/organizations.service.ts` | NotFound | Ha |
| `src/products/products.service.ts` | NotFound | Ha |
| `src/services/services.service.ts` | NotFound | Ha |
| `src/telegram/telegram-initdata.service.ts` | Unauthorized | Ha |
| `src/upload/upload.controller.ts` | BadRequest | Ha |
| `src/users/users.service.ts` | Conflict | Ha |
| `src/vehicles/vehicles.service.ts` | NotFound | Ha |

**Xulosa:** Barcha exception throw qiladigan fayllar tegishli exception’larni `@nestjs/common` dan import qilgan. **Import qilmagan fayl yo‘q.**

---

## Tekshirish buyruqlari

```bash
# Build (type + import xatolarini ko‘rsatadi)
npm run build

# Lint
npm run lint

# E2E
npm run test:e2e
```

**Audit natijasi:** Hozirgi holatda barcha @Injectable servicelar, @Controller’lar, Inject decorator’lar va exception throw’lar type-safe va import to‘g‘ri. Qo‘shimcha fix talab qilinmadi; `npm run build` 0 xato bilan o‘tadi.
