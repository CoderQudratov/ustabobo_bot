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

## 1. Oʻzgaruvchilarni sozlash

`.env` faylini yarating (yoki mavjud `.env` ni tekshiring):

```bash
cp .env.example .env
```

`.env` da quyidagilar boʻlishi kerak:

- **DATABASE_URL** — PostgreSQL ulanish (docker-compose dagi postgres bilan mos)
- **BOT_TOKEN** — Telegram bot token
- **JWT_SECRET** — admin login JWT uchun (ixtiyoriy; boʻlmasa default ishlatiladi)
- **PORT** — backend port (default 3001; Next.js webapp 3000 da)
- **WEBAPP_URL** — Usta WebApp manzili (HTTPS). Botda "Yangi buyurtma" bosilganda shu URL ochiladi. Lokal test uchun: `ngrok http 3000` → `.env` da `WEBAPP_URL=https://xxx.ngrok.io`

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

Server odatda **http://localhost:3001** da ishlaydi (`.env` da `PORT=3001`). Faqat **bitta** backend instansiyasini ishga tushiring; ikkita ishga tushirilsa port band (EADDRINUSE) yoki Telegram 409 Conflict chiqadi.

---

## 4. Test qilish

### Admin (ERP) login va reports

**Login (JWT olish):**

```bash
curl -X POST http://localhost:3001/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Javobda `access_token` keladi. Keyin reports:

```bash
curl -X GET "http://localhost:3001/admin/reports" \
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

1. WebApp (Next.js) ni ishga tushiring: `cd webapp && npm run dev` (port 3000).
2. Telegram dan "Yangi buyurtma" ishlashi uchun WebApp **HTTPS** va internetdan ochiladigan boʻlishi kerak. Lokal test: `ngrok http 3000` ishga tushiring, berilgan `https://xxx.ngrok.io` ni `.env` da **WEBAPP_URL** ga yozing va backendni qayta ishga tushiring.
3. `WEBAPP_URL` boʻlmasa yoki `avto-pro-webapp.example.com` boʻlsa, botda tugma bosilganda "Error resolving hostname" chiqadi.

---

## Muammo boʻlsa

- **Database connection error:** Docker ishlayaptimi? `docker ps` — postgres va redis koʻrinishi kerak.
- **Bot javob bermayapti:** `BOT_TOKEN` toʻgʻri va backend ishlayotganini tekshiring.
- **401 Unauthorized:** Admin uchun `login: admin`, `password: admin123` va JWT toʻgʻri yuborilganini tekshiring. Brauzerda `http://localhost:3001` ochilsa endi 401 emas, API xabari chiqadi.
- **EADDRINUSE / 409 Conflict:** Faqat **bitta** `npm run start:dev` ishlatiling; ikkita terminalda backend ishga tushirmang.
- **WebApp "hostname not found":** `.env` da **WEBAPP_URL** ni haqiqiy HTTPS manzilga oʻrnating (masalan ngrok manzili).
