'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useSession } from 'next-auth/react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen">
      {session && <Sidebar />}
      <main className={`flex-1 overflow-y-auto bg-background ${session ? 'p-4' : ''}`}>
        {children}
      </main>
    </div>
  );
}
