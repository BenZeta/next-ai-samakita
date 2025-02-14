import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentType } from "@prisma/client";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  type: z.nativeEnum(PaymentType),
  dueDate: z.date(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const billingRouter = createTRPCRouter({
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

  getPayments: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        status: z.nativeEnum(PaymentStatus).optional(),
        type: z.nativeEnum(PaymentType).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { tenantId, status, type, startDate, endDate } = input;

      const payments = await db.payment.findMany({
        where: {
          ...(tenantId ? { tenantId } : {}),
          ...(status ? { status } : {}),
          ...(type ? { type } : {}),
          ...(startDate || endDate
            ? {
                dueDate: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              }
            : {}),
          tenant: {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
        },
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
        orderBy: {
          dueDate: "desc",
        },
      });

      return payments;
    }),

  updatePayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
        status: z.nativeEnum(PaymentStatus),
        paidAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const payment = await db.payment.findUnique({
        where: { id: input.paymentId },
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
        where: { id: input.paymentId },
        data: {
          status: input.status,
          paidAt: input.paidAt,
        },
      });
    }),

  generateRecurringInvoices: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all active tenants
    const activeTenants = await db.tenant.findMany({
      where: {
        status: "active",
        room: {
          property: {
            userId: ctx.session.user.id,
          },
        },
      },
      include: {
        room: true,
      },
    });

    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // First day of next month

    // Generate rent invoices for each active tenant
    const invoices = await Promise.all(
      activeTenants.map((tenant) =>
        db.payment.create({
          data: {
            tenantId: tenant.id,
            amount: tenant.room.price,
            dueDate,
            type: PaymentType.rent,
            status: PaymentStatus.pending,
            description: `Monthly rent for ${dueDate.toLocaleString("default", { month: "long", year: "numeric" })}`,
          },
        })
      )
    );

    return invoices;
  }),
});
