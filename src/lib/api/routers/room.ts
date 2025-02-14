import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { RoomType } from "@prisma/client";
import { prisma } from "@/lib/db";

const roomSchema = z.object({
  number: z.string().min(1, "Room number is required"),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, "Size must be greater than 0"),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  propertyId: z.string().min(1, "Property ID is required"),
});

const bulkRoomSchema = z.object({
  startNumber: z.string().min(1, "Starting room number is required"),
  count: z.number().min(1, "Number of rooms must be at least 1").max(50, "Maximum 50 rooms at once"),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, "Size must be greater than 0"),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  propertyId: z.string(),
  numberingPrefix: z.string().optional(),
  numberingSuffix: z.string().optional(),
  startingFloor: z.number().optional(),
});

const maintenanceSchema = z.object({
  roomId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["cleaning", "repair", "inspection", "other"]),
});

export const roomRouter = createTRPCRouter({
  create: protectedProcedure.input(roomSchema).mutation(async ({ input, ctx }) => {
    // Check if property exists and user has access
    const property = await db.property.findUnique({
      where: { id: input.propertyId },
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
        message: "You do not have permission to add rooms to this property",
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
        code: "CONFLICT",
        message: "Room number already exists in this property",
      });
    }

    return db.room.create({
      data: input,
    });
  }),

  createBulk: protectedProcedure.input(bulkRoomSchema).mutation(async ({ input, ctx }) => {
    const { startNumber, count, type, size, amenities, price, propertyId, numberingPrefix = "", numberingSuffix = "", startingFloor = 1 } = input;

    // Check if user has access to the property
    const property = await db.property.findUnique({
      where: { id: propertyId },
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
        message: "You do not have permission to create rooms for this property",
      });
    }

    // Generate room numbers based on the starting number and count
    const rooms = Array.from({ length: count }, (_, index) => {
      const floor = Math.floor(index / 10) + startingFloor;
      const roomNum = (index % 10) + 1;
      const paddedRoomNum = roomNum.toString().padStart(2, "0");
      const number = `${numberingPrefix}${floor}${paddedRoomNum}${numberingSuffix}`;

      return {
        number,
        type,
        size,
        amenities,
        price,
        propertyId,
      };
    });

    // Create all rooms in a transaction
    return db.$transaction(
      rooms.map((room) =>
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
        status: z.enum(["available", "occupied", "maintenance"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return prisma.room.findMany({
        where: {
          propertyId: input.propertyId,
          ...(input.status === "available" && {
            tenants: {
              none: {
                endDate: {
                  gt: new Date(),
                },
              },
            },
          }),
          ...(input.status === "occupied" && {
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
        throw new Error("Room not found");
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
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      if (room.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this room",
        });
      }

      return db.room.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const room = await db.room.findUnique({
      where: { id: input.id },
      include: {
        property: true,
      },
    });

    if (!room) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room not found",
      });
    }

    if (room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to delete this room",
      });
    }

    await db.room.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  scheduleMaintenance: protectedProcedure.input(maintenanceSchema).mutation(async ({ input, ctx }) => {
    const room = await db.room.findUnique({
      where: { id: input.roomId },
      include: {
        property: true,
      },
    });

    if (!room) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room not found",
      });
    }

    if (room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to schedule maintenance for this room",
      });
    }

    // Check for scheduling conflicts
    const existingMaintenance = await db.maintenance.findFirst({
      where: {
        roomId: input.roomId,
        OR: [
          {
            AND: [{ startDate: { lte: input.startDate } }, { endDate: { gte: input.startDate } }],
          },
          {
            AND: [{ startDate: { lte: input.endDate } }, { endDate: { gte: input.endDate } }],
          },
        ],
      },
    });

    if (existingMaintenance) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "There is already maintenance scheduled for this time period",
      });
    }

    return db.maintenance.create({
      data: input,
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
    .query(async ({ input, ctx }) => {
      const { roomId, propertyId, startDate, endDate } = input;

      if (!roomId && !propertyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either roomId or propertyId must be provided",
        });
      }

      // If propertyId is provided, verify access
      if (propertyId) {
        const property = await db.property.findUnique({
          where: { id: propertyId },
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
            message: "You do not have permission to view maintenance schedules for this property",
          });
        }
      }

      // If roomId is provided, verify access through property
      if (roomId) {
        const room = await db.room.findUnique({
          where: { id: roomId },
          include: {
            property: true,
          },
        });

        if (!room) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Room not found",
          });
        }

        if (room.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to view maintenance schedules for this room",
          });
        }
      }

      return db.maintenance.findMany({
        where: {
          ...(roomId ? { roomId } : {}),
          ...(propertyId
            ? {
                room: {
                  propertyId,
                },
              }
            : {}),
          startDate: {
            gte: startDate,
          },
          endDate: {
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
});
