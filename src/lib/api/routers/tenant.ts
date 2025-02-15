import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { TenantStatus, ServiceRequestStatus, PaymentStatus, PaymentType, PaymentMethod, Prisma } from "@prisma/client";
import { generateContract } from "@/lib/contract";
import { sendContractEmail, sendInvoiceEmail } from "@/lib/email";
import { propertySchema, userSchema } from "@/lib/contracts";
import { supabase } from "@/lib/supabase";

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
        rentAmount: z.number(),
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

      // Verify that the provided rent amount matches the room price
      if (rentAmount !== room.price) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rent amount must match the room price",
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

        // Calculate first rent due date based on property's dueDate setting
        const now = new Date();
        const firstRentDueDate = new Date(now.getFullYear(), now.getMonth() + 1, room.property.dueDate);

        // Create initial rent payment with next month's due date
        await tx.payment.create({
          data: {
            tenantId: tenant.id,
            propertyId: room.property.id,
            amount: rentAmount,
            type: "RENT",
            status: "PENDING",
            dueDate: firstRentDueDate,
          },
        });

        // Create deposit payment with immediate due date
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

  createRentPayment: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        paymentMethod: z.nativeEnum(PaymentMethod),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where: { id: input.tenantId },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      if (!tenant || !tenant.room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant or room not found",
        });
      }

      if (tenant.room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create payments for this tenant",
        });
      }

      // Calculate due date based on property's dueDate setting
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), tenant.room.property.dueDate);
      if (dueDate < now) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Create payment
      const payment = await ctx.db.payment.create({
        data: {
          amount: tenant.rentAmount || tenant.room.price,
          type: PaymentType.RENT,
          status: PaymentStatus.PENDING,
          method: input.paymentMethod,
          dueDate,
          tenantId: tenant.id,
          propertyId: tenant.room.propertyId,
        },
      });

      // Generate Midtrans payment link if needed
      let paymentLink: string | undefined;
      if (input.paymentMethod === PaymentMethod.MIDTRANS) {
        // TODO: Implement Midtrans integration
        // paymentLink = await createMidtransPayment(payment);
      }

      // Send invoice email
      await sendInvoiceEmail({
        email: tenant.email,
        tenantName: tenant.name,
        propertyName: tenant.room.property.name,
        roomNumber: tenant.room.number,
        amount: payment.amount,
        dueDate: payment.dueDate,
        paymentLink,
        paymentType: payment.type,
        invoiceNumber: `INV-${payment.id}`,
      });

      return payment;
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

    const property = tenant.room.property;
    const contractUrl = await generateContract({
      user: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        ktpNumber: tenant.ktpNumber,
      },
      property: {
        name: property.name,
        description: property.description,
        address: property.address,
        city: property.city || "Unknown",
        province: property.province || "Unknown",
        postalCode: property.postalCode || "Unknown",
        facilities: property.facilities,
      },
      transaction: {
        id: tenant.id,
        amount: tenant.rentAmount || 0,
        createdAt: tenant.createdAt,
      },
    });

    // Update tenant with contract URL
    const updatedTenant = await db.tenant.update({
      where: { id: input.tenantId },
      data: {
        contractFile: contractUrl,
      },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    try {
      // Try to send email but don't fail if it doesn't work
      await sendContractEmail(
        updatedTenant.email,
        contractUrl,
        updatedTenant.name,
        updatedTenant.room.property.name,
        updatedTenant.id
      );
    } catch (error) {
      console.error("Failed to send contract email:", error);
      // Don't throw the error - we still want to return the contract URL
    }

    return updatedTenant;
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
      const tenants = await db.tenant.findMany({
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
        total: await db.tenant.count({
          where: {
            room: {
              propertyId: propertyId,
            },
          },
        }),
        active: await db.tenant.count({
          where: {
            room: {
              propertyId: propertyId,
            },
            status: "ACTIVE",
          },
        }),
        inactive: await db.tenant.count({
          where: {
            room: {
              propertyId: propertyId,
            },
            status: "INACTIVE",
          },
        }),
        upcomingMoveIns: await db.lease.count({
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
        upcomingMoveOuts: await db.lease.count({
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

  uploadContract: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        file: z.string(), // base64 encoded PDF
      })
    )
    .mutation(async ({ input }) => {
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

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(input.file, "base64");
      const contractKey = `${tenant.id}-${Date.now()}-signed.pdf`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(contractKey, fileBuffer, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload contract: ${uploadError.message}`,
        });
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("contracts")
        .getPublicUrl(contractKey);

      // Update tenant with the signed contract URL
      const updatedTenantWithSignedContract = await db.tenant.update({
        where: { id: input.tenantId },
        data: {
          contractFile: publicUrl,
        },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      return updatedTenantWithSignedContract;
    }),

  sendInvoice: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        paymentMethod: z.nativeEnum(PaymentMethod),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where: { id: input.tenantId },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      if (!tenant || !tenant.room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant or room not found",
        });
      }

      // Calculate due date based on property's dueDate setting
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), tenant.room.property.dueDate);
      if (dueDate < now) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Create payment
      const payment = await ctx.db.payment.create({
        data: {
          amount: tenant.rentAmount || tenant.room.price,
          type: PaymentType.RENT,
          status: PaymentStatus.PENDING,
          method: input.paymentMethod,
          dueDate,
          tenantId: tenant.id,
          propertyId: tenant.room.propertyId,
        },
      });

      // Generate Midtrans payment link if needed
      let paymentLink: string | undefined;
      if (input.paymentMethod === PaymentMethod.MIDTRANS) {
        // TODO: Implement Midtrans integration
        // paymentLink = await createMidtransPayment(payment);
      }

      // Send invoice email
      await sendInvoiceEmail({
        email: tenant.email,
        tenantName: tenant.name,
        propertyName: tenant.room.property.name,
        roomNumber: tenant.room.number,
        amount: payment.amount,
        dueDate: payment.dueDate,
        paymentLink,
        paymentType: payment.type,
        invoiceNumber: `INV-${payment.id}`,
      });

      return payment;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const tenants = await ctx.db.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
        room: {
          property: {
            userId: ctx.session.user.id,
          },
        },
      },
      include: {
        room: true,
        payments: {
          where: {
            status: {
              in: ["PENDING", "OVERDUE"],
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return tenants;
  }),
});
