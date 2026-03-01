# Loyihani ishga tushirish va test qilish

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

Server odatda **http://localhost:3000** da ishlaydi.

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

## Muammo boʻlsa

- **Database connection error:** Docker ishlayaptimi? `docker ps` — postgres va redis koʻrinishi kerak.
- **Bot javob bermayapti:** `BOT_TOKEN` toʻgʻri va backend ishlayotganini tekshiring.
- **401 Unauthorized:** Admin uchun `login: admin`, `password: admin123` va JWT toʻgʻri yuborilganini tekshiring.
