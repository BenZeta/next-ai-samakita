import { db } from '@/lib/db';
import { PaymentFrequency, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
  dueDateOffset: z.number().min(1).max(31).default(5),
  paymentFrequency: z.nativeEnum(PaymentFrequency).default(PaymentFrequency.MONTHLY),
});

export const propertyRouter = createTRPCRouter({
  create: protectedProcedure.input(propertySchema).mutation(async ({ input, ctx }) => {
    return db.property.create({
      data: {
        ...input,
        userId: ctx.session.user.id,
      },
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        propertyGroupId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { page, limit, search, propertyGroupId } = input;
        const skip = (page - 1) * limit;

        const where: Prisma.PropertyWhereInput = {
          userId: ctx.session.user.id,
          ...(search
            ? {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    address: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ],
              }
            : {}),
          ...(propertyGroupId
            ? {
                propertyGroupId,
              }
            : {}),
        };

        const [properties, total] = await Promise.all([
          ctx.db.property.findMany({
            where,
            include: {
              rooms: {
                include: {
                  tenants: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                      ktpFile: true,
                      status: true,
                      startDate: true,
                      endDate: true,
                      createdAt: true,
                      updatedAt: true,
                      roomId: true,
                      rentAmount: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          ctx.db.property.count({ where }),
        ]);

        return {
          properties,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        console.error('Property list query error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch properties',
          cause: error,
        });
      }
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const properties = await ctx.db.property.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      return { properties };
    } catch (error) {
      console.error('Property listAll query error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch properties',
        cause: error,
      });
    }
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const property = await db.property.findUnique({
      where: { id: input.id },
      include: {
        rooms: true,
      },
    });

    if (!property) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Property not found',
      });
    }

    if (property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this property',
      });
    }

    return property;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        province: z.string().min(1),
        postalCode: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        dueDateOffset: z.number().min(1).max(31),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const property = await db.property.update({
        where: {
          id,
          userId: ctx.session.user.id,
        },
        data,
      });

      return property;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.property.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),
});
