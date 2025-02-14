import "@/app/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { TRPCReactProvider } from "@/components/providers/TrpcProvider";
import { Metadata } from "next";
import ClientProvider from "@/components/ClientProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastContainer } from "react-toastify";

export const metadata: Metadata = {
  title: "Next.js AI Template",
  description: "Next.js AI Template",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>
          <ThemeProvider>
            <ClientProvider>{children}</ClientProvider>
            <ToastContainer />
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
