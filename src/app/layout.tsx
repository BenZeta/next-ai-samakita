import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { Sidebar } from "@/components/layout/Sidebar";
import { TRPCReactProvider } from "@/components/providers/TrpcProvider";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Superkos CMS",
  description: "Property management system for Superkos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCReactProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-8">{children}</main>
          </div>
          <ToastContainer />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
