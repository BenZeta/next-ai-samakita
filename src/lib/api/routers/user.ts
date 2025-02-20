import { db } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
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

  updatePassword: protectedProcedure
    .input(updatePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hashedPassword: true },
      });

      if (!user?.hashedPassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No password set for this account',
        });
      }

      const isValid = await compare(input.currentPassword, user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current password is incorrect',
        });
      }

      const hashedPassword = await hash(input.newPassword, 12);
      await db.user.update({
        where: { id: ctx.session.user.id },
        data: { hashedPassword },
      });

      return { success: true };
    }),
});
