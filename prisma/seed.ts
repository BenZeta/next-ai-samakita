import { PrismaClient, RoomStatus, TenantStatus, PaymentStatus, PaymentType, ExpenseCategory } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const hashedPassword = await hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      hashedPassword,
      emailVerified: new Date(),
    },
  });

  // Create a test property
  const property = await prisma.property.create({
    data: {
      name: "Test Property",
      address: "123 Test Street",
      city: "Test City",
      province: "Test Province",
      postalCode: "12345",
      description: "A test property",
      location: "Test Location",
      userId: user.id,
      dueDate: 5, // Default due date is 5th of each month
    },
  });

  // Create test rooms
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        number: "101",
        floor: 1,
        type: "Standard",
        size: 20,
        price: 1000000,
        status: RoomStatus.AVAILABLE,
        propertyId: property.id,
      },
    }),
    prisma.room.create({
      data: {
        number: "102",
        floor: 1,
        type: "Deluxe",
        size: 25,
        price: 1500000,
        status: RoomStatus.AVAILABLE,
        propertyId: property.id,
      },
    }),
  ]);

  // Create test tenants
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Tenant",
      email: "tenant@example.com",
      phone: "1234567890",
      ktpNumber: "1234567890123456",
      ktpFile: "ktp.jpg",
      status: TenantStatus.ACTIVE,
      roomId: rooms[0].id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: 1000000,
      depositAmount: 2000000,
    },
  });

  // Create test payments
  await prisma.payment.create({
    data: {
      amount: 1000000,
      type: PaymentType.RENT,
      status: PaymentStatus.PAID,
      dueDate: new Date(),
      paidAt: new Date(),
      tenantId: tenant.id,
      propertyId: property.id,
    },
  });

  // Create test expenses
  await prisma.expense.create({
    data: {
      amount: 500000,
      category: ExpenseCategory.UTILITY,
      description: "Electricity bill",
      date: new Date(),
      propertyId: property.id,
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
