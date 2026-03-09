import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Birinchi tenant yaratish
  const existing = await prisma.tenant.findFirst();
  if (existing) {
    console.log('Tenant allaqachon bor:', existing.id);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Asosiy Ustaxona',
      is_active: true,
      plan_expires: new Date('2027-01-01'),
    },
  });
  console.log('Tenant yaratildi:', tenant.id);

  // 2. Barcha mavjud ma'lumotlarni bog'lash
  const [u, o, org, v, s, p] = await Promise.all([
    prisma.user.updateMany({
      where: { tenant_id: null },
      data: { tenant_id: tenant.id },
    }),
    prisma.order.updateMany({
      where: { tenant_id: null },
      data: { tenant_id: tenant.id },
    }),
    prisma.organization.updateMany({
      where: { tenant_id: null },
      data: { tenant_id: tenant.id },
    }),
    prisma.vehicle.updateMany({
      where: { tenant_id: null },
      data: { tenant_id: tenant.id },
    }),
    prisma.service.updateMany({
      where: { tenant_id: null },
      data: { tenant_id: tenant.id },
    }),
    prisma.product.updateMany({
      where: { tenant_id: null },
      data: { tenant_id: tenant.id },
    }),
  ]);

  console.log('Yangilandi:', {
    users: u.count,
    orders: o.count,
    orgs: org.count,
    vehicles: v.count,
    services: s.count,
    products: p.count,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
