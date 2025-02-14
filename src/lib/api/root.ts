import { createCallerFactory, createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { propertyRouter } from "./routers/property";
import { roomRouter } from "./routers/room";
import { tenantRouter } from "./routers/tenant";
import { billingRouter } from "./routers/billing";
import { financeRouter } from "./routers/finance";
import { expenseRouter } from "./routers/expense";
// import all routers here

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  property: propertyRouter,
  room: roomRouter,
  tenant: tenantRouter,
  billing: billingRouter,
  finance: financeRouter,
  expense: expenseRouter,
  // add routers here
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
