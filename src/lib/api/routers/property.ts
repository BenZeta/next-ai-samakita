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
  name: z.string().min(1, "Property name is required"),
  description: z.string().min(1, "Description is required"),
  address: z.string().min(1, "Address is required"),
  location: locationSchema,
  facilities: z.array(z.string()).min(1, "At least one facility is required"),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
});

export const propertyRouter = createTRPCRouter({
  create: protectedProcedure.input(propertySchema).mutation(async ({ input, ctx }) => {
    const property = await db.property.create({
      data: {
        ...input,
        userId: ctx.session.user.id,
      },
    });

    return property;
  }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "name"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const { search, sortBy = "createdAt", sortOrder = "desc", page, perPage } = input;

      const where: Prisma.PropertyWhereInput = {
        userId: ctx.session.user.id,
        ...(search
          ? {
              OR: [{ name: { contains: search, mode: "insensitive" as Prisma.QueryMode } }, { address: { contains: search, mode: "insensitive" as Prisma.QueryMode } }],
            }
          : {}),
      };

      const [properties, total] = await Promise.all([
        db.property.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * perPage,
          take: perPage,
          include: {
            rooms: {
              select: {
                id: true,
                type: true,
              },
            },
          },
        }),
        db.property.count({ where }),
      ]);

      return {
        properties,
        pagination: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
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
        data: propertySchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const property = await db.property.findUnique({
        where: { id: input.id },
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
          message: "You do not have permission to update this property",
        });
      }

      return db.property.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const property = await db.property.findUnique({
      where: { id: input.id },
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
        message: "You do not have permission to delete this property",
      });
    }

    await db.property.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});
