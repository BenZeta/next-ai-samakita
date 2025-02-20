'use client';

import { TRPCReactProvider } from '@/components/providers/TrpcProvider';
import { ThemeAwareToast } from '@/components/theme/ThemeAwareToast';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import 'react-toastify/dist/ReactToastify.css';

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <TRPCReactProvider>
      <SessionProvider session={session}>
        {children}
        <ThemeAwareToast />
      </SessionProvider>
    </TRPCReactProvider>
  );
}
