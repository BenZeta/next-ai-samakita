import { PrismaClient, RoomType, TenantStatus, PaymentStatus, PaymentType, ExpenseCategory } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const hashedPassword = await hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      hashedPassword,
      emailVerified: new Date(),
    },
  });

  // Create sample properties
  const properties = await Promise.all([
    prisma.property.create({
      data: {
        name: "Green View Residence",
        description: "Modern apartment complex with stunning garden views and premium amenities.",
        address: "123 Garden Street, Jakarta Selatan",
        location: { lat: -6.2088, lng: 106.8456 },
        facilities: ["Swimming Pool", "Gym", "24/7 Security", "Parking", "Garden"],
        images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
        userId: user.id,
      },
    }),
    prisma.property.create({
      data: {
        name: "Blue Sky Apartments",
        description: "Luxurious high-rise apartments with panoramic city views.",
        address: "456 Sky Avenue, Jakarta Pusat",
        location: { lat: -6.2097, lng: 106.8475 },
        facilities: ["Rooftop Pool", "Fitness Center", "Concierge", "BBQ Area", "Lounge"],
        images: ["https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
        userId: user.id,
      },
    }),
  ]);

  // Create rooms for each property
  for (const property of properties) {
    const rooms = await Promise.all([
      prisma.room.create({
        data: {
          number: "101",
          type: RoomType.standard,
          size: 24,
          amenities: ["AC", "Water Heater", "Bed", "Wardrobe", "TV"],
          price: 3500000,
          propertyId: property.id,
        },
      }),
      prisma.room.create({
        data: {
          number: "102",
          type: RoomType.vip,
          size: 32,
          amenities: ["AC", "Water Heater", "Bed", "Wardrobe", "TV", "Mini Kitchen", "Balcony"],
          price: 4500000,
          propertyId: property.id,
        },
      }),
    ]);

    // Create tenants for some rooms
    await Promise.all([
      prisma.tenant.upsert({
        where: { email: "john@example.com" },
        update: {},
        create: {
          name: "John Doe",
          email: "john@example.com",
          phone: "081234567890",
          ktpNumber: "3171234567890001",
          ktpFile: "https://example.com/ktp/john.jpg",
          roomId: rooms[0].id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
          status: TenantStatus.active,
          references: ["Jane Smith - 081234567891", "Bob Johnson - 081234567892"],
        },
      }),
    ]);

    // Create expenses for each property
    await Promise.all([
      prisma.expense.create({
        data: {
          propertyId: property.id,
          category: ExpenseCategory.electricity,
          amount: 2500000,
          date: new Date(),
          description: "Monthly electricity bill",
          vendor: "PLN",
        },
      }),
      prisma.expense.create({
        data: {
          propertyId: property.id,
          category: ExpenseCategory.maintenance,
          amount: 1500000,
          date: new Date(),
          description: "AC maintenance and repairs",
          vendor: "AC Service Co",
        },
      }),
    ]);
  }

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
