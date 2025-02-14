import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
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
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.PropertyWhereInput = {
        userId: ctx.session.user.id,
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
                  address: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      };

      const [properties, total] = await Promise.all([
        db.property.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            rooms: {
              include: {
                tenants: true,
              },
            },
          },
        }),
        db.property.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        properties,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
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
        code: "NOT_FOUND",
        message: "Property not found",
      });
    }

    if (property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view this property",
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

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    await db.property.delete({
      where: {
        id: input.id,
        userId: ctx.session.user.id,
      },
    });

    return { success: true };
  }),
});
