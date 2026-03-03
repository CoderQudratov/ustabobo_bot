# Loyihani ishga tushirish va test qilish

## Tez ishga tushirish (PostgreSQL + Redis allaqachon ishlayapti bo‘lsa)

```bash
cd /home/doston/avto-pro-backend
npm run db:push
npm run db:seed
npm run start:dev
```

Keyin Telegram da botni oching → **/start** → login: **usta1** → parol: **admin123**.

---

## Kerakli narsalar

- Node.js 18+
- **PostgreSQL** va **Redis** — Docker orqali yoki tizimda to‘g‘ridan-to‘g‘ri o‘rnatilgan
- Telegram bot token (BotFather dan)

---

## Docker bo‘lmasa (lokal PostgreSQL va Redis)

Agar `docker: not found` xatosi chiqsa, PostgreSQL va Redis ni tizimingizda o‘rnating.

**Ubuntu / Debian:**

```bash
# PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-client

# Redis
sudo apt install -y redis-server
```

**PostgreSQL:** bazani yarating (postgres foydalanuvchisi odatda mavjud):

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'admin123';"
sudo -u postgres psql -c "CREATE DATABASE avtopro_db OWNER postgres;"
```

Agar boshqa foydalanuvchi/parol ishlatsangiz, `.env` dagi `DATABASE_URL` ni shu bo‘yicha o‘zgartiring.

**Redis:** ishga tushiring (odatda xizmat sifatida ishlaydi):

```bash
sudo systemctl start redis-server
# yoki: redis-server
```

**.env** da `DATABASE_URL` lokal Postgres ga mos bo‘lsin, masalan:

```
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/avtopro_db?schema=public"
```

Keyin baza va seed:

```bash
npm install
npm run db:push
npm run db:seed
npm run start:dev
```

---

## CORS va Cloudflare (BotFather dan bemalol ishlatish)

Backend **barcha origin** lardan so'rovlarni qabul qiladi (CORS `origin: true`). Shuning uchun:

- BotFather da Mini App URL ni **istalgan** Cloudflare tunnel (yoki ngrok) manziliga qo'yishingiz mumkin.
- Har safar tunnel yangi URL bersa ham, CORS xato bermaydi.
- Backend `0.0.0.0` da tinglaydi — Cloudflare tunnel lokal portga bemalol ulanishi mumkin.

**Tavsiya:** `./scripts/start-all.sh` ishlatilsa — u Backend (3000) va WebApp (3001) ni ishga tushiradi, cloudflared orqali ikkita tunnel ochadi va `.env` / `webapp/.env.local` ni avtomatik yangilaydi. BotFather da faqat **Mini App URL** = skript chiqargan `WEBAPP_URL` (masalan `https://xxx.trycloudflare.com`) qilib qo'ying.

---

## 1. Oʻzgaruvchilarni sozlash

`.env` faylini yarating (yoki mavjud `.env` ni tekshiring):

```bash
cp .env.example .env
```

`.env` da quyidagilar boʻlishi kerak:

- **DATABASE_URL** — PostgreSQL ulanish (bitta qator).
- **BOT_TOKEN** — BotFather dan olingan token (bitta qator; "your_bot_token_here" boʻlmasin).
- **JWT_SECRET** — admin login uchun (ixtiyoriy).
- **PORT** — 3000 (WebApp 3001 da).
- **WEBAPP_URL** — Mini App HTTPS manzili (Cloudflare/ngrok).
- **TELEGRAM_BOT_USERNAME** — bot username (masalan Usta_test_bot).

**Muhim:** .env da bir xil kalit ikki marta boʻlmasin (oxirgi qiymat qoladi, BOT_TOKEN placeholder qolsa "Invalid Telegram init data signature" chiqadi). Tekshirish: `npm run check-env`.

---

## 2. Barcha narsani bir marta sozlash (setup)

```bash
npm install
npm run setup
```

`setup` quyidagilarni bajaradi: Docker da Postgres va Redis ni ishga tushiradi, 3 soniya kutadi, Prisma schema ni bazaga yozadi, seed (admin + usta1) ni qoʻyadi.

Agar `setup` da xato bersa (masalan, postgres hali tayyor emas):

```bash
npm run db:up
# 5–10 soniya kuting
npm run db:push
npm run db:seed
```

**Eslatma:** `db:up` ichida `docker compose` ishlatiladi. Eski tizimlarda `docker-compose` boʻlishi mumkin — unda `package.json` dagi `db:up` va `db:down` da `docker compose` oʻrniga `docker-compose` yozing yoki qoʻlda: `docker-compose up -d`.

---

## 3. Backend ni ishga tushirish

```bash
npm run start:dev
```

Server odatda **http://localhost:3000** da ishlaydi (`.env` da `PORT=3000`). Faqat **bitta** backend instansiyasini ishga tushiring; ikkita ishga tushirilsa port band (EADDRINUSE) yoki Telegram 409 Conflict chiqadi.

---

## 4. Test qilish

### Admin (ERP) login va reports

**Login (JWT olish):**

```bash
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Javobda `access_token` keladi. Keyin reports:

```bash
curl -X GET "http://localhost:3000/admin/reports" \
  -H "Authorization: Bearer SIZNING_ACCESS_TOKEN"
```

### Telegram bot (usta1)

1. Telegram da botni oching (BotFather bergan link).
2. **/start** yuboring.
3. Login: **usta1**
4. Parol: **admin123**
5. Kirish muvaffaqiyatli boʻlsa asosiy menyu chiqadi.

### Seed ma’lumotlari

| Login  | Parol    | Rol    |
|--------|----------|--------|
| admin  | admin123 | Boss   |
| usta1  | admin123 | Master |

---

## Foydali buyruqlar

| Buyruq           | Vazifa                          |
|------------------|----------------------------------|
| `npm run db:up`  | Postgres + Redis ni Docker da ishga tushirish |
| `npm run db:down`| Docker konteynerlarni toʻxtatish |
| `npm run db:push`| Prisma schema ni bazaga yozish   |
| `npm run db:seed`| Seed (admin, usta1) ni qoʻyash   |
| `npm run db:reset`| Bazani tozalab qayta schema + seed |
| `npm run setup`  | db:up + db:push + db:seed        |
| `npm run start:dev` | Backend ni watch rejimida ishga tushirish |

---

## Usta WebApp (Telegram ichida)

1. WebApp (Next.js) ni ishga tushiring: `cd webapp && npm run dev -- -p 3001` (port 3001).
2. Telegram dan "Yangi buyurtma" ishlashi uchun WebApp **HTTPS** va internetdan ochiladigan boʻlishi kerak (Cloudflare tunnel yoki ngrok).
3. **Oddiy brauzerda** WebApp ni ochsangiz initData boʻlmaydi — "Sessiya tugadi" yoki 401 chiqadi. Ilovani **faqat Telegram bot** orqali oching (Botda "Yangi buyurtma" tugmasi).

---

## Cloudflare tunnel orqali ishlatish (ishonchli qadamlar)

Backend va WebApp lokal portlarda ishlashi kerak; tashqariga Cloudflare tunnel orqali ochiladi.

### 1. Backend (port 3000) va WebApp (port 3001) ni ishga tushiring

```bash
# Terminal 1 — backend
npm run start:dev

# Terminal 2 — webapp
cd webapp && npm run dev -- -p 3001
```

Ishga tushgach backend logida koʻrinadi:
- `[Startup] BOT_TOKEN prefix: 1234567890…`
- `[Startup] WEBAPP_URL: ...`
- `[Startup] TELEGRAM_INIT_DATA_MAX_AGE_SEC: 300`

### 2. Cloudflare tunnellar

- **API tunnel:** `cloudflared tunnel --url http://localhost:3000`  
  Chiqadigan `https://XXX.trycloudflare.com` ni **NEXT_PUBLIC_API_URL** qilib **webapp/.env.local** ga yozing (va kerak boʻlsa backend .env da API_BASE_URL).
- **WebApp tunnel:** `cloudflared tunnel --url http://localhost:3001`  
  Chiqadigan `https://YYY.trycloudflare.com` ni **.env** da **WEBAPP_URL** ga yozing.

Yoki bitta skript: `./scripts/start-all.sh` — u backend, webapp va tunnellarni ishga tushiradi va .env larni yangilaydi.

### 3. BotFather sozlamalari

- Bot Settings → Configure Mini App → Mini App URL = **WEBAPP_URL** (masalan `https://YYY.trycloudflare.com`).

### 4. Uch bosqichli tekshiruv

1. **WebApp ni bot orqali oching** — Botda "➕ Yangi buyurtma" bosing (oddiy brauzerda emas).
2. **GET /debug/whoami** — WebApp ochiq boʻlgan holda (yoki brauzerda bir xil initData yuborib) soʻrov yuboring; **200** va `tg_id`, `role`, `is_authenticated` keladi.
3. **Yangi buyurtma sahifasi** — forma yuklanadi, xizmatlar/ombor keladi (webapp/init 200).

Agar "Invalid Telegram init data signature" chiqsa — quyidagi **5 narsani tekshiring** boʻlimiga oʻting.

---

## "Invalid Telegram init data signature" chiqsa — tekshiruv roʻyxati

Bu xato CORS emas; initData backend da HMAC orqali tekshiriladi va imzo mos kelmasa shu xabar chiqadi.

1. **.env da BOT_TOKEN bitta va haqiqiy**  
   - Faylda `BOT_TOKEN` **bir marta** boʻlishi kerak; ikkinchi qator keyingi qiymatni ustiga yozadi (placeholder "your_bot_token_here" qolsa imzo notoʻgʻri boʻladi).  
   - `npm run check-env` ishlating — takrorlangan kalitlar boʻlsa xato beradi.  
   - Backend ishga tushganda logda `[Startup] BOT_TOKEN prefix: 1234567890…` koʻrinadi; prefix BotFather bergan token boshiga mos kelishi kerak.

2. **WebApp ilovani Telegram bot orqali oching**  
   - Oddiy brauzerda ochilsa `Telegram.WebApp.initData` boʻlmaydi; backend 401 qaytaradi.  
   - Faqat botdagi "Yangi buyurtma" / "Mening buyurtmalarim" tugmalaridan ochilgan ilovada initData bor.

3. **NEXT_PUBLIC_API_URL toʻgʻri**  
   - **webapp/.env.local** da `NEXT_PUBLIC_API_URL` = API tunnel manzili (masalan `https://XXX.trycloudflare.com`).  
   - WebApp build qilingan boʻlsa, oʻzgarishdan keyin **qayta build** yoki dev server ni qayta ishga tushiring.

4. **Sessiya eskirgan boʻlmasin**  
   - Default initData **5 daqiqa** (300 soniya) dan keyin eski hisoblanadi.  
   - Dev da uzoqroq qilish: `.env` da `TELEGRAM_INIT_DATA_MAX_AGE_SEC=3600`.  
   - Production da 300 qoldiring.

5. **Backend logida sabab**  
   - `NODE_ENV=development` da backend initData tekshirish muvaffaqiyatsiz boʻlsa logda sabab yoziladi:  
     `[TelegramInitData] validation failed: computed_hash mismatch` — odatda BOT_TOKEN notoʻgʻri yoki .env da takrorlangan BOT_TOKEN.

---

## Muammo boʻlsa

- **Database connection error:** Docker ishlayaptimi? `docker ps` — postgres va redis koʻrinishi kerak.
- **Bot javob bermayapti:** `BOT_TOKEN` toʻgʻri va backend ishlayotganini tekshiring.
- **401 Unauthorized:** Admin uchun `login: admin`, `password: admin123` va JWT toʻgʻri yuborilganini tekshiring. Brauzerda `http://localhost:3001` ochilsa endi 401 emas, API xabari chiqadi.
- **EADDRINUSE / 409 Conflict (getUpdates):** Faqat **bitta** backend process bo‘lishi kerak (bitta `npm run start:dev` yoki bitta `./scripts/start-all.sh`). Ikkinchi terminalda yoki boshqa mashinada bir xil BOT_TOKEN bilan ishga tushirmang — 409 Conflict keladi.
- **WebApp "hostname not found":** `.env` da **WEBAPP_URL** ni haqiqiy HTTPS manzilga oʻrnating (masalan ngrok manzili).
- **"Sessiya tugadi" / 401 WebApp ichida:** Telegram ichida ochilganda ham 401 bo‘lsa — BOT_TOKEN shu botniki ekanini tekshiring; `.env` da bitta BOT_TOKEN bo‘lishi kerak. Keyin WebApp ni yopib, botda "➕ Yangi buyurtma" ni qayta bosing (yangilangan initData uchun).
- **Tunnel URL o‘zgardi:** `./scripts/start-all.sh` qayta ishga tushiring — u .env va webapp/.env.local ni yangilaydi. Bot qayta start qilmasangiz ham, keyingi restart da yangi WEBAPP_URL ishlatiladi; bot menyu URL ni har so‘rovda emas, faqat ishga tushganda o‘qiydi.
