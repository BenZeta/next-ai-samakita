import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentType, TenantStatus } from "@prisma/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

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
        propertyId: tenant.room.property.id,
        status: PaymentStatus.PENDING,
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

  generateRent: protectedProcedure.mutation(async ({ ctx }) => {
    const activeTenants = await db.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
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

    const dueDate = new Date();
    dueDate.setDate(5); // Due on the 5th of next month
    if (dueDate.getDate() < 5) {
      dueDate.setMonth(dueDate.getMonth());
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    await Promise.all(
      activeTenants.map((tenant) =>
        db.payment.create({
          data: {
            tenantId: tenant.id,
            propertyId: tenant.room.property.id,
            amount: tenant.room.price,
            dueDate,
            type: PaymentType.RENT,
            status: PaymentStatus.PENDING,
          },
        })
      )
    );

    return { success: true };
  }),

  getStats: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["week", "month", "year"]),
      })
    )
    .query(async ({ input, ctx }) => {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (input.timeRange) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      const [totalRevenue, pendingPayments, dueThisWeek, overduePayments] = await Promise.all([
        db.payment
          .aggregate({
            where: {
              status: PaymentStatus.PAID,
              paidAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
          })
          .then((result) => result._sum.amount || 0),

        db.payment.count({
          where: {
            status: PaymentStatus.PENDING,
          },
        }),

        db.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            dueDate: {
              gte: startOfWeek(now),
              lte: endOfWeek(now),
            },
          },
        }),

        db.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            dueDate: {
              lt: now,
            },
          },
        }),
      ]);

      return {
        totalRevenue,
        pendingPayments,
        dueThisWeek,
        overduePayments,
      };
    }),
});
