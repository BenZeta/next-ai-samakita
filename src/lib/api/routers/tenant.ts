import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { TenantStatus, ServiceRequestStatus, PaymentStatus, PaymentType } from "@prisma/client";
import { generateContract } from "@/lib/contract";
import { sendContractEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { propertySchema, userSchema } from "@/lib/contracts";
import { Prisma } from "@prisma/client";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, "Invalid Indonesian phone number"),
  ktpNumber: z.string().optional(),
  ktpFile: z.string().url("Invalid KTP file URL").optional(),
  kkFile: z.string().url("Invalid KK file URL").optional(),
  references: z.array(z.string()),
  roomId: z.string().min(1, "Room ID is required"),
  startDate: z.date(),
  endDate: z.date(),
});

const checkInItemSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  itemName: z.string().min(1, "Item name is required"),
  condition: z.string().min(1, "Condition is required"),
  notes: z.string().optional(),
});

const serviceRequestSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  type: z.string().min(1, "Request type is required"),
  description: z.string().min(1, "Description is required"),
});

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  dueDate: z.date(),
  type: z.nativeEnum(PaymentType),
});

const contractSigningSchema = z.object({
  tenantId: z.string(),
  signature: z.string(),
  signedDate: z.date(),
});

export const tenantRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        phone: z.string().min(1, "Phone number is required"),
        ktpNumber: z.string().optional(),
        ktpFile: z.string().url("Invalid KTP file URL").optional(),
        kkFile: z.string().url("Invalid KK file URL").optional(),
        rentAmount: z.number().min(1, "Rent amount is required"),
        depositAmount: z.number().min(1, "Deposit amount is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
        references: z.array(z.string()).optional(),
        roomId: z.string().min(1, "Room ID is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { roomId, startDate, endDate, rentAmount, depositAmount, ...tenantData } = input;

      // Get room details and verify ownership
      const room = await db.room.findUnique({
        where: { id: roomId },
        include: {
          property: true,
        },
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to add tenants to this room",
        });
      }

      // Create tenant and lease in a transaction
      const result = await db.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            ...tenantData,
            roomId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            rentAmount,
            depositAmount,
            status: "ACTIVE",
          },
        });

        // Create initial rent payment
        await tx.payment.create({
          data: {
            tenantId: tenant.id,
            propertyId: room.property.id,
            amount: rentAmount,
            type: "RENT",
            status: "PENDING",
            dueDate: new Date(startDate),
          },
        });

        // Create deposit payment
        await tx.payment.create({
          data: {
            tenantId: tenant.id,
            propertyId: room.property.id,
            amount: depositAmount,
            type: "DEPOSIT",
            status: "PENDING",
            dueDate: new Date(startDate),
          },
        });

        // Update room status
        await tx.room.update({
          where: { id: roomId },
          data: { status: "OCCUPIED" },
        });

        return tenant;
      });

      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        roomId: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { roomId, status, search } = input;

      const where: Prisma.TenantWhereInput = {
        ...(roomId ? { roomId } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      };

      const tenants = await db.tenant.findMany({
        where,
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return tenants;
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const tenant = await db.tenant.findUnique({
        where: { id: input.id },
        include: {
          room: {
            include: {
              property: true,
            },
          },
          checkInItems: true,
        },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      return tenant;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: tenantSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenant = await db.tenant.findUnique({
        where: { id: input.id },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      if (tenant.room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this tenant",
        });
      }

      return db.tenant.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  addCheckInItem: protectedProcedure.input(checkInItemSchema).mutation(async ({ input, ctx }) => {
    const tenant = await db.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    if (tenant.room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to add check-in items for this tenant",
      });
    }

    return db.checkInItem.create({
      data: {
        tenantId: input.tenantId,
        itemName: input.itemName,
        condition: input.condition,
        notes: input.notes,
      },
    });
  }),

  createServiceRequest: protectedProcedure.input(serviceRequestSchema).mutation(async ({ input, ctx }) => {
    const tenant = await db.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    if (tenant.room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to create service requests for this tenant",
      });
    }

    return db.serviceRequest.create({
      data: {
        ...input,
        status: ServiceRequestStatus.PENDING,
      },
    });
  }),

  updateServiceRequest: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(ServiceRequestStatus),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const serviceRequest = await db.serviceRequest.findUnique({
        where: { id: input.id },
        include: {
          tenant: {
            include: {
              room: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      });

      if (!serviceRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service request not found",
        });
      }

      if (serviceRequest.tenant.room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this service request",
        });
      }

      return db.serviceRequest.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === ServiceRequestStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
        },
      });
    }),

  createPayment: protectedProcedure.input(paymentSchema).mutation(async ({ input, ctx }) => {
    const tenant = await db.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    if (tenant.room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to create payments for this tenant",
      });
    }

    return db.payment.create({
      data: {
        ...input,
        status: PaymentStatus.PENDING,
        propertyId: tenant.room.property.id,
      },
    });
  }),

  updatePayment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(PaymentStatus),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const payment = await db.payment.findUnique({
        where: { id: input.id },
        include: {
          tenant: {
            include: {
              room: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.tenant.room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this payment",
        });
      }

      return db.payment.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === PaymentStatus.PAID ? { paidAt: new Date() } : {}),
        },
      });
    }),

  generateContract: protectedProcedure.input(z.object({ tenantId: z.string() })).mutation(async ({ input }) => {
    const tenant = await db.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    const contractUrl = await generateContract({
      user: userSchema.parse({
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        ktpNumber: tenant.ktpNumber,
        image: null,
        hashedPassword: null,
        emailVerified: null,
        role: "user",
      }),
      property: tenant.room.property,
      transaction: {
        id: tenant.id,
        userId: tenant.room.property.userId,
        propertyId: tenant.room.property.id,
        status: "PENDING",
        contractUrl: null,
        amount: tenant.rentAmount || 0,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    });

    await db.tenant.update({
      where: { id: input.tenantId },
      data: {
        contractFile: contractUrl,
        contractSigned: false,
      },
    });

    // Send email to tenant with contract
    await sendContractEmail(tenant.email, contractUrl);

    return { contractUrl };
  }),

  signContract: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        signature: z.string(),
        signedDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const { tenantId, signature, signedDate } = input;

      const tenant = await db.tenant.update({
        where: { id: tenantId },
        data: {
          contractSigned: true,
          contractSignedAt: signedDate,
          signature,
        },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      return tenant;
    }),

  getOverview: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const { propertyId, status } = input;
      const now = new Date();

      // Get tenants with filtering
      const tenants = await prisma.tenant.findMany({
        where: {
          room: {
            propertyId: propertyId,
          },
          ...(status
            ? {
                status,
              }
            : {}),
        },
        include: {
          room: true,
          leases: {
            orderBy: {
              startDate: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      // Get tenant statistics
      const stats = {
        total: await prisma.tenant.count({
          where: {
            room: {
              propertyId: propertyId,
            },
          },
        }),
        active: await prisma.tenant.count({
          where: {
            room: {
              propertyId: propertyId,
            },
            status: "ACTIVE",
          },
        }),
        inactive: await prisma.tenant.count({
          where: {
            room: {
              propertyId: propertyId,
            },
            status: "INACTIVE",
          },
        }),
        upcomingMoveIns: await prisma.lease.count({
          where: {
            tenant: {
              room: {
                propertyId: propertyId,
              },
            },
            startDate: {
              gt: now,
            },
          },
        }),
        upcomingMoveOuts: await prisma.lease.count({
          where: {
            tenant: {
              room: {
                propertyId: propertyId,
              },
            },
            endDate: {
              gt: now,
              lt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
            },
          },
        }),
      };

      return {
        tenants: tenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          status: tenant.status,
          roomNumber: tenant.room.number,
          leaseStart: tenant.leases[0]?.startDate ?? new Date(),
          leaseEnd: tenant.leases[0]?.endDate ?? new Date(),
          rentAmount: tenant.leases[0]?.rentAmount ?? 0,
        })),
        stats,
      };
    }),
});
