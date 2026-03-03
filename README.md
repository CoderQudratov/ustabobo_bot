<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## AVTO-PRO — Telegram Mini App + Bot

Ko'chma avtoservis buyurtmalari tizimi: NestJS backend, Telegram Bot (Telegraf), Next.js WebApp (Mini App). Batafsil: [TZ.md](TZ.md), [RUN.md](RUN.md).

### Telegram Mini App — xavfsizlik (Security)

- **Yagona ishonch manbai:** server faqat **Telegram WebApp initData** ni tekshiradi (HMAC-SHA256, [rasmiy hujjat](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)). URL da `tg_id` yoki `role` ishonchsiz — ular hech qachon ishlatilmaydi.
- **Header:** WebApp har bir so'rovda `X-Telegram-Init-Data` header yuboradi; backend `TelegramInitDataService` orqali tekshiradi va `auth_date` eskirgan bo'lmasa (default 5 min) foydalanuvchini `tg_id` bo'yicha DB dan aniqlaydi.
- **PIN darvaza:** Agar foydalanuvchida `pin_code` bo'lsa va `is_authenticated === false` bo'lsa, WebApp API 403 qaytaradi: *"🔐 Botga qayting va PIN kiriting."* Barcha WebApp endpointlari (webapp/init, orders, wallet, upload) shu qoidaga bo'ysunadi.
- **Hard logout:** Har bir `/start` da master/driver uchun `is_authenticated` false qilinadi; menyu ko'rinishi uchun qayta PIN kiritish talab qilinadi.

### BotFather — Main Mini App va startapp

- **Main Mini App:** [@BotFather](https://t.me/botfather) → Bot Settings → Configure Mini App → Mini App URL = `WEBAPP_URL` (masalan `https://your-app.trycloudflare.com`). Foydalanuvchi bot profilida tugma orqali WebApp ni ochadi.
- **To'g'ridan-to'g'ri link:** `https://t.me/<BOT_USERNAME>?startapp=orders` — WebApp `start_param` / `tgWebAppStartParam` orqali ochilishi mumkin; kerak bo'lsa WebApp da routing qilish (masalan `/my-orders`).
- **Mijoz tasdiqlash:** `/start conf_<UUID>` o'zgartirilmaydi (TZ §§10–11).

### Test (Phase 6)

- `/start` → PIN so'raladi (agar user da `pin_code` bo'lsa).
- `/check` → `is_authenticated`, `pin_fail_count`, `locked_until` ko'rsatiladi.
- PIN to'g'ri → menyu; yana `/start` → yana PIN.
- `/be_driver` / `/be_master` — rol almashtirish (is_authenticated o'zgartirilmaydi).

---

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
# ustabobo_bot
