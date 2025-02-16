"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TRPCReactProvider } from "./TrpcProvider";
import { SessionProvider } from "next-auth/react";
import { type Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>
        {children}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </TRPCReactProvider>
    </SessionProvider>
  );
}
