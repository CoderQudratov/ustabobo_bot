# Testing Guide

## Prerequisites

- PostgreSQL running and `DATABASE_URL` set in `.env`
- Redis running (for broadcast queue)
- Telegram Bot token in `.env` as `BOT_TOKEN`

---

## Task 1 & 2: Seed data and command

Seed creates two users (upsert by `login`, so safe to run multiple times):

| Role   | Login | Password | Fullname     |
|--------|--------|----------|--------------|
| Boss   | admin  | admin123 | Doston Admin |
| Master | usta1  | admin123 | Usta Bobo    |

**Run the seed (from project root):**

```bash
npx prisma db seed
```

Or run the seed script directly:

```bash
npx tsx prisma/seed.ts
```

---

## Task 3: Test instructions

### 1. Admin login and reports (ERP)

**Login (get JWT):**

```bash
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Example response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Fetch reports (use the token from login):**

```bash
curl -X GET "http://localhost:3000/admin/reports" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

With optional filters:

```bash
curl -X GET "http://localhost:3000/admin/reports?from=2025-01-01&to=2025-12-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Postman:**

1. **Login**
   - Method: `POST`
   - URL: `http://localhost:3000/admin/auth/login`
   - Body → raw → JSON: `{"login":"admin","password":"admin123"}`
   - Send, then copy `access_token` from the response.

2. **Reports**
   - Method: `GET`
   - URL: `http://localhost:3000/admin/reports`
   - Authorization → Type: Bearer Token → Token: paste `access_token`
   - Send.

---

### 2. Telegram Bot login (usta1 / Master)

1. Start the backend (e.g. `npm run start:dev`).
2. Open Telegram and find your bot (use the bot username from BotFather).
3. Send **`/start`**.
4. Bot will ask for login: enter **`usta1`**.
5. Bot will ask for password: enter **`admin123`**.
6. If credentials are correct, the bot links your Telegram account to the Master user and shows the main menu (e.g. “Asosiy menyu” with options like “➕ Yangi buyurtma”, “📋 Buyurtmalarim”, etc.).

If the user is not found or password is wrong, the auth scene will keep asking or show an error (depending on your auth scene implementation).

---

## One-liner: login and then reports

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/admin/auth/login -H "Content-Type: application/json" -d '{"login":"admin","password":"admin123"}' | jq -r '.access_token') && curl -s -X GET "http://localhost:3000/admin/reports" -H "Authorization: Bearer $TOKEN" | jq
```

(Requires `jq`; if you don’t have it, run the two `curl` commands separately and paste the token.)
