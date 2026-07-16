import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-agency' },
    update: {},
    create: {
      name: 'Demo Agency',
      slug: 'demo-agency',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Tenant:', tenant.slug);

  // Create owner user
  const ownerHash = await bcrypt.hash('Password123!', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo-agency.com' },
    update: {},
    create: {
      email: 'owner@demo-agency.com',
      displayName: 'Agency Owner',
      passwordHash: ownerHash,
      status: 'ACTIVE',
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Owner:', owner.email);

  // Create employee user
  const empHash = await bcrypt.hash('Password123!', 12);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@demo-agency.com' },
    update: {},
    create: {
      email: 'employee@demo-agency.com',
      displayName: 'John Employee',
      passwordHash: empHash,
      status: 'ACTIVE',
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: employee.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: employee.id,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Employee:', employee.email);

  // Create client user
  const clientHash = await bcrypt.hash('Password123!', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      displayName: 'Jane Client',
      passwordHash: clientHash,
      status: 'ACTIVE',
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: client.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: client.id,
      role: 'CLIENT',
      status: 'ACTIVE',
    },
  });
  console.log('✓ Client:', client.email);

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Owner:    owner@demo-agency.com / Password123!');
  console.log('  Employee: employee@demo-agency.com / Password123!');
  console.log('  Client:   client@example.com / Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
