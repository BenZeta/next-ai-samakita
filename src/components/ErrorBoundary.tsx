'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  children?: React.ReactNode;
}

export function ErrorBoundary({ error, reset, children }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  if (error) {
    return (
      <div className="flex h-[200px] w-full flex-col items-center justify-center gap-4">
        <p>Something went wrong!</p>
        <button onClick={reset} className="rounded bg-primary px-4 py-2 text-primary-foreground">
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
