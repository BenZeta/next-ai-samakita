'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { ArrowLeft, Building2, Home, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'use-intl';

export default function PropertyGroupDashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Fetch property groups
  const { data: propertyGroupsData, isLoading: groupsLoading } = api.propertyGroup.list.useQuery();
  const propertyGroups = propertyGroupsData?.groups || [];

  // Fetch properties for the selected group
  const { data: propertiesData, isLoading: propertiesLoading } = api.property.list.useQuery(
    {
      propertyGroupId: selectedGroupId,
      limit: 100, // Get all properties in the group
    },
    {
      enabled: !!selectedGroupId,
    }
  );
  const properties = propertiesData?.properties || [];

  // Calculate group statistics
  const totalProperties = properties.length;
  const totalRooms = properties.reduce((sum, property) => sum + property.rooms.length, 0);
  const occupiedRooms = properties.reduce(
    (sum, property) => sum + property.rooms.filter(room => room.tenants.length > 0).length,
    0
  );
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Get the selected group
  const selectedGroup = propertyGroups.find(group => group.id === selectedGroupId);

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex items-center gap-2 sm:mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/property-groups')}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {t('propertyGroups.dashboard.title')}
        </h1>
      </div>

      <div className="mb-4 sm:mb-6">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10 sm:max-w-md">
            <SelectValue placeholder={t('propertyGroups.dashboard.selectGroup')} />
          </SelectTrigger>
          <SelectContent>
            {propertyGroups.map(group => (
              <SelectItem key={group.id} value={group.id} className="text-xs sm:text-sm">
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && selectedGroup ? (
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">
                {selectedGroup.name}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {selectedGroup.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4">
                  <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('propertyGroups.dashboard.totalProperties')}
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalProperties}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4">
                  <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10">
                    <Home className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('propertyGroups.dashboard.totalRooms')}
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{totalRooms}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4">
                  <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('propertyGroups.dashboard.occupancyRate')}
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{occupancyRate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold">
              {t('propertyGroups.dashboard.properties')}
            </h2>
            {propertiesLoading ? (
              <div className="flex h-32 sm:h-40 items-center justify-center">
                <div className="h-5 w-5 sm:h-6 sm:w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
              </div>
            ) : properties.length > 0 ? (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map(property => (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className="flex items-center gap-2 sm:gap-3 rounded-lg border p-3 sm:p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium">{property.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{property.address}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-32 sm:h-40 flex-col items-center justify-center rounded-lg border border-dashed">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('propertyGroups.dashboard.noProperties')}
                </p>
                <Button
                  variant="outline"
                  className="mt-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                  onClick={() => router.push(`/property-groups/${selectedGroupId}`)}
                >
                  {t('propertyGroups.dashboard.addProperties')}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-40 sm:h-60 flex-col items-center justify-center rounded-lg border border-dashed">
          <Building2 className="mb-2 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('propertyGroups.dashboard.selectGroupPrompt')}
          </p>
        </div>
      )}
    </div>
  );
}
