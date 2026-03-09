/**
 * Ustabobo admin yaratadi yoki parolini yangilaydi.
 * Ishga tushirish: npx tsx scripts/create-ustabobo.ts
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL muhit o‘zgaruvchisi berilgani shart');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const LOGIN = 'ustabobo';
const PASSWORD = 'umid2526';

async function main() {
  const password_hash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.upsert({
    where: { login: LOGIN },
    create: {
      login: LOGIN,
      password_hash,
      fullname: 'Ustabobo Admin',
      phone: '+998901234567',
      role: 'boss',
      percent_rate: 0,
      balance: 0,
    },
    update: {
      password_hash,
      fullname: 'Ustabobo Admin',
      phone: '+998901234567',
      role: 'boss',
    },
  });
  console.log(`Foydalanuvchi "${LOGIN}" yaratildi/yangilandi. Parol: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
