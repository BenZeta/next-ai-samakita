import { Providers } from '@/components/providers/Providers';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sama Kita CMS',
  description: 'A modern boarding house management system',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
