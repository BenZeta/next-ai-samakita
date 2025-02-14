import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { appRouter } from "@/lib/api/root";
import { createTRPCContext } from "@/lib/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = async () => {
  const context = await createTRPCContext({ headers: headers() });
  return context;
};

export const createCaller = appRouter.createCaller;

export const getCaller = async () => {
  const context = await createContext();
  return createCaller(context);
};
