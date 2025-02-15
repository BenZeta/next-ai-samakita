import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentMethod, PaymentStatus, PaymentType } from "@prisma/client";
import { createMidtransPayment, checkMidtransPaymentStatus } from "@/lib/midtrans";
import { sendPaymentConfirmation, sendPaymentOverdue, sendPaymentReminder } from "@/lib/whatsapp";

export const paymentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(0),
        type: z.nativeEnum(PaymentType),
        tenantId: z.string(),
        propertyId: z.string(),
        dueDate: z.date(),
        method: z.nativeEnum(PaymentMethod),
      })
    )
    .mutation(async ({ input }) => {
      const tenant = await db.tenant.findUnique({
        where: { id: input.tenantId },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const payment = await db.payment.create({
        data: {
          ...input,
          status: PaymentStatus.PENDING,
        },
      });

      // If payment method is Midtrans, create payment in Midtrans
      if (input.method === PaymentMethod.MIDTRANS) {
        try {
          const tenant = await db.tenant.findUnique({
            where: { id: input.tenantId },
            select: {
              name: true,
              email: true,
            },
          });

          if (!tenant) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tenant not found",
            });
          }

          const midtransPayment = await createMidtransPayment({
            orderId: payment.id,
            amount: payment.amount,
            customerName: tenant.name,
            customerEmail: tenant.email,
          });

          // Update payment with Midtrans details
          await db.payment.update({
            where: { id: payment.id },
            data: {
              midtransId: midtransPayment.transaction_id,
              midtransToken: midtransPayment.token,
            },
          });

          // Return Midtrans payment details
          return {
            ...payment,
            midtransRedirectUrl: midtransPayment.redirect_url,
          };
        } catch (error) {
          console.error("Failed to create Midtrans payment:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Midtrans payment",
          });
        }
      }

      // Send payment link to tenant
      if (payment.midtransId && payment.midtransToken) {
        const midtransStatus = await checkMidtransPaymentStatus(payment.midtransId);
        
        // Send payment reminder with Midtrans link
        await sendPaymentReminder(tenant, payment);

        // Update payment status based on Midtrans status
        if (midtransStatus.transaction_status === "settlement") {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(),
            },
          });
        } else if (midtransStatus.transaction_status === "expire" || midtransStatus.transaction_status === "cancel") {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.CANCELLED,
            },
          });
        }
      } else {
        // Send regular payment reminder without Midtrans link
        await sendPaymentReminder(tenant, payment);
      }

      return payment;
    }),

  checkStatus: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ input }) => {
      const payment = await db.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          tenant: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.method === PaymentMethod.MIDTRANS && payment.midtransId) {
        try {
          const status = await checkMidtransPaymentStatus(payment.midtransId);

          // Update payment status based on Midtrans status
          if (status.transaction_status === "settlement") {
            await db.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.PAID,
                paidAt: new Date(),
              },
            });

            // Send WhatsApp payment confirmation
            try {
              await sendPaymentConfirmation(payment.tenant, payment);
            } catch (error) {
              console.error("Failed to send WhatsApp payment confirmation:", error);
            }
          } else if (status.transaction_status === "expire" || status.transaction_status === "cancel") {
            await db.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.CANCELLED,
              },
            });

            // Send WhatsApp payment overdue notification
            try {
              await sendPaymentOverdue(payment.tenant, payment);
            } catch (error) {
              console.error("Failed to send WhatsApp payment overdue notification:", error);
            }
          }
        } catch (error) {
          console.error("Failed to check Midtrans payment status:", error);
        }
      }

      return payment;
    }),

  // ... existing code ...
}); 