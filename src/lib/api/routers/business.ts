import { db } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  type: z.enum(['personal', 'company']),
  taxId: z.string().optional(),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  documents: z.object({
    businessLicense: z.string().url().optional(),
    taxDocument: z.string().url().optional(),
    propertyDocument: z.string().url().optional(),
  }),
});

const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Property address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  description: z.string().optional(),
});

export const businessRouter = createTRPCRouter({
  verify: protectedProcedure
    .input(
      z.object({
        business: businessSchema,
        property: propertySchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { business, property } = input;

      // Create business profile and property in a transaction
      const result = await db.$transaction(async tx => {
        // Create or update business profile
        const businessProfile = await tx.businessProfile.upsert({
          where: {
            userId: ctx.session.user.id,
          },
          create: {
            userId: ctx.session.user.id,
            name: business.name,
            type: business.type,
            taxId: business.taxId,
            phoneNumber: business.phoneNumber,
            address: business.address,
            businessLicense: business.documents.businessLicense,
            taxDocument: business.documents.taxDocument,
            propertyDocument: business.documents.propertyDocument,
            verificationStatus: 'VERIFIED',
          },
          update: {
            name: business.name,
            type: business.type,
            taxId: business.taxId,
            phoneNumber: business.phoneNumber,
            address: business.address,
            businessLicense: business.documents.businessLicense,
            taxDocument: business.documents.taxDocument,
            propertyDocument: business.documents.propertyDocument,
            verificationStatus: 'VERIFIED',
          },
        });

        let newProperty = null;
        if (property) {
          // Create property only if provided
          newProperty = await tx.property.create({
            data: {
              userId: ctx.session.user.id,
              name: property.name,
              address: property.address,
              city: property.city,
              province: property.province,
              postalCode: property.postalCode,
              description: property.description,
              dueDateOffset: 5, // Payment is due 5 days after billing cycle start
              paymentFrequency: 'MONTHLY',
              customPaymentDays: [],
              facilities: [],
              images: [],
            },
          });
        }

        return {
          businessProfile,
          property: newProperty,
        };
      });

      return result;
    }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const businessProfile = await db.businessProfile.findUnique({
      where: {
        userId: ctx.session.user.id,
      },
    });

    if (!businessProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Business profile not found',
      });
    }

    return businessProfile;
  }),
});
