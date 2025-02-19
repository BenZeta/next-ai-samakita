import { db } from '@/lib/db';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ input, ctx }) => {
    const updatedUser = await db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        name: input.name,
        phone: input.phone,
      },
    });

    return updatedUser;
  }),
});
