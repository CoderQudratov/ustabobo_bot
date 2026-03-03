# TZ.md Compliance Checklist (AVTO-PRO Mini App + Bot)

## Implemented (this PR)

- **Phase 1:** WebApp URLs no longer pass `tg_id` or `role`; clean `WEBAPP_URL + path` only.
- **Phase 2:** `TelegramInitDataService` validates initData (HMAC-SHA256 per Telegram docs); `TelegramInitDataGuard` resolves user by validated `tg_id`; GET `/orders/my` uses `req.user` (no telegramId in URL).
- **Phase 3:** On every `/start`, `is_authenticated=false`; PIN keyboard (1–9, 0, C, OK); `/check` debug; all actions require auth (PIN or no PIN set).
- **Phase 4:** Guard returns 403 "🔐 Botga qayting va PIN kiriting." when `pin_code` exists and `!is_authenticated`.
- **Phase 5:** Theme CSS vars (`--tg-*`), `useTelegramApp` hook (MainButton, BackButton, haptics); 403 handler in WebApp.
- **Phase 6:** README security section; test steps; BotFather Main Mini App + startapp documented.

---

## Security (trust source)
- [x] **initData validation** — ONLY trust source; HMAC-SHA256 per Telegram docs; no tg_id/role from URL.
- [x] **PIN + hard logout** — On every `/start`, set `is_authenticated=false`; master/driver must re-enter PIN.
- [x] **WebApp gate** — If user has `pin_code` and `!is_authenticated` → 403 "Botga qayting va PIN kiriting."

## Master flow (TZ §6)
- draft → location → waiting_confirmation → (broadcasted | working) → finish → waiting_customer_confirmation → completed.
- Stock deduction only on **completed** (TZ §12).
- Snapshot pricing: `price_at_time` on OrderItem (TZ §4.8).

## Driver
- Accept: **atomic** `UPDATE ... WHERE status='broadcasted' RETURNING *` (TZ §7.2).
- Broadcast payload: master_fullname, @username, car_number, parts list, location, "Yetkazdim" button.

## Customer
- Deep link `/start conf_UUID` unchanged (TZ §§10–11); no change to confirmation flow.

## API
- WebApp endpoints: validate initData; attach `request.user` from DB by validated `tg_id`; never use URL `telegramId` for auth.
- GET /orders/my — no path param; user from guard (initData → DB user).
