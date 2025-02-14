import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { Sidebar } from "@/components/layout/Sidebar";
import { TRPCReactProvider } from "@/components/providers/TrpcProvider";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Superkos CMS",
  description: "A modern boarding house management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </head>
      <body className={inter.className}>
        <TRPCReactProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-8">{children}</main>
          </div>
          <ToastContainer position="bottom-right" />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
