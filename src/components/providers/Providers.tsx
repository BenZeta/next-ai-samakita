"use client";

import { ToastContainer } from "react-toastify";
import { TRPCReactProvider } from "./TrpcProvider";
import { SessionProvider } from "next-auth/react";
import { type Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>
        {children}
        <ToastContainer position="bottom-right" />
      </TRPCReactProvider>
    </SessionProvider>
  );
}
