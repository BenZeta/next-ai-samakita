import { z } from "zod";
import { UserRole } from "@prisma/client";

export const propertySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  address: z.string().min(1, "Address is required"),
  city: z.string().nullable(),
  province: z.string().nullable(),
  postalCode: z.string().nullable(),
  location: z.string(),
  facilities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  userId: z.string(),
});

export type Property = z.infer<typeof propertySchema>;

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  image: z.string().nullable(),
  hashedPassword: z.string().nullable(),
  emailVerified: z.date().nullable(),
  role: z.nativeEnum(UserRole),
  phone: z.string().nullable(),
  ktpNumber: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  propertyId: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  contractUrl: z.string().nullable(),
  amount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export interface ContractData {
  user: User;
  property: Property;
  transaction: Transaction;
}
