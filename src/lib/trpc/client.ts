import type { AppRouter } from '@/lib/api/root';
import { createTRPCReact } from '@trpc/react-query';

export const api = createTRPCReact<AppRouter>();
