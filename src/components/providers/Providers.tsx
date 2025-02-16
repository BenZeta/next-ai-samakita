'use client';

import { type Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import { ThemeProvider } from './ThemeProvider';
import { TRPCReactProvider } from './TrpcProvider';

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>
        <ThemeProvider>
          {children}
          <ToastContainer position="bottom-right" />
        </ThemeProvider>
      </TRPCReactProvider>
    </SessionProvider>
  );
}
