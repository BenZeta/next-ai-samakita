import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentType } from "@prisma/client";

const generateInvoiceSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  dueDate: z.date(),
  type: z.nativeEnum(PaymentType),
  description: z.string().optional(),
});

const updatePaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  status: z.nativeEnum(PaymentStatus),
  paidAmount: z.number().optional(),
  paidAt: z.date().optional(),
  notes: z.string().optional(),
});

export const billingRouter = createTRPCRouter({
  generateInvoice: protectedProcedure.input(generateInvoiceSchema).mutation(async ({ input, ctx }) => {
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
        message: "You do not have permission to generate invoices for this tenant",
      });
    }

    // Create the payment record
    const payment = await db.payment.create({
      data: {
        tenantId: input.tenantId,
        amount: input.amount,
        dueDate: input.dueDate,
        type: input.type,
        status: PaymentStatus.pending,
        description: input.description,
      },
    });

    return payment;
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
            select: {
              name: true,
              email: true,
              room: {
                select: {
                  number: true,
                  property: {
                    select: {
                      name: true,
                    },
                  },
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

  updatePayment: protectedProcedure.input(updatePaymentSchema).mutation(async ({ input, ctx }) => {
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

    const updatedPayment = await db.payment.update({
      where: { id: input.paymentId },
      data: {
        status: input.status,
        paidAmount: input.paidAmount,
        paidAt: input.status === PaymentStatus.paid ? input.paidAt || new Date() : null,
        notes: input.notes,
      },
    });

    return updatedPayment;
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
