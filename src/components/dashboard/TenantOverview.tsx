'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'use-intl';

interface TenantOverviewProps {
  propertyId?: string;
}

interface TenantStats {
  total: number;
  active: number;
  inactive: number;
  upcomingMoveOuts: number;
}

interface TenantSummary {
  id: string;
  name: string;
  room: string;
  status: TenantStatus;
  leaseStart: string;
  leaseEnd: string;
  rent: number;
}

export default function TenantOverview({ propertyId }: TenantOverviewProps) {
  const t = useTranslations();

  const { data: tenantData, isLoading } = api.tenant.getStats.useQuery({
    propertyId,
  });

  if (isLoading) {
    return (
      <div className="h-[400px] rounded-lg bg-card p-6 shadow-sm">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const stats = tenantData?.stats ?? {
    total: 0,
    active: 0,
    inactive: 0,
    upcomingMoveOuts: 0,
  };

  const tenants = tenantData?.tenants ?? [];

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const formatRent = (rent: number | null | undefined) => {
    if (!rent) return 'Not set';
    return `Rp ${rent.toLocaleString()}`;
  };

  if (!tenantData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p>{t('dashboard.widgets.tenantOverview.noData')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">{t('dashboard.widgets.tenantOverview.title')}</h2>
        </div>
        <Link
          href="/tenants"
          className="text-sm text-primary hover:text-primary/90 hover:underline"
        >
          {t('dashboard.widgets.tenantOverview.viewAllTenants')}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-background/80 p-4 dark:bg-secondary/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">{t('dashboard.widgets.tenantOverview.stats.totalTenants')}</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-400/10">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">{t('dashboard.widgets.tenantOverview.stats.activeTenants')}</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-300">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-400/10">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{t('dashboard.widgets.tenantOverview.stats.inactiveTenants')}</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-300">{stats.inactive}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-400/10">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('dashboard.widgets.tenantOverview.stats.upcomingMoveouts')}</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-300">
            {stats.upcomingMoveOuts}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="rounded-lg border border-border">
          <div className="overflow-x-auto">
            {tenants.length > 0 ? (
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.name')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.room')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.status')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.leasePeriod')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.rent')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="flex items-center">
                          <div className="font-medium text-foreground">{tenant.name}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                        {tenant.room}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            tenant.status === TenantStatus.ACTIVE
                              ? 'bg-green-100 text-green-800 dark:bg-green-400/20 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                        {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-foreground">
                        {formatRent(tenant.rent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">{t('dashboard.widgets.tenantOverview.noTenantsYet')}</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {t('dashboard.widgets.tenantOverview.getStarted')}
                </p>
                <Link
                  href="/tenants/new"
                  className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t('dashboard.widgets.tenantOverview.addTenant')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
