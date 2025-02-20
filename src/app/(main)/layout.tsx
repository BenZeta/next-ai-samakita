'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-muted border-t-primary sm:h-8 sm:w-8"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pl-0 sm:pl-4">{children}</main>
    </div>
  );
}
