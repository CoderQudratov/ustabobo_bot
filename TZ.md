AVTO-PRO-SYSTEM — FULL MVP TEXNIK TOPSHIRIQNOMASI (TZ.md)
(YAKUNIY, BATAFSIL, MAYDALANGAN, COPY-PASTE UCHUN)
1) LOYIHA MAQSADI VA G‘OYA
AVTO-PRO-SYSTEM — ko‘chma avtoservis (usta mashina yoniga borib xizmat qiladi) uchun buyurtmalarni boshqarish tizimi.
Tizimning asosiy maqsadi:

Buyurtmani tez ochish (usta telefonda)
Zapchastlarni nazorat qilish (ombor, qoldiq, minimal limit)
Kuryer orqali yetkazib berish jarayonini aniq boshqarish
Ish tugagach, mijoz tasdiqlashi orqali “yopilish zanjiri”ni xavfsiz qilish
Boss ERP orqali:
buyurtmalarni ko‘rish
mashinalar tarixini ko‘rish
tashkilot qarzini yuritish
usta/kuryer statistikasi va tushumni ko‘rish
2) TIZIM ISHTIROKCHILARI (ROLLAR)
RolQayerda ishlaydiAsosiy vazifaBoss (boss)Web ERP (kompyuter)Xodimlar, ombor, xizmatlar, tashkilotlar, hisobotlar, tarixUsta (master)Telegram Bot + WebAppBuyurtma yaratish, lokatsiya, tasdiqlash, ishni yakunlashKuryer (driver)Telegram BotBuyurtma qabul qilish, yetkazdim deb belgilashMijoz (customer)Telegram Bot (link orqali)Chekni ko‘rib tasdiqlash3) TEXNOLOGIYA STEKI
Backend
NestJS (TypeScript)
PostgreSQL
Prisma ORM
Redis (session, online drivers, lock/cache)
BullMQ (broadcast queue / background jobs)
Telegram Bot
Telegraf.js (nestjs-telegraf)
Telegraf Scenes (Wizard) (login, location kutish kabi bosqichlar)
Frontend
Next.js + TailwindCSS
ERP Dashboard
Telegram WebApp (usta buyurtma formasi)
Fayl saqlash (rasm)
S3 / MinIO
mashina rasmini saqlash
ERPda ko‘rish
4) MA’LUMOTLAR BAZASI (ENTITIES, ENUMS, MAQSADI)
4.1 ENUMS
Role: boss | master | driver

OrderStatus:
draft                      (usta webappda saqladi, hali lokatsiya yo‘q)
waiting_confirmation       (lokatsiya kelgan, jami summa ko‘rsatildi, usta tasdiqlashi kutilyapti)
broadcasted                (dostavka kerak, kuryerlarga yuborildi)
accepted                   (bitta kuryer oldi)
delivered_by_driver        (kuryer “yetkazdim” bosdi)
received_by_master         (usta “qabul qildim” bosdi)
working                    (usta ish qilyapti)
waiting_customer_confirmation (usta yakunladi, mijoz tasdiqlashi kutilyapti)
completed                  (mijoz tasdiqladi, order yopildi)
cancelled                  (bekor qilindi)

PaymentType: cash | corporate_debt

OrderItemType: product | service | manual_product
4.2 USER (Xodimlar)
Nima uchun kerak: Boss usta/kuryerlarni yaratadi, login beradi. Botga kirish shu orqali.
Maydonlar:

id (uuid)
fullname
phone (unique)
username (telegram username, ixtiyoriy; botdan olinadi)
login (unique)
password_hash (bcrypt)
role (boss/master/driver)
tg_id (nullable, unique) — bir marta login qilganda bog‘lanadi
percent_rate (decimal) — usta/kuryer foizi (MVP uchun)
balance (decimal) — hisob-kitob uchun (MVPda yuritilishi mumkin)
is_active (bool)
4.3 ORGANIZATION (B2B Tashkilot)
Nima uchun kerak: Korporativ mijozlar qarzini yuritish va mashinalarini boshqarish.
Maydonlar:

id
name
contact_person
phone
payment_type (cash/corporate_debt)
balance_due (decimal) — tashkilot qarzi
is_active
4.4 VEHICLE (Tashkilot mashinalari)
Nima uchun kerak: Agar buyurtma tashkilot mashinasi bo‘lsa, usta ro‘yxatdan tanlaydi, keyin tarix mashina kesimida ko‘rinadi.
Maydonlar:

id
org_id (FK)
plate_number
model
is_active
4.5 PRODUCT (OMBOR / Zapchast)
Nima uchun kerak: Ombor qoldig‘i, kelgan narx, sotish narxi, minimal limit.
Maydonlar:

id
name
cost_price (kelgan narx)
sale_price (sotiladigan narx)
stock_count
min_limit
created_at
4.6 SERVICE (Xizmatlar)
Nima uchun kerak: Usta buyurtmada checkbox bilan tanlaydi.
Maydonlar:

id
name
price
4.7 ORDER (Buyurtma)
Nima uchun kerak: Barcha jarayon shu jadvalda.
Maydonlar:

id
master_id
driver_id (nullable)
organization_id (nullable)
vehicle_id (nullable)
client_name
client_phone
car_number
car_model
car_photo_url
lat, lng
delivery_needed (boolean)
status (OrderStatus)
total_amount (decimal)
confirm_token (uuid, nullable)
created_at
completed_at
Eslatma: organization_id faqat dropdown’dan tanlanganda yoziladi. Qo‘lda yozish yo‘q.
4.8 ORDER_ITEM (Buyurtma ichidagi xizmat/zapchast)
Nima uchun kerak: Buyurtmada bir nechta xizmat va zapchast bo‘ladi.
Maydonlar:

id
order_id
item_type (product/service/manual_product)
item_id (product yoki service bo‘lsa)
item_name (manual_product bo‘lsa shu yerga nom yoziladi)
quantity
price_at_time (o‘sha paytdagi narx snapshot)
4.9 ORDER_EVENT (Audit log) — MVPda tavsiya
Nima uchun kerak: Kim nima qildi? (kuryer yetkazdi, usta qabul qildi, mijoz tasdiqladi)

id
order_id
actor_user_id (nullable)
event_type
payload (json)
created_at
5) ERP (BOSS DASHBOARD) — TO‘LIQ FUNKSIONALLIK
ERP faqat boss uchun.

5.1 Auth
Login/parol
JWT (access/refresh)
Boss role tekshiruvi (RolesGuard)
5.2 Users (Usta/Kuryer)
Boss quyidagilarni qiladi:

Usta yaratadi: fullname, phone, login, parol, percent_rate, is_active
Kuryer yaratadi: fullname, phone, login, parol, percent_rate, is_active
Tahrirlash (CRUD)
Aktiv/passiv qilish
5.3 Organizations (Tashkilotlar)
Boss:

Tashkilot qo‘shadi: name, contact_person, phone, payment_type
Tahrirlash
Qarzdorlik (balance_due) ko‘rish
5.4 Vehicles (Mashinalar)
Boss:

Organization ichiga kirib mashina qo‘shadi:
plate_number
model
Mashina aktiv/passiv
5.5 Services (Xizmatlar)
Boss:

Xizmat qo‘shadi: name, price
Tahrirlaydi
O‘chiradi (yoki is_active=false)
5.6 Products (Ombor / Zapchast) — MUHIM
Boss zapchast qo‘shadi:

Mahsulot nomi
Kelgan narx (cost_price)
Sotiladigan narx (sale_price)
Qoldiq soni (stock_count)
Minimal limit (min_limit)
Sana (created_at avtomatik)
Boss ERPda ko‘radi:

Qaysi zapchast tugayapti (stock_count <= min_limit) → Alert
5.7 Orders (Buyurtmalar ro‘yxati)
Boss buyurtmalarni ko‘radi:

status
sana
usta (fullname)
kuryer (fullname) agar bo‘lsa
mijoz (client_name, phone)
mashina raqami
tashkilot (agar bo‘lsa)
total_amount
mashina rasmi (car_photo_url)
buyurtma ichidagi xizmat/zapchast ro‘yxati (OrderItem list)
5.8 Client & Vehicle History (Mijozlar/Mashinalar tarixi) — MUHIM
ERPda alohida bo‘lim bo‘ladi:

5.8.1 Vehicle History (tashkilot mashinasi)
Boss mashina tanlaydi:

plate_number
shu mashinaga qachon xizmat qilingan (sana)
qaysi usta qilgan
qaysi xizmatlar
qaysi zapchastlar
mashina rasmi
jami summa
5.8.2 Retail Client History (oddiy mijoz)
Boss telefon raqam yoki mashina raqami orqali qidiradi:

shu mijozga qachon xizmat qilingan
nimalar qilingan
rasm
summa
5.9 Reports / Analitika
Filtrlar:

Sana (from-to)
Usta bo‘yicha
Tashkilot bo‘yicha
Status bo‘yicha
Ko‘rsatkichlar:

kunlik/oylik tushum
usta kesimi
kuryer kesimi
tashkilot qarzi (balance_due)
eng ko‘p qilingan xizmatlar
6) USTA (Telegram Bot + WebApp) — TO‘LIQ FLOW
6.1 Bot Login (Scene)
/start
Bot login so‘raydi
Bot parol so‘raydi
Backend tekshiradi
To‘g‘ri bo‘lsa tg_id userga bog‘lanadi
Menu ochiladi
Master menu:

➕ Yangi buyurtma (WebApp)
📋 Buyurtmalarim
📍 Lokatsiya yuborish (faqat kerak bo‘lsa)
📦 Qabul qildim (faqat kerak statusda)
🔵 Ishni yakunlash (faqat working statusda)
6.2 WebApp — Yangi Buyurtma (Maydonlar)
6.2.1 Mijoz ma’lumotlari (qo‘lda)
client_name (ism/familiya)
client_phone
car_number
car_model (optional)
6.2.2 Tashkilot mashinasi (dropdown tanlash) — MUHIM
Checkbox: “Tashkilot mashinasi”
Agar ON:

Dropdown: Organization list (ERPdan keladi)
Dropdown: Vehicle list (tanlangan org bo‘yicha)
Bu holda:
organization_id yoziladi
vehicle_id yoziladi
car_number/model avtomatik to‘ldirilishi mumkin (ixtiyoriy)
Agar OFF:

Order retail bo‘ladi (organization_id=null, vehicle_id=null)
6.2.3 Xizmatlar
checkbox list (service list)
har bir tanlov OrderItem (service) bo‘ladi
6.2.4 Zapchastlar — 2 xil yo‘l (MUHIM)
Usta zapchast qo‘shishda:

Ombordan tanlaydi (product search + qty)
Qo‘lda yozadi (manual_product):
nomini yozadi
narxini yozadi
qty yozadi
(bu ombor stockiga ta’sir qilmaydi)
6.2.5 Mashina rasmi
kamera orqali rasm
S3/MinIOga yuklanadi
car_photo_url saqlanadi
6.2.6 Dostavka
delivery_needed: Ha/Yo‘q
6.2.7 Saqlash
Yuborish bosilganda:

Order yaratiladi
OrderItems yaratiladi
status = draft
6.3 Lokatsiya yuborish (Bot)
Bot order draft bo‘lsa: “Lokatsiya yuboring”
Usta location yuboradi (lat/lng saqlanadi)
Backend jami summani hisoblaydi
status = waiting_confirmation
Bot: “Jami summa: XXX so‘m. Tasdiqlaysizmi?”
6.4 Usta tasdiqlashi (Bot)
Usta “✅ Tasdiqlayman” bosadi.

Agar delivery_needed = false:
status = working
usta ishni boshlaydi
Agar delivery_needed = true:
status = broadcasted
kuryerlarga yuborish queuega tushadi (BullMQ)
7) KURYER (Telegram Bot) — TO‘LIQ FLOW
7.1 Broadcast xabar (kuryerga keladigan xabar tarkibi) — MUHIM
Kuryerga keladigan xabar ichida quyidagilar bo‘lishi shart:

Buyurtmani yuborgan usta: master_fullname
Ustaning telegram username: @master_username (bo‘lsa)
Mashina raqami
Kerakli zapchastlar ro‘yxati (product + qty + manual_product bo‘lsa ham)
Lokatsiya (Telegram location)
Yetkazish to‘lovi (agar alohida bo‘lsa)
Tugma: ✅ Qabul qilish
7.2 Qabul qilish (Race condition lock)
Bir nechta kuryer bosganda faqat 1 tasi olishi kerak.
Majburiy atomic query:

UPDATE orders
SET driver_id = $driverId, status = 'accepted'
WHERE id = $orderId AND status = 'broadcasted'
RETURNING *;
RETURNING bo‘sh bo‘lsa → “Kech qoldingiz, boshqa kuryer oldi 😔”
7.3 Yetkazdim (Kuryer tasdiqlaydi)
Kuryer usta yoniga borgach bosadi:
👉 🏁 “Yetkazdim”

status = delivered_by_driver
Bot ustaga xabar yuboradi: “Kuryer yetib keldi, qabul qiling”
8) USTA QABUL QILISH (KURYERNI TASDIQLASH)
Agar order status = delivered_by_driver bo‘lsa, usta botida tugma chiqadi:
👉 📦 “Qabul qildim”
Usta bossada:

status = received_by_master
keyin avtomatik status = working (ish jarayoniga o‘tadi)
⚠️ Dostavkali buyurtmada usta qabul qildim bosmasdan turib “Ishni yakunlash” qilolmaydi.
9) ISH JARAYONI (WORKING)
status = working
Usta real ta’mirni qiladi. Tizimda bu davrda faqat:

buyurtma ma’lumotini ko‘rish
kerak bo‘lsa (MVPda optional) qo‘shimcha item qo‘shish (keyincha)
10) ISHNI YAKUNLASH (USTA) → LINK YARATISH
Usta botda bosadi:
👉 🔵 “Ishni yakunlash”
Backend:

confirm_token = UUID
status = waiting_customer_confirmation
Bot ustaga link beradi:
t.me/<bot_username>?start=conf_<UUID>
Usta bu linkni mijozga yuboradi yoki ko‘rsatadi.
11) MIJOZ TASDIQLASH (BOT ORQALI)
Mijoz linkni ochadi.
Bot mijozga chek chiqaradi:

Mashina raqami
Usta ismi
Qilingan xizmatlar ro‘yxati
Qo‘yilgan zapchastlar ro‘yxati
Jami summa
Mijoz bosadi:
👉 ✅ “Tasdiqlayman”
Backend:

status = completed
completed_at = now()
12) OMBOR (STOCK) QOIDASI — MUHIM
Stock kamayishi faqat yakuniy yopilish zanjirida xavfsiz ishlashi kerak.
MVP uchun qat’iy qoida:

Ombordan tanlangan productlar (item_type=product) completed paytida stockdan ayriladi.
Manual yozilgan zapchast (manual_product) stockga ta’sir qilmaydi.
Stock kamayishi Prisma $transaction ichida bo‘lishi shart.
13) MOLIYA HISOBI (COMPLETED PAYTIDA)
Completed bo‘lganda tizim hisoblaydi:

usta_haqi = xizmatlar_summasi * master.percent_rate
kuryer_haqi = delivery_fee * driver.percent_rate (agar delivery bo‘lsa)
boss_foyda = total_amount - usta_haqi - kuryer_haqi
Agar orderda organization_id bo‘lsa:

organization.balance_due += total_amount
Bularning barchasi $transaction ichida.
14) API ENDPOINTLAR (KONTRAKT)
14.1 ADMIN (Boss)
POST /admin/auth/login
POST /admin/users (create master/driver)
PATCH /admin/users/:id
POST /admin/organizations
POST /admin/organizations/:id/vehicles
POST /admin/services
POST /admin/products (name, cost_price, sale_price, stock_count, min_limit)
GET /admin/dashboard
GET /admin/orders (list + filter)
GET /admin/orders/:id (detail + items + photo)
GET /admin/vehicles/:id/history (vehicle service history)
GET /admin/clients/history?phone=&car_number= (retail history)
GET /admin/reports?from=&to=&master_id=&org_id=
14.2 MASTER (WebApp/Bot backend)
GET /webapp/init (services, products, organizations, vehicles)
POST /orders (create draft + items + photo)
POST /orders/:id/location
POST /orders/:id/confirm (master confirm)
POST /orders/:id/receive (usta qabul qildi)
POST /orders/:id/finish (token create)
14.3 DRIVER
POST /driver/orders/:id/accept (atomic)
POST /driver/orders/:id/delivered
14.4 CUSTOMER
GET /customer/confirm/:token (chek data)
POST /customer/confirm/:token (tasdiqlash)
15) STRICT TEXNIK QOIDALAR (BUZILMASIN)
Transactions:
Stock kamayishi + moliya + organization balance — hammasi Prisma $transaction ichida.
Race condition (kuryer accept):
Faqat UPDATE ... WHERE status='broadcasted' RETURNING * bilan.
Avval SELECT qilib keyin UPDATE qilish taqiqlanadi.
Role & Guards:
Admin endpointlar: JWT + RolesGuard (faqat boss).
Bot endpointlar: tg_id orqali master/driver aniqlanadi.
Bot Scenes:
Login, lokatsiya kutish, confirm jarayoni Scenes bilan boshqariladi.
Error handling:
Stock yetmasa → aniq xabar.
Noto‘g‘ri login/parol → aniq xabar.
Token eskirgan/ishlatilgan → aniq xabar.
Snapshot pricing:
OrderItem price_at_time majburiy.
Keyin narx o‘zgarsa ham eski order buzilmaydi.
16) REDIS & BULLMQ (MAQSADI)
Redis:
online driverlar ro‘yxati
session
tezkor flaglar
BullMQ:
broadcast job
ko‘p driverga parallel yuborish
17) DEPLOY (DOCKER COMPOSE)
Servislar:

postgres
redis
minio
api (nestjs)
bot (nestjs-telegraf yoki alohida app)
web (nextjs erp)
webapp (nextjs telegram webapp)
18) MVP CHEGARASI (Hozircha YO‘Q)
MVP ichida bo‘lmaydi:

online payment
sms
AI analytics
murakkab бухгалтерия (ledger)
avtomatik CRM scoring
19) YAKUNIY NATIJA (MVP TAYYOR BO‘LGANDA)
Tizim quyidagilarni 100% bajaradi:

Usta tez buyurtma ochadi (webapp)
Tashkilot bo‘lsa dropdown’dan tanlaydi (to‘g‘ri organization_id)
Zapchastni ombordan tanlaydi yoki qo‘lda ham yozadi
Kuryerga buyurtma kimdan kelgani (usta ismi + username) ko‘rinadi
Kuryer yetkazdim deydi, usta qabul qildim deydi
Usta ishni yakunlab token link yaratadi
Mijoz tasdiqlaydi
Boss ERPda:
buyurtmalar ro‘yxati
mashina tarixi
rasm
xizmatlar/zapchastlar
ombor
tashkilot qarzi
tushum va hisobotlarni ko‘radi
END OF TZ.md shuni tzgfa yuklab quyoraymi