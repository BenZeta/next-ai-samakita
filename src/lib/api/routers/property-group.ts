import { db } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const propertyGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  properties: z.array(z.string()),
});

export const propertyGroupRouter = createTRPCRouter({
  create: protectedProcedure.input(propertyGroupSchema).mutation(async ({ input, ctx }) => {
    try {
      // Create property group and associate properties in a transaction
      const result = await db.$transaction(async tx => {
        // First, check if the properties exist and belong to the user
        const properties = await tx.property.findMany({
          where: {
            id: { in: input.properties },
            userId: ctx.session.user.id,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (properties.length !== input.properties.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Some properties were not found or do not belong to the user',
          });
        }

        // Create property group
        const group = await tx.propertyGroup.create({
          data: {
            name: input.name,
            description: input.description,
            userId: ctx.session.user.id,
          },
        });

        // Associate properties with the group one by one
        if (input.properties.length > 0) {
          for (const propertyId of input.properties) {
            await tx.property.update({
              where: {
                id: propertyId,
                userId: ctx.session.user.id,
              },
              data: {
                propertyGroupId: group.id,
              },
            });
          }
        }

        // Return the group with its properties
        const groupWithProperties = await tx.propertyGroup.findUnique({
          where: { id: group.id },
          include: { properties: true },
        });

        return groupWithProperties || group;
      });

      return result;
    } catch (error) {
      console.error('Failed to create property group:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create property group',
        cause: error,
      });
    }
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const groups = await db.propertyGroup.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        include: {
          properties: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return { groups };
    } catch (error) {
      console.error('Failed to fetch property groups:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch property groups',
        cause: error,
      });
    }
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const group = await db.propertyGroup.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          properties: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property group not found',
        });
      }

      return group;
    } catch (error) {
      console.error('Failed to fetch property group:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch property group',
        cause: error,
      });
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: propertyGroupSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Update property group and property associations in a transaction
        const result = await db.$transaction(async tx => {
          // First check if the group exists and belongs to the user
          const existingGroup = await tx.propertyGroup.findUnique({
            where: {
              id: input.id,
              userId: ctx.session.user.id,
            },
            include: {
              properties: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          if (!existingGroup) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Property group not found',
            });
          }

          // Remove all existing property associations
          await tx.property.updateMany({
            where: {
              propertyGroupId: input.id,
            },
            data: {
              propertyGroupId: null,
            },
          });

          // Update the group
          const updatedGroup = await tx.propertyGroup.update({
            where: { id: input.id },
            data: {
              name: input.data.name,
              description: input.data.description,
            },
          });

          // Add new property associations one by one
          if (input.data.properties.length > 0) {
            for (const propertyId of input.data.properties) {
              await tx.property.update({
                where: {
                  id: propertyId,
                  userId: ctx.session.user.id,
                },
                data: {
                  propertyGroupId: input.id,
                },
              });
            }
          }

          // Return the updated group with its properties
          const groupWithProperties = await tx.propertyGroup.findUnique({
            where: { id: input.id },
            include: {
              properties: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          return groupWithProperties || updatedGroup;
        });

        return result;
      } catch (error) {
        console.error('Failed to update property group:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update property group',
          cause: error,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Delete property group and remove property associations in a transaction
        await db.$transaction(async tx => {
          // First check if the group exists and belongs to the user
          const existingGroup = await tx.propertyGroup.findUnique({
            where: {
              id: input.id,
              userId: ctx.session.user.id,
            },
            include: {
              properties: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          if (!existingGroup) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Property group not found',
            });
          }

          // Remove property associations one by one
          for (const property of existingGroup.properties) {
            await tx.property.update({
              where: {
                id: property.id,
              },
              data: {
                propertyGroupId: null,
              },
            });
          }

          // Delete the group
          await tx.propertyGroup.delete({
            where: { id: input.id },
          });
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to delete property group:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete property group',
          cause: error,
        });
      }
    }),
});
