import { db, prisma } from '@/lib/db';
import { RoomStatus, RoomType, TenantStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const roomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, 'Size must be greater than 0'),
  amenities: z.array(z.string()).min(1, 'At least one amenity is required'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  propertyId: z.string().min(1, 'Property ID is required'),
});

const bulkRoomSchema = z.object({
  startNumber: z.string().min(1, 'Starting room number is required'),
  count: z
    .number()
    .min(1, 'Number of rooms must be at least 1')
    .max(50, 'Maximum 50 rooms at once'),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, 'Size must be greater than 0'),
  amenities: z.array(z.string()).min(1, 'At least one amenity is required'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  propertyId: z.string(),
  numberingPrefix: z.string().optional(),
  numberingSuffix: z.string().optional(),
  startingFloor: z.number().optional(),
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

export const roomRouter = createTRPCRouter({
  create: protectedProcedure.input(roomSchema).mutation(async ({ input, ctx }) => {
    // Check if property exists and user has access
    const property = await db.property.findUnique({
      where: { id: input.propertyId },
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
        message: 'You do not have permission to add rooms to this property',
      });
    }

    // Check if room number already exists in the property
    const existingRoom = await db.room.findFirst({
      where: {
        propertyId: input.propertyId,
        number: input.number,
      },
    });

    if (existingRoom) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Room number already exists in this property',
      });
    }

    return db.room.create({
      data: {
        ...input,
        status: RoomStatus.AVAILABLE,
      },
    });
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
    return db.$transaction(
      rooms.map(room =>
        db.room.create({
          data: room,
        })
      )
    );
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
          }),
          ...(input.status === 'available' && {
            tenants: {
              none: {
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
          ...(input.status === 'occupied' && {
            tenants: {
              some: {
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
              name: true,
              address: true,
            },
          },
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
            select: {
              id: true,
              name: true,
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
            },
          },
        },
      });

      if (!room) {
        throw new Error('Room not found');
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
          message: 'You do not have permission to update this room',
        });
      }

      return db.room.update({
        where: { id: input.id },
        data: input.data,
      });
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
          historyPoints.push({
            date,
            label: `Week ${i + 1}`,
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

      // Calculate room type breakdown
      const roomStatuses = Object.values(RoomStatus) as RoomStatus[];
      const roomStatusBreakdown = await Promise.all(
        roomStatuses.map(async (status: RoomStatus) => {
          const totalRoomsOfStatus = await db.room.count({
            where: {
              ...baseWhere,
              status: status,
            },
          });

          const occupiedRoomsOfStatus = await db.room.count({
            where: {
              ...baseWhere,
              status: status,
              tenants: {
                some: {
                  status: TenantStatus.ACTIVE,
                },
              },
            },
          });

          return {
            status,
            occupancyRate:
              totalRoomsOfStatus > 0 ? (occupiedRoomsOfStatus / totalRoomsOfStatus) * 100 : 0,
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
});
