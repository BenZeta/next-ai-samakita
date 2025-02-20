'use client';

import { useEffect } from 'react';
import { useTranslations } from 'use-intl';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  children?: React.ReactNode;
}

export function ErrorBoundary({ error, reset, children }: ErrorBoundaryProps) {
  const t = useTranslations();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error);
  }, [error]);

  if (error) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-6">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {t('dashboard.loadDataError')}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">{t('dashboard.refreshPage')}</p>
          <button
            onClick={() => {
              // Clear any cached data before resetting
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {t('common.loading')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
