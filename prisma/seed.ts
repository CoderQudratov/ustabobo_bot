import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const BOSS = {
  login: 'admin',
  password: 'admin123',
  fullname: 'Doston Admin',
  phone: '+998900000001',
  role: 'boss' as const,
  percent_rate: 0,
  balance: 0,
};

const MASTER = {
  login: 'usta1',
  password: 'admin123',
  fullname: 'Usta Bobo',
  phone: '+998900000002',
  role: 'master' as const,
  percent_rate: 10,
  balance: 0,
};

async function main() {
  const bossHash = await bcrypt.hash(BOSS.password, 10);
  const masterHash = await bcrypt.hash(MASTER.password, 10);

  await prisma.user.upsert({
    where: { login: BOSS.login },
    create: {
      login: BOSS.login,
      password_hash: bossHash,
      fullname: BOSS.fullname,
      phone: BOSS.phone,
      role: BOSS.role,
      percent_rate: BOSS.percent_rate,
      balance: BOSS.balance,
    },
    update: {
      password_hash: bossHash,
      fullname: BOSS.fullname,
      phone: BOSS.phone,
      role: BOSS.role,
      percent_rate: BOSS.percent_rate,
      balance: BOSS.balance,
    },
  });

  await prisma.user.upsert({
    where: { login: MASTER.login },
    create: {
      login: MASTER.login,
      password_hash: masterHash,
      fullname: MASTER.fullname,
      phone: MASTER.phone,
      role: MASTER.role,
      percent_rate: MASTER.percent_rate,
      balance: MASTER.balance,
      pin_code: '1234',
      is_authenticated: false,
    },
    update: {
      password_hash: masterHash,
      fullname: MASTER.fullname,
      phone: MASTER.phone,
      role: MASTER.role,
      percent_rate: MASTER.percent_rate,
      balance: MASTER.balance,
      pin_code: '1234',
      is_authenticated: false,
    },
  });

  console.log('Seed completed: Boss (admin) and Master (usta1) created/updated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
