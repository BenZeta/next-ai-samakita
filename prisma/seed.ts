import {
  ExpenseCategory,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  RoomStatus,
  TenantStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const hashedPassword = await hash('password123', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@example.com',
      hashedPassword,
      emailVerified: new Date(),
    },
  });

  // Create a test property
  const property = await prisma.property.create({
    data: {
      name: 'Test Property',
      address: '123 Test Street',
      city: 'Test City',
      province: 'Test Province',
      postalCode: '12345',
      description: 'A test property',
      location: 'Test Location',
      userId: user.id,
      dueDate: 5, // Default due date is 5th of each month
    },
  });

  // Create test rooms
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        number: '101',
        floor: 1,
        type: 'Standard',
        size: 20,
        price: 1000000,
        status: RoomStatus.OCCUPIED,
        propertyId: property.id,
      },
    }),
    prisma.room.create({
      data: {
        number: '102',
        floor: 1,
        type: 'Deluxe',
        size: 25,
        price: 1500000,
        status: RoomStatus.OCCUPIED,
        propertyId: property.id,
      },
    }),
  ]);

  // Create test tenants
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 20); // 20th of previous month
  const endDate = new Date(now.getFullYear(), now.getMonth(), 20); // 20th of current month

  const tenants = await Promise.all([
    prisma.tenant.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        ktpNumber: '1234567890123456',
        ktpFile: 'ktp1.jpg',
        status: TenantStatus.ACTIVE,
        roomId: rooms[0].id,
        startDate,
        endDate,
        rentAmount: 1000000,
        depositAmount: 2000000,
      },
    }),
    prisma.tenant.create({
      data: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        ktpNumber: '6543210987654321',
        ktpFile: 'ktp2.jpg',
        status: TenantStatus.ACTIVE,
        roomId: rooms[1].id,
        startDate,
        endDate,
        rentAmount: 1500000,
        depositAmount: 3000000,
      },
    }),
  ]);

  // Create test payments for both tenants
  await Promise.all([
    // Paid rent payments for previous month (when they started)
    prisma.payment.create({
      data: {
        amount: 1000000,
        type: PaymentType.RENT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[0].id,
        propertyId: property.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: 1500000,
        type: PaymentType.RENT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[1].id,
        propertyId: property.id,
      },
    }),
    // Paid deposit payments (paid at start date)
    prisma.payment.create({
      data: {
        amount: 2000000,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[0].id,
        propertyId: property.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: 3000000,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[1].id,
        propertyId: property.id,
      },
    }),
    // Current month rent payments (pending)
    prisma.payment.create({
      data: {
        amount: 1000000,
        type: PaymentType.RENT,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MANUAL,
        dueDate: endDate,
        tenantId: tenants[0].id,
        propertyId: property.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: 1500000,
        type: PaymentType.RENT,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MANUAL,
        dueDate: endDate,
        tenantId: tenants[1].id,
        propertyId: property.id,
      },
    }),
  ]);

  // Create test expenses
  await prisma.expense.create({
    data: {
      amount: 500000,
      category: ExpenseCategory.UTILITY,
      description: 'Electricity bill',
      date: new Date(),
      propertyId: property.id,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
