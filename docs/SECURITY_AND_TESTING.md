# Xavfsizlik va testlash — production oldidan

Kiberxavfsizlik mutaxassisi ko‘zi bilan tekshiruvlar va testlar.

---

## Qisqacha: nima qilish kerak

| Qadam | Buyruq / harakat |
|--------|-------------------|
| 1. Baza | `npm run db:seed` (admin/admin123 yaratiladi) |
| 2. Unit testlar | `npm run test` |
| 3. E2E testlar | `npm run test:e2e` (tarmoq ochiq, Telegram BOT_TOKEN ishlatiladi) |
| 4. Xavfsizlik checklist | Quyidagi bo‘limni bitta-bitta tekshiring |
| 5. Qo‘lda tekshiruv | Login, tenant izolyatsiya, super admin 403 |

---

## 1. Tekshiruvlar ro‘yxati (checklist)

### 1.1 Autentifikatsiya
- [ ] Parollar bcrypt bilan hash (10 round) — `auth.service`, `admin.service`, `tenants.service`
- [ ] JWT access token qisqa muddat (1 soat), refresh token 7 kun
- [ ] Login faqat boss yoki super_admin uchun ERP (usta/driver ERP ga kira olmasin)
- [ ] Token siz himoyalangan route’lar 401 qaytaradi
- [ ] Noto‘g‘ri yoki muddati o‘tgan token 401

### 1.2 Avtorizatsiya (tenant + super admin)
- [ ] Boss faqat o‘z `tenant_id` ma’lumotlarini ko‘radi (orders, users, products, …)
- [ ] Super admin barcha tenantlarni ko‘radi; `/admin/tenants` faqat super admin uchun
- [ ] Boshqa tenant’ning ID’si bilan so‘rov (masalan order by id) 404 yoki 403

### 1.3 Kirish va validatsiya
- [ ] Barcha DTO’lar `ValidationPipe` (whitelist, forbidNonWhitelisted) — extra field’lar olib tashlanadi
- [ ] SQL injection: Prisma parametrli so‘rovlar ishlatadi
- [ ] XSS: frontend (ERP) da foydalanuvchi kiritgan matn escape qilinadi (React default)

### 1.4 CORS va cookie
- [ ] CORS aniq origin’lar (localhost, production domain); credentials: true
- [ ] ERP token httpOnly cookie’da (client JS o‘qiymaydi)
- [ ] Production’da cookie secure, sameSite

### 1.5 Maxfiy ma’lumot
- [ ] `.env` git’ga kirmaydi; production’da env o‘rnatilgan
- [ ] JWT_SECRET kuchli va production’da almashtirilgan
- [ ] Xato response’larda stack trace chiqmasin (production)

### 1.6 Qo‘shimcha (tavsiya)
- [ ] Rate limiting (login, API) — hozircha yo‘q, production’da proxy/nginx bilan qo‘yish mumkin
- [ ] Helmet (HTTP headers) — Nest’da ixtiyoriy qo‘shish mumkin
- [ ] HTTPS production’da majburiy

---

## 2. Testlarni ishga tushirish

### 2.1 Unit testlar (NestJS)
```bash
npm run test
```
Yagona spec: `src/app.controller.spec.ts`.

### 2.2 E2E testlar (backend)
Baza seed’langan bo‘lishi kerak (admin/admin123 boss bor). Tarmoq ochiq bo‘lishi kerak (Telegram getMe chaqiriladi).
```bash
npm run db:seed
npm run test:e2e
```
- `test/app.e2e-spec.ts` — asosiy API
- `test/integration/*.e2e-spec.ts` — admin, client orders, vehicle
- `test/integration/security.e2e-spec.ts` — xavfsizlik (401 token siz, 403 super-admin route boss bilan, 400 qo‘shimcha field)

**Eslatma:** Agar `test:e2e` da Telegram (getMe) xatosi chiqsa, loyihani tarmoq ishlaydigan muhitda ishga tushiring yoki CI da BOT_TOKEN ni o‘rnating.

### 2.3 ERP (Next.js)
```bash
cd erp
npm run build
npm run lint
```
Ixtiyoriy: `npm run test` (agar Jest/Cypress o‘rnatilgan bo‘lsa).

---

## 3. Qo‘lda tekshiruv (production oldidan)

1. **Login**
   - Noto‘g‘ri parol → 401, aniq xabar.
   - To‘g‘ri superadmin / boss → 200, cookie set.

2. **Tenant izolyatsiya**
   - Boss A bilan kiring, bitta order yarating.
   - Boshqa tenant’ning bossi (yoki API’da boshqa tenant_id) bilan shu order’ni ko‘rish/ozgartirish → 404 yoki 403.

3. **Super Admin**
   - Boss token bilan `GET /admin/tenants` → 403.
   - Super admin token bilan → 200.

4. **Validatsiya**
   - POST body’da noma’lum field yuborish → 400 (forbidNonWhitelisted).

5. **Token**
   - `Authorization: Bearer <invalid>` yoki token siz so‘rov → 401.

---

## 4. Production deploy oldin

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` kuchli va maxfiy
- [ ] `DATABASE_URL` production DB
- [ ] `PUBLIC_URL` / `WEBAPP_URL` / `ERP_URL` to‘g‘ri
- [ ] CORS da faqat haqiqiy domain’lar
- [ ] Migratsiyalar: `npm run db:migrate:deploy`
- [ ] Backend build: `npm run build:prod`
- [ ] ERP build: `cd erp && npm run build`
- [ ] Rate limit (reverse proxy yoki Nest throttle) tavsiya etiladi
