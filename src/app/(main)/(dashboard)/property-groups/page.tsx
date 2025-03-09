'use client';

import { PropertyGroupCard } from '@/components/PropertyGroupCard';
import { PropertyGroupForm } from '@/components/PropertyGroupForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/trpc/react';
import { Building2, Home, Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

export default function PropertyGroupsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('propertyGroups');
  const commonT = useTranslations('common');

  // Fetch all properties without pagination
  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = api.property.listAll.useQuery();
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = api.propertyGroup.list.useQuery();

  const utils = api.useUtils();

  const createMutation = api.propertyGroup.create.useMutation({
    onSuccess: () => {
      setIsCreating(false);
      // Invalidate both queries to refresh the data
      utils.propertyGroup.list.invalidate();
      utils.property.listAll.invalidate();
      toast.success(t('createSuccess'));
    },
    onError: error => {
      console.error('Failed to create property group:', error);
      toast.error(t('createError'));
    },
  });

  const deleteMutation = api.propertyGroup.delete.useMutation({
    onSuccess: () => {
      setGroupToDelete(null);
      // Invalidate both queries to refresh the data
      utils.propertyGroup.list.invalidate();
      utils.property.listAll.invalidate();
      toast.success(t('deleteSuccess'));
    },
    onError: error => {
      console.error('Failed to delete property group:', error);
      toast.error(t('deleteError'));
    },
  });

  const handleSubmit = async (data: {
    name: string;
    description: string;
    properties: string[];
  }) => {
    createMutation.mutate(data);
  };

  const handleEdit = (id: string) => {
    router.push(`/property-groups/${id}`);
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    deleteMutation.mutate({ id: groupToDelete });
  };

  const handleCancel = () => {
    setIsCreating(false);
  };

  if (propertiesLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  if (propertiesError) {
    console.error('Properties error:', propertiesError);
    return (
      <div>
        {t('errorLoadingProperties', { defaultMessage: 'Error loading properties' })}:{' '}
        {propertiesError.message}
      </div>
    );
  }

  if (groupsError) {
    console.error('Groups error:', groupsError);
    return (
      <div>
        {t('errorLoadingGroups', { defaultMessage: 'Error loading groups' })}: {groupsError.message}
      </div>
    );
  }

  // Ensure properties data exists and has the expected structure
  const availableProperties =
    properties?.properties?.map(p => ({
      id: p.id,
      name: p.name,
    })) || [];

  // Calculate statistics
  const totalGroups = groups?.groups?.length || 0;
  const totalPropertiesInGroups =
    groups?.groups?.reduce((sum, group) => sum + group.properties.length, 0) || 0;
  const propertiesWithoutGroup = availableProperties.length - totalPropertiesInGroups;

  return (
    <div className="container py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          {!isCreating && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push('/property-groups/dashboard')}
                className="text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4 justify-center w-full xs:w-auto"
              >
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">{t('dashboard.title')}</span>
              </Button>
              <Button
                onClick={() => setIsCreating(true)}
                className="text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4 justify-center w-full xs:w-auto"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">{t('create')}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('totalGroups', { defaultMessage: 'Total Groups' })}
              </p>
              <p className="text-lg sm:text-xl font-bold">{totalGroups}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-primary/10">
              <Home className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('propertiesInGroups', { defaultMessage: 'Properties in Groups' })}
              </p>
              <p className="text-lg sm:text-xl font-bold">{totalPropertiesInGroups}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('propertiesWithoutGroup', { defaultMessage: 'Properties without Group' })}
              </p>
              <p className="text-lg sm:text-xl font-bold">{propertiesWithoutGroup}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Property Groups Section */}
        <div>
          {isCreating ? (
            <div className="bg-card rounded-lg border shadow-sm p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{t('create')}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('createDescription', {
                    defaultMessage: 'Create a new property group to organize your properties.',
                  })}
                </p>
              </div>

              {availableProperties.length === 0 ? (
                <div className="p-3 sm:p-4 border border-yellow-200 bg-yellow-50 rounded-md">
                  <h3 className="font-medium text-yellow-800 text-sm sm:text-base">
                    {t('noPropertiesAvailable', { defaultMessage: 'No properties available' })}
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                    {t('createPropertiesFirst', {
                      defaultMessage:
                        'You need to create properties before you can add them to a group.',
                    })}
                    <a href="/properties/new" className="underline ml-1 font-medium">
                      {t('createProperty', { defaultMessage: 'Create a property' })}
                    </a>
                  </p>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  {t('availablePropertiesCount', {
                    count: availableProperties.length,
                    defaultMessage: '{count} properties available to add to group',
                  })}
                </p>
              )}

              <PropertyGroupForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                availableProperties={availableProperties}
              />
            </div>
          ) : (
            <>
              {groups.groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 border border-dashed rounded-lg h-[250px] sm:h-[300px] bg-card/50">
                  <Building2 className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">
                    {t('noGroupsYet', { defaultMessage: 'No property groups yet' })}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground text-center mb-4 max-w-md">
                    {t('createGroupDescription', {
                      defaultMessage:
                        'Create property groups to organize your properties and manage them more efficiently.',
                    })}
                  </p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('create')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {groups.groups.map(group => (
                    <PropertyGroupCard
                      key={group.id}
                      id={group.id}
                      name={group.name}
                      description={group.description || ''}
                      propertyCount={group.properties.length}
                      onEdit={handleEdit}
                      onDelete={() => setGroupToDelete(group.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Tips Section */}
        {!isCreating && groups.groups.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-lg sm:text-xl">
                {t('quickTips', { defaultMessage: 'Quick Tips' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-sm sm:text-base">
                  {t('whatAreGroups', { defaultMessage: 'What are property groups?' })}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('groupsExplanation', {
                    defaultMessage:
                      'Property groups help you organize your properties by location, type, or any other criteria that makes sense for your business.',
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm sm:text-base">
                  {t('howToUse', { defaultMessage: 'How to use property groups?' })}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('useExplanation', {
                    defaultMessage:
                      'Create groups, add properties to them, and use the dashboard to view statistics and manage properties within each group.',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {t('deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
