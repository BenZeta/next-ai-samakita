import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { TenantStatus, ServiceRequestStatus, PaymentStatus, PaymentType } from "@prisma/client";
import { generateContract } from "@/lib/contracts";
import { sendContractEmail } from "@/lib/email";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, "Invalid Indonesian phone number"),
  ktpNumber: z.string().min(1, "KTP number is required"),
  ktpFile: z.string().url("KTP file URL is required"),
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
  create: protectedProcedure.input(tenantSchema).mutation(async ({ input, ctx }) => {
    const room = await db.room.findUnique({
      where: { id: input.roomId },
      include: {
        property: true,
        tenants: {
          where: {
            status: TenantStatus.active,
            endDate: {
              gt: new Date(),
            },
          },
        },
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

    if (room.tenants.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Room is currently occupied",
      });
    }

    const tenant = await db.tenant.create({
      data: {
        ...input,
        status: TenantStatus.active,
      },
    });

    return tenant;
  }),

  list: protectedProcedure
    .input(
      z.object({
        roomId: z.string().optional(),
        status: z.nativeEnum(TenantStatus).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { roomId, status, search } = input;

      const tenants = await db.tenant.findMany({
        where: {
          ...(roomId ? { roomId } : {}),
          ...(status ? { status } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search, mode: "insensitive" } },
                  { ktpNumber: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
          room: {
            property: {
              userId: ctx.session.user.id,
            },
          },
        },
        include: {
          room: {
            include: {
              property: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return tenants;
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
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

    if (tenant.room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view this tenant",
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
        status: ServiceRequestStatus.pending,
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
          ...(input.status === ServiceRequestStatus.resolved ? { resolvedAt: new Date() } : {}),
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
        status: PaymentStatus.pending,
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
          ...(input.status === PaymentStatus.paid ? { paidAt: new Date() } : {}),
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
      tenant,
      room: tenant.room,
      property: tenant.room.property,
    });

    await db.tenant.update({
      where: { id: input.tenantId },
      data: {
        contractUrl,
        contractStatus: "pending",
      },
    });

    // Send email to tenant with contract
    await sendContractEmail(tenant.email, contractUrl);

    return { contractUrl };
  }),

  signContract: protectedProcedure.input(contractSigningSchema).mutation(async ({ input }) => {
    const tenant = await db.tenant.findUnique({
      where: { id: input.tenantId },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    if (!tenant.contractUrl) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No contract found for signing",
      });
    }

    await db.tenant.update({
      where: { id: input.tenantId },
      data: {
        contractStatus: "signed",
        contractSignedAt: input.signedDate,
        signature: input.signature,
      },
    });

    return { success: true };
  }),
});
