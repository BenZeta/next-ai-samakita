import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentMethod, PaymentStatus, PaymentType } from "@prisma/client";
import { createPaymentIntent, retrievePaymentIntent } from "@/lib/stripe";
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

      const payment = await db.payment.create({
        data: {
          ...input,
          status: PaymentStatus.PENDING,
        },
      });

      // If payment method is Stripe, create payment intent
      if (input.method === PaymentMethod.STRIPE) {
        try {
          const stripePayment = await createPaymentIntent({
            amount: payment.amount,
            customerEmail: tenant.email,
            customerName: tenant.name,
            orderId: payment.id,
            description: `${payment.type} payment for ${tenant.room.property.name} - Room ${tenant.room.number}`,
          });

          // Update payment with Stripe details
          await db.payment.update({
            where: { id: payment.id },
            data: {
              stripePaymentId: stripePayment.paymentIntentId,
              stripeClientSecret: stripePayment.clientSecret,
            },
          });

          // Return Stripe payment details
          return {
            ...payment,
            stripeClientSecret: stripePayment.clientSecret,
          };
        } catch (error) {
          console.error("Failed to create Stripe payment:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Stripe payment",
          });
        }
      }

      // Send payment link to tenant
      if (payment.stripePaymentId) {
        const stripeStatus = await retrievePaymentIntent(payment.stripePaymentId);
        
        // Send payment reminder with Stripe link
        await sendPaymentReminder(tenant, payment);

        // Update payment status based on Stripe status
        if (stripeStatus.status === "succeeded") {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(),
            },
          });
        } else if (stripeStatus.status === "canceled") {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.CANCELLED,
            },
          });
        }
      } else {
        // Send regular payment reminder without Stripe link
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

      if (payment.method === PaymentMethod.STRIPE && payment.stripePaymentId) {
        try {
          const status = await retrievePaymentIntent(payment.stripePaymentId);

          // Update payment status based on Stripe status
          if (status.status === "succeeded") {
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
          } else if (status.status === "canceled") {
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
          console.error("Failed to check Stripe payment status:", error);
        }
      }

      return payment;
    }),

  // ... existing code ...
}); 