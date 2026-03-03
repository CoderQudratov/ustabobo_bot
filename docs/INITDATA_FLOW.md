# initData flow (TZ §6, §14.2)

## Source of truth
- **TZ.md** §6 (Usta Bot + WebApp), §14.2 (GET /webapp/init, POST /orders), §15 (Guards).

## Flow: Telegram → WebApp → Backend → session

1. **User** Telegramda botga kiradi (login scene) → tg_id bog‘lanadi → menu ochiladi.
2. **Menu** (keyboards.ts): `Markup.button.webApp('➕ Yangi buyurtma', webAppUrl('/new-order'))` — URL = **WEBAPP_URL** dan (.env).
3. **Telegram** WebApp iframe ni ochadi; Telegram client **initData** ni inject qiladi (`window.Telegram.WebApp.initData`).
4. **WebApp (Next.js)** har API so‘rovda header `x-telegram-init-data: <initData>` yuboradi (api.ts).
5. **Backend** (TelegramWebAppGuard):
   - Header dan initData o‘qiydi.
   - AuthService.validateTelegramInitData(initData): hash tekshiruv (HMAC-SHA256, BOT_TOKEN + "WebAppData"), auth_date max age (TELEGRAM_INIT_DATA_MAX_AGE_SEC), user bor-yo‘qligi.
   - tg_id bo‘yicha DB dan user topadi (getUserByTgId) → req.user (id, login, role, fullname).
6. **Session**: Backend JWT emit qilmaydi; har so‘rovda initData yuboriladi va guard har safar verify qiladi (stateless).

## Endpointlar va guardlar

| Endpoint            | Guard                | Env / eslatma                    |
|---------------------|----------------------|-----------------------------------|
| GET /webapp/init    | TelegramWebAppGuard | BOT_TOKEN, WEBAPP_URL             |
| POST /orders        | MasterAuthGuard     | initData → TelegramWebAppGuard    |
| GET /orders/my/:tid | MasterAuthGuard     | initData + URL telegramId mos     |
| POST /api/upload    | TelegramWebAppGuard | BOT_TOKEN                         |
| GET /debug/initdata/check | TelegramInitDataGuard | 200 = initData valid        |

## Kerakli env

- **BOT_TOKEN** — BotFather token (bitta, takrorlanmas).
- **WEBAPP_URL** — WebApp origin (HTTPS), masalan Cloudflare tunnel; bot tugmalar shu URLni ishlatadi.
- **NEXT_PUBLIC_API_URL** — WebApp build vaqtida backend API (tunnel yoki localhost).
- **TELEGRAM_INIT_DATA_MAX_AGE_SEC** — ixtiyoriy; default 300 (5 min). Eski initData rad etiladi.

## Cloudflare tunnel o‘zgarishi

- **Bot** har safar **.env** dagi **WEBAPP_URL** dan URL oladi (keyboards.ts → getWebAppBaseUrl()).
- Tunnel yangilangach: `start-all.sh` yangi URLni .env ga yozadi, WebApp qayta ishga tushadi.
- Bot qayta ishga tushirilmasa ham, keyingi restart da yangi WEBAPP_URL ishlatiladi; yoki faqat WebApp/API restart yetadi (bot menyu URL ni runtime da o‘qimaydi, faqat start da).

## 409 getUpdates

- Bir xil **BOT_TOKEN** bilan ikki process long polling qilsa 409 Conflict.
- **Qoida:** bitta instance — bitta `npm run start:dev` yoki `./scripts/start-all.sh` (bitta backend process). Ikkinchi terminalda start qilmaslik.
