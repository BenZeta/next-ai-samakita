import { authRouter } from './routers/auth';
import { billingRouter } from './routers/billing';
import { businessRouter } from './routers/business';
import { expenseRouter } from './routers/expense';
import { financeRouter } from './routers/finance';
import { maintenanceRouter } from './routers/maintenance';
import { propertyRouter } from './routers/property';
import { roomRouter } from './routers/room';
import { tenantRouter } from './routers/tenant';
import { userRouter } from './routers/user';
import { createCallerFactory, createTRPCRouter } from './trpc';
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
  maintenance: maintenanceRouter,
  business: businessRouter,
  user: userRouter,
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
