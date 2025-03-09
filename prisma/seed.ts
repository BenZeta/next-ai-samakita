import {
  ContractStatus,
  ExpenseCategory,
  PaymentFrequency,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  RoomStatus,
  RoomType,
  TenantStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if test user already exists
  let user = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  // Create a test user if it doesn't exist
  if (!user) {
    const hashedPassword = await hash('password123', 12);
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        hashedPassword,
        emailVerified: new Date(),
      },
    });
    console.log('Created test user');
  } else {
    console.log('Using existing test user');
  }

  // Check if test property already exists
  let property = await prisma.property.findFirst({
    where: {
      userId: user.id,
      name: 'Test Property',
    },
  });

  // Create a test property if it doesn't exist
  if (!property) {
    property = await prisma.property.create({
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
    console.log('Created test property');
  } else {
    console.log('Using existing test property');
  }

  // Check if test rooms already exist
  const existingRooms = await prisma.room.findMany({
    where: { propertyId: property.id },
    take: 2,
  });

  // Create test rooms if they don't exist
  let rooms = existingRooms;
  if (existingRooms.length < 2) {
    const roomsToCreate = [
      {
        number: '101',
        floor: 1,
        type: RoomType.STANDARD,
        size: 20,
        price: 1000000,
        status: RoomStatus.AVAILABLE,
        propertyId: property.id,
      },
      {
        number: '102',
        floor: 1,
        type: RoomType.DELUXE,
        size: 25,
        price: 1500000,
        status: RoomStatus.AVAILABLE,
        propertyId: property.id,
      },
    ].slice(existingRooms.length);

    const newRooms = await Promise.all(
      roomsToCreate.map(room => prisma.room.create({ data: room }))
    );

    rooms = [...existingRooms, ...newRooms];
    console.log(`Created ${newRooms.length} test rooms`);
  } else {
    console.log('Using existing test rooms');
  }

  // Check if test tenants already exist
  const existingTenants = await prisma.tenant.findMany({
    where: { roomId: { in: rooms.map(r => r.id) } },
    include: { room: true },
    take: 2,
  });

  // Create test tenants if they don't exist
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 20); // 20th of previous month
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 20); // 20th of current month next year

  let tenants = existingTenants;
  if (existingTenants.length < 2) {
    const tenantsToCreate = [
      {
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
      {
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
    ].slice(existingTenants.length);

    const newTenants = await Promise.all(
      tenantsToCreate.map(async (tenant, index) => {
        // Update room status
        await prisma.room.update({
          where: { id: rooms[existingTenants.length + index].id },
          data: { status: RoomStatus.OCCUPIED },
        });

        // Create tenant
        return prisma.tenant.create({
          data: tenant,
          include: { room: true },
        });
      })
    );

    tenants = [...existingTenants, ...newTenants];
    console.log(`Created ${newTenants.length} test tenants`);
  } else {
    console.log('Using existing test tenants');
  }

  // Check if test contracts already exist
  const existingContracts = await prisma.contract.findMany({
    where: { tenantId: { in: tenants.map(t => t.id) } },
    take: 2,
  });

  // Create contracts for tenants if they don't exist
  let contracts = existingContracts;
  if (existingContracts.length < 2) {
    const contractsToCreate = [
      {
        tenantId: tenants[0].id,
        roomId: rooms[0].id,
        propertyId: property.id,
        startDate,
        endDate,
        totalAmount: 12000000, // 1M x 12 months
        depositAmount: 2000000,
        status: ContractStatus.ACTIVE,
        documentUrl: 'contract1.pdf',
      },
      {
        tenantId: tenants[1].id,
        roomId: rooms[1].id,
        propertyId: property.id,
        startDate,
        endDate,
        totalAmount: 18000000, // 1.5M x 12 months
        depositAmount: 3000000,
        status: ContractStatus.ACTIVE,
        documentUrl: 'contract2.pdf',
      },
    ].slice(existingContracts.length);

    const newContracts = await Promise.all(
      contractsToCreate.map(contract => prisma.contract.create({ data: contract }))
    );

    contracts = [...existingContracts, ...newContracts];
    console.log(`Created ${newContracts.length} test contracts`);
  } else {
    console.log('Using existing test contracts');
  }

  // Check if payment schedules already exist
  const existingSchedules = await prisma.paymentSchedule.findMany({
    where: { contractId: { in: contracts.map(c => c.id) } },
    take: 2,
  });

  // Create payment schedules if they don't exist
  if (existingSchedules.length < 2) {
    const schedulesToCreate = [
      {
        contractId: contracts[0].id,
        frequency: PaymentFrequency.MONTHLY,
        dayOfMonth: 5,
        startDate,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 5), // 5th of current month
        amount: 1000000,
        totalPayments: 12,
        remainingPayments: 11,
      },
      {
        contractId: contracts[1].id,
        frequency: PaymentFrequency.MONTHLY,
        dayOfMonth: 5,
        startDate,
        nextDueDate: new Date(now.getFullYear(), now.getMonth(), 5), // 5th of current month
        amount: 1500000,
        totalPayments: 12,
        remainingPayments: 11,
      },
    ].slice(existingSchedules.length);

    const newSchedules = await Promise.all(
      schedulesToCreate.map(schedule => prisma.paymentSchedule.create({ data: schedule }))
    );

    console.log(`Created ${newSchedules.length} payment schedules`);
  } else {
    console.log('Using existing payment schedules');
  }

  // Check if payments already exist
  const existingPayments = await prisma.payment.findMany({
    where: { contractId: { in: contracts.map(c => c.id) } },
  });

  // Create test payments if they don't exist
  if (existingPayments.length < 6) {
    const paymentsToCreate = [
      // Paid rent payments for previous month (when they started)
      {
        amount: 1000000,
        type: PaymentType.RENT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[0].id,
        propertyId: property.id,
        contractId: contracts[0].id,
      },
      {
        amount: 1500000,
        type: PaymentType.RENT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[1].id,
        propertyId: property.id,
        contractId: contracts[1].id,
      },
      // Paid deposit payments (paid at start date)
      {
        amount: 2000000,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[0].id,
        propertyId: property.id,
        contractId: contracts[0].id,
      },
      {
        amount: 3000000,
        type: PaymentType.DEPOSIT,
        status: PaymentStatus.PAID,
        method: PaymentMethod.MANUAL,
        dueDate: startDate,
        paidAt: startDate,
        tenantId: tenants[1].id,
        propertyId: property.id,
        contractId: contracts[1].id,
      },
      // Current month rent payments (pending)
      {
        amount: 1000000,
        type: PaymentType.RENT,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MANUAL,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 5), // 5th of current month
        tenantId: tenants[0].id,
        propertyId: property.id,
        contractId: contracts[0].id,
      },
      {
        amount: 1500000,
        type: PaymentType.RENT,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MANUAL,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 5), // 5th of current month
        tenantId: tenants[1].id,
        propertyId: property.id,
        contractId: contracts[1].id,
      },
    ];

    await Promise.all(paymentsToCreate.map(payment => prisma.payment.create({ data: payment })));

    console.log(`Created ${paymentsToCreate.length} test payments`);
  } else {
    console.log('Using existing payments');
  }

  // Check if expenses already exist
  const existingExpenses = await prisma.expense.count({
    where: { userId: user.id },
  });

  // Create test expenses if they don't exist
  if (existingExpenses < 2) {
    await prisma.expense.create({
      data: {
        amount: 500000,
        category: ExpenseCategory.ELECTRICITY,
        description: 'Electricity bill',
        date: new Date(),
        propertyId: property.id,
        userId: user.id,
      },
    });

    // Create a general expense not tied to a property
    await prisma.expense.create({
      data: {
        amount: 250000,
        category: ExpenseCategory.OFFICE_SUPPLIES,
        description: 'Office supplies',
        date: new Date(),
        userId: user.id,
      },
    });

    console.log('Created test expenses');
  } else {
    console.log('Using existing expenses');
  }

  // Check if contract template already exists
  const existingTemplate = await prisma.contractTemplate.findFirst({
    where: { userId: user.id },
  });

  // Create a contract template if it doesn't exist
  if (!existingTemplate) {
    await prisma.contractTemplate.create({
      data: {
        name: 'Standard Yearly Contract',
        description: 'Template for standard yearly rental contracts',
        userId: user.id,
        content: 'This is a sample contract template with placeholder content.',
        isDefault: true,
      },
    });

    console.log('Created contract template');
  } else {
    console.log('Using existing contract template');
  }

  // Check if configuration already exists
  const existingConfig = await prisma.configuration.findFirst({
    where: {
      userId: user.id,
      propertyId: property.id,
    },
  });

  // Create a configuration for the property if it doesn't exist
  if (!existingConfig) {
    await prisma.configuration.create({
      data: {
        userId: user.id,
        propertyId: property.id,
        name: 'Default Payment Settings',
        description: 'Default payment configuration for the property',
        settings: {
          defaultDueDay: 5,
          allowPartialPayments: true,
          gracePeriod: 3,
          lateFee: 50000,
          allowedPaymentMethods: ['MANUAL', 'BANK_TRANSFER'],
        },
      },
    });

    console.log('Created property configuration');
  } else {
    console.log('Using existing property configuration');
  }

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
