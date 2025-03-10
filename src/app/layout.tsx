import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { Providers } from '@/components/providers/Providers';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { authOptions } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { Inter } from 'next/font/google';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sama Kita',
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
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.className)}>
        <ThemeProvider>
          <LanguageProvider>
            <Providers session={session}>
              {children}
              <Toaster />
            </Providers>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
