import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { TenantStatus, ServiceRequestStatus, PaymentStatus, PaymentType } from "@prisma/client";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, "Invalid Indonesian phone number"),
  ktpNumber: z.string().min(16, "Invalid KTP number").max(16, "Invalid KTP number"),
  ktpFile: z.string().url("Invalid KTP file URL"),
  kkFile: z.string().url("Invalid KK file URL").optional(),
  references: z.array(z.string()).min(1, "At least one reference is required"),
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

export const tenantRouter = createTRPCRouter({
  create: protectedProcedure.input(tenantSchema).mutation(async ({ input, ctx }) => {
    // Check if room exists and is available
    const room = await db.room.findUnique({
      where: { id: input.roomId },
      include: {
        property: true,
        tenants: {
          where: {
            status: "active",
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
        code: "CONFLICT",
        message: "Room is already occupied",
      });
    }

    // Check if tenant with same KTP number already exists
    const existingTenant = await db.tenant.findUnique({
      where: { ktpNumber: input.ktpNumber },
    });

    if (existingTenant) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Tenant with this KTP number already exists",
      });
    }

    return db.tenant.create({
      data: {
        ...input,
        status: TenantStatus.pending,
      },
    });
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
                OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { ktpNumber: { contains: search } }],
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
              property: true,
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
        serviceRequests: true,
        payments: true,
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
      data: input,
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
});
