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

const SUPER_ADMIN_PHONE = '+998000000000';
const SUPER_ADMIN_LOGIN = 'superadmin';
const SUPER_ADMIN_PASSWORD = 'SUPER_ADMIN_PAROL_BUNI_OZGARTIR';

async function main() {
  const existing = await prisma.user.findFirst({
    where: { is_super_admin: true },
  });
  if (existing) {
    console.log('Super admin allaqachon bor:', existing.login);
    return;
  }

  const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const sa = await prisma.user.create({
    data: {
      fullname: 'Super Admin',
      phone: SUPER_ADMIN_PHONE,
      login: SUPER_ADMIN_LOGIN,
      password_hash: hash,
      role: 'boss',
      percent_rate: 0,
      is_super_admin: true,
      is_active: true,
      tenant_id: null,
    },
  });
  console.log('✅ Super admin yaratildi. Login:', sa.login);
  console.log('   Parol:', SUPER_ADMIN_PASSWORD);
  console.log('   ⚠️  Ishlatishdan oldin parolni o\'zgartiring.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
