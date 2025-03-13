import { db, prisma } from '@/lib/db';
import { Prisma, RoomStatus, RoomType, TenantStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// Define price tier schema
const priceTierSchema = z.object({
  id: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 month'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  isDefault: z.boolean(),
});

const roomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  type: z.nativeEnum(RoomType),
  customTypeName: z.string().optional(),
  size: z.number().min(1, 'Size must be greater than 0'),
  amenities: z.array(z.string()).min(1, 'At least one amenity is required'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  propertyId: z.string().min(1, 'Property ID is required'),
  priceTiers: z.array(priceTierSchema).optional(),
});

const bulkRoomSchema = z.object({
  startNumber: z.string().min(1, 'Starting room number is required'),
  count: z
    .number()
    .min(1, 'Number of rooms must be at least 1')
    .max(50, 'Maximum 50 rooms at once'),
  type: z.nativeEnum(RoomType),
  customTypeName: z.string().optional(),
  size: z.number().min(1, 'Size must be greater than 0'),
  amenities: z.array(z.string()).min(1, 'At least one amenity is required'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  propertyId: z.string(),
  numberingPrefix: z.string().optional(),
  numberingSuffix: z.string().optional(),
  startingFloor: z.number().optional(),
  priceTiers: z.array(priceTierSchema).optional(),
});

const maintenanceSchema = z.object({
  roomId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['cleaning', 'repair', 'inspection', 'other']),
});

interface OccupancyHistoryItem {
  rate: number;
  label: string;
}

// Define custom Prisma includes to add priceTiers to typechecking
type RoomWithPriceTiers = Prisma.RoomGetPayload<{
  include: {
    priceTiers: true;
    property: true;
  };
}>;

export const roomRouter = createTRPCRouter({
  create: protectedProcedure.input(roomSchema).mutation(async ({ input, ctx }) => {
    const { propertyId, priceTiers, ...roomData } = input;

    // Check if user has access to the property
    const property = await db.property.findUnique({
      where: { id: propertyId },
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
        message: 'You do not have permission to create rooms for this property',
      });
    }

    // Create room with optional price tiers in a transaction
    try {
      return await prisma.$transaction(async tx => {
        // Create the room
        const room = await tx.room.create({
          data: {
            ...roomData,
            propertyId,
          },
        });

        // Create price tiers if provided
        if (priceTiers && priceTiers.length > 0) {
          await Promise.all(
            priceTiers.map(tier =>
              tx.roomPriceTier.create({
                data: {
                  roomId: room.id,
                  duration: tier.duration,
                  price: tier.price,
                  isDefault: tier.isDefault,
                },
              })
            )
          );
        }

        return room;
      });
    } catch (error) {
      console.error('Error creating room:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create room',
      });
    }
  }),

  createBulk: protectedProcedure.input(bulkRoomSchema).mutation(async ({ input, ctx }) => {
    const {
      startNumber,
      count,
      type,
      size,
      amenities,
      price,
      propertyId,
      numberingPrefix = '',
      numberingSuffix = '',
      startingFloor = 1,
      priceTiers,
    } = input;

    // Check if user has access to the property
    const property = await db.property.findUnique({
      where: { id: propertyId },
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
        message: 'You do not have permission to create rooms for this property',
      });
    }

    // Generate room numbers based on the starting number and count
    const rooms = Array.from({ length: count }, (_, index) => {
      const floor = Math.floor(index / 10) + startingFloor;
      const roomNum = (index % 10) + 1;
      const paddedRoomNum = roomNum.toString().padStart(2, '0');
      const number = `${numberingPrefix}${floor}${paddedRoomNum}${numberingSuffix}`;

      return {
        number,
        type,
        size,
        amenities,
        price,
        propertyId,
        status: RoomStatus.AVAILABLE,
      };
    });

    // Create all rooms in a transaction
    try {
      return await prisma.$transaction(async tx => {
        const createdRooms = [];
        for (const roomData of rooms) {
          const room = await tx.room.create({
            data: roomData,
          });
          createdRooms.push(room);

          // Add price tiers if provided
          if (priceTiers && priceTiers.length > 0) {
            await Promise.all(
              priceTiers.map(tier =>
                tx.roomPriceTier.create({
                  data: {
                    roomId: room.id,
                    duration: tier.duration,
                    price: tier.price,
                    isDefault: tier.isDefault,
                  },
                })
              )
            );
          }
        }
        return createdRooms;
      });
    } catch (error) {
      console.error('Error creating bulk rooms:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create rooms',
      });
    }
  }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        status: z.enum(['available', 'occupied', 'maintenance']).optional(),
        showOnlyAvailable: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.room.findMany({
        where: {
          propertyId: input.propertyId,
          ...(input.showOnlyAvailable && {
            status: RoomStatus.AVAILABLE,
            tenants: {
              none: {
                status: TenantStatus.ACTIVE,
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
          ...(input.status === 'available' && {
            status: RoomStatus.AVAILABLE,
            tenants: {
              none: {
                status: TenantStatus.ACTIVE,
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
          ...(input.status === 'occupied' && {
            status: RoomStatus.OCCUPIED,
            tenants: {
              some: {
                status: TenantStatus.ACTIVE,
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
        },
        include: {
          tenants: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          priceTiers: true,
        },
        orderBy: {
          number: 'asc',
        },
      });
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const room = await prisma.room.findUnique({
        where: { id: input.id },
        include: {
          tenants: {
            where: {
              status: TenantStatus.ACTIVE,
              OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
          property: {
            select: {
              name: true,
              address: true,
              description: true,
              location: true,
              facilities: true,
              images: true,
              paymentFrequency: true,
              dueDateOffset: true,
              customPaymentDays: true,
            },
          },
          priceTiers: true,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      // Ensure room status is consistent with active tenants
      // If there are active tenants but status is AVAILABLE, this fixes display issues
      if (room.tenants.length > 0 && room.status === RoomStatus.AVAILABLE) {
        await prisma.room.update({
          where: { id: input.id },
          data: { status: RoomStatus.OCCUPIED },
        });
        room.status = RoomStatus.OCCUPIED;
      }
      // If no active tenants but status is OCCUPIED, update to AVAILABLE
      else if (room.tenants.length === 0 && room.status === RoomStatus.OCCUPIED) {
        await prisma.room.update({
          where: { id: input.id },
          data: { status: RoomStatus.AVAILABLE },
        });
        room.status = RoomStatus.AVAILABLE;
      }

      return room;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: roomSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { priceTiers, ...roomData } = input.data;

      const room = await prisma.room.findUnique({
        where: { id: input.id },
        include: {
          property: true,
          priceTiers: true,
        },
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this room',
        });
      }

      // Update room and price tiers in a transaction
      try {
        return await prisma.$transaction(async tx => {
          // Update the room itself
          const updatedRoom = await tx.room.update({
            where: { id: input.id },
            data: roomData,
          });

          // Handle price tiers if provided
          if (priceTiers && priceTiers.length > 0) {
            // Get existing tier IDs
            const existingTierIds = room.priceTiers.map(tier => tier.id);
            const newTierIds = priceTiers
              .filter(tier => tier.id !== undefined)
              .map(tier => tier.id as string);

            // Find tiers to delete (existing but not in new list)
            const tierIdsToDelete = existingTierIds.filter(id => !newTierIds.includes(id));

            // Delete tiers that are no longer in the list
            if (tierIdsToDelete.length > 0) {
              await tx.roomPriceTier.deleteMany({
                where: {
                  id: {
                    in: tierIdsToDelete,
                  },
                },
              });
            }

            // Update or create each tier
            for (const tier of priceTiers) {
              if (tier.id) {
                // Update existing tier
                await tx.roomPriceTier.update({
                  where: { id: tier.id },
                  data: {
                    duration: tier.duration,
                    price: tier.price,
                    isDefault: tier.isDefault,
                  },
                });
              } else {
                // Create new tier
                await tx.roomPriceTier.create({
                  data: {
                    roomId: input.id,
                    duration: tier.duration,
                    price: tier.price,
                    isDefault: tier.isDefault,
                  },
                });
              }
            }
          }

          return updatedRoom;
        });
      } catch (error) {
        console.error('Error updating room:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update room',
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const room = await db.room.findUnique({
        where: { id: input.id },
        include: {
          property: true,
        },
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this room',
        });
      }

      await db.room.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  scheduleMaintenance: protectedProcedure
    .input(maintenanceSchema)
    .mutation(async ({ input, ctx }) => {
      const room = await db.room.findUnique({
        where: { id: input.roomId },
        include: {
          property: true,
        },
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to schedule maintenance for this room',
        });
      }

      // Check for scheduling conflicts
      const existingMaintenance = await db.maintenanceRequest.findFirst({
        where: {
          roomId: input.roomId,
          OR: [
            {
              AND: [
                { createdAt: { lte: input.startDate } },
                { updatedAt: { gte: input.startDate } },
              ],
            },
            {
              AND: [{ createdAt: { lte: input.endDate } }, { updatedAt: { gte: input.endDate } }],
            },
          ],
        },
      });

      if (existingMaintenance) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'There is already maintenance scheduled for this time period',
        });
      }

      return db.maintenanceRequest.create({
        data: {
          title: input.description,
          description: input.description,
          status: 'PENDING',
          priority: 'MEDIUM',
          roomId: input.roomId,
          propertyId: room.propertyId,
        },
      });
    }),

  getMaintenanceSchedule: protectedProcedure
    .input(
      z.object({
        roomId: z.string().optional(),
        propertyId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const { roomId, propertyId, startDate, endDate } = input;

      return db.maintenanceRequest.findMany({
        where: {
          ...(roomId ? { roomId } : {}),
          ...(propertyId
            ? {
                room: {
                  propertyId,
                },
              }
            : {}),
          createdAt: {
            gte: startDate,
          },
          updatedAt: {
            lte: endDate,
          },
        },
        include: {
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
      });
    }),

  getOccupancyStats: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        timeRange: z.enum(['week', 'month', 'year']),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, timeRange } = input;

      const baseWhere = {
        ...(propertyId ? { propertyId } : {}),
        property: {
          userId: ctx.session.user.id,
        },
      };

      // Get total rooms
      const totalRoomsQuery = db.room.count({
        where: baseWhere,
      });

      // Get occupied rooms (rooms with active tenants)
      const occupiedRoomsQuery = db.room.count({
        where: {
          ...baseWhere,
          status: RoomStatus.OCCUPIED,
        },
      });

      const [totalRooms, occupiedRooms] = await Promise.all([totalRoomsQuery, occupiedRoomsQuery]);

      const currentRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      // Calculate historical data
      const now = new Date();
      let historyPoints: { date: Date; label: string }[] = [];

      if (timeRange === 'week') {
        // Get data for each day of the week
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          historyPoints.push({
            date,
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          });
        }
      } else if (timeRange === 'month') {
        // Get data for each week of the month
        for (let i = 4; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i * 7);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

          historyPoints.push({
            date,
            label: `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
          });
        }
      } else {
        // Get data for each month of the year
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          historyPoints.push({
            date,
            label: date.toLocaleDateString('en-US', { month: 'short' }),
          });
        }
      }

      // Get historical occupancy rates
      const historyRates = await Promise.all(
        historyPoints.map(async ({ date, label }) => {
          const totalRooms = await db.room.count({
            where: baseWhere,
          });

          const occupiedRooms = await db.room.count({
            where: {
              ...baseWhere,
              status: RoomStatus.OCCUPIED,
              createdAt: {
                lte: date,
              },
            },
          });

          return {
            label,
            rate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
          };
        })
      );
      // Get previous period rate for comparison
      const previousPeriodStart = new Date(now);
      if (timeRange === 'week') {
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 14);
      } else if (timeRange === 'month') {
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      } else {
        previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
      }

      const previousOccupiedRooms = await db.room.count({
        where: {
          ...baseWhere,
          tenants: {
            some: {
              status: TenantStatus.ACTIVE,
              startDate: {
                lte: previousPeriodStart,
              },
              OR: [
                {
                  endDate: undefined,
                },
                {
                  endDate: {
                    gt: previousPeriodStart,
                  },
                },
              ],
            },
          },
        },
      });

      const previousTotalRooms = await db.room.count({
        where: {
          ...baseWhere,
          createdAt: {
            lte: previousPeriodStart,
          },
        },
      });

      const previousRate =
        previousTotalRooms > 0 ? (previousOccupiedRooms / previousTotalRooms) * 100 : 0;

      // Calculate room status breakdown
      const roomStatuses = Object.values(RoomStatus) as RoomStatus[];
      const roomStatusBreakdown = await Promise.all(
        roomStatuses.map(async (status: RoomStatus) => {
          const roomsWithStatus = await db.room.count({
            where: {
              ...baseWhere,
              status: status,
            },
          });

          return {
            status,
            occupancyRate: totalRooms > 0 ? (roomsWithStatus / totalRooms) * 100 : 0,
          };
        })
      );

      return {
        currentRate,
        previousRate,
        history: historyRates,
        roomStatusBreakdown,
        totalRooms,
        occupiedRooms,
      };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        status: z.nativeEnum(RoomStatus),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { roomId, status, description } = input;

      // Check if room exists and user has access
      const room = await db.room.findUnique({
        where: { id: roomId },
        include: {
          property: true,
        },
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this room',
        });
      }

      // Create maintenance request if status is being set to MAINTENANCE
      if (status === RoomStatus.MAINTENANCE) {
        await db.maintenanceRequest.create({
          data: {
            title: `Room ${room.number} Maintenance`,
            description: description || `Maintenance started for Room ${room.number}`,
            status: 'PENDING',
            priority: 'MEDIUM',
            roomId: room.id,
            propertyId: room.propertyId,
          },
        });
      }

      // Update maintenance request status to COMPLETED when room status changes from MAINTENANCE to AVAILABLE
      if (room.status === RoomStatus.MAINTENANCE && status === RoomStatus.AVAILABLE) {
        await db.maintenanceRequest.updateMany({
          where: {
            roomId: room.id,
            status: 'PENDING',
          },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date(),
          },
        });
      }

      // Update room status
      return db.room.update({
        where: { id: roomId },
        data: { status },
      });
    }),

  getCustomTypes: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Find all rooms with CUSTOM type and return unique custom type names
      const customRooms = await prisma.room.findMany({
        where: {
          type: RoomType.CUSTOM,
          customTypeName: {
            not: null,
          },
          ...(input.propertyId && {
            propertyId: input.propertyId,
          }),
        },
        select: {
          customTypeName: true,
        },
        distinct: ['customTypeName'],
      });

      // Return only the customTypeName values
      return customRooms
        .filter(room => room.customTypeName) // Filter out null values
        .map(room => room.customTypeName as string);
    }),

  syncRoomStatuses: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all rooms with their associated tenants
    const rooms = await ctx.db.room.findMany({
      include: {
        tenants: {
          where: {
            status: TenantStatus.ACTIVE,
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
        },
      },
    });

    const updates = [];

    // Process each room
    for (const room of rooms) {
      const hasActiveTenants = room.tenants.length > 0;

      // If room has active tenants but status is not OCCUPIED, update it
      if (hasActiveTenants && room.status !== RoomStatus.OCCUPIED) {
        updates.push(
          ctx.db.room.update({
            where: { id: room.id },
            data: { status: RoomStatus.OCCUPIED },
          })
        );
      }
      // If room has no active tenants but status is not AVAILABLE, update it
      else if (
        !hasActiveTenants &&
        room.status !== RoomStatus.AVAILABLE &&
        room.status !== RoomStatus.MAINTENANCE
      ) {
        updates.push(
          ctx.db.room.update({
            where: { id: room.id },
            data: { status: RoomStatus.AVAILABLE },
          })
        );
      }
    }

    // Execute all updates
    await Promise.all(updates);

    return {
      success: true,
      message: `Synchronized ${updates.length} room statuses`,
    };
  }),
});
