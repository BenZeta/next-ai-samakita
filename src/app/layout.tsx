import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Providers } from "@/components/providers/Providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Superkos CMS",
  description: "A modern boarding house management system",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

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
        <Providers session={session}>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
