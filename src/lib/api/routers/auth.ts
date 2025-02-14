import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

const emailSchema = z.string().email();
const passwordSchema = z
  .string()
  .min(8)
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");
const phoneSchema = z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, "Invalid Indonesian phone number");

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        phone: phoneSchema,
        name: z.string().min(1),
        address: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password, phone, name, address } = input;

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await db.user.create({
        data: {
          email,
          hashedPassword,
          name,
          phone,
          address,
        },
      });

      // Create verification token
      const verificationToken = crypto.randomUUID();
      await db.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      return { success: true };
    }),

  verifyEmail: publicProcedure.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const { token } = input;

    // Find the verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid verification token",
      });
    }

    if (verificationToken.expires < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Verification token has expired",
      });
    }

    // Update user's email verification status
    await db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete the verification token
    await db.verificationToken.delete({
      where: { token },
    });

    return { success: true };
  }),
});
