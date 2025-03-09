'use client';

import { PropertyGroupForm } from '@/components/PropertyGroupForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/trpc/react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

interface PropertyGroupEditPageProps {
  params: {
    id: string;
  };
}

export default function PropertyGroupEditPage({ params }: PropertyGroupEditPageProps) {
  const router = useRouter();
  const t = useTranslations('propertyGroups');
  const commonT = useTranslations('common');
  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
  } = api.propertyGroup.get.useQuery({ id: params.id });
  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = api.property.listAll.useQuery();

  const utils = api.useUtils();

  const updateMutation = api.propertyGroup.update.useMutation({
    onSuccess: () => {
      router.push('/property-groups');
      toast.success(t('updateSuccess'));
    },
    onError: error => {
      console.error('Failed to update property group:', error);
      toast.error(t('updateError'));
    },
  });

  const handleSubmit = async (data: {
    name: string;
    description: string;
    properties: string[];
  }) => {
    updateMutation.mutate({
      id: params.id,
      data,
    });
  };

  const handleCancel = () => {
    router.push('/property-groups');
  };

  if (groupLoading || propertiesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  if (groupError) {
    console.error('Group error:', groupError);
    return <div>Error loading group: {groupError.message}</div>;
  }

  if (propertiesError) {
    console.error('Properties error:', propertiesError);
    return <div>Error loading properties: {propertiesError.message}</div>;
  }

  if (!group || !properties) {
    return <div>{t('loading')}</div>;
  }

  // Ensure properties data exists and has the expected structure
  const availableProperties =
    properties?.properties?.map(p => ({
      id: p.id,
      name: p.name,
    })) || [];

  return (
    <div className="container py-6 max-w-7xl mx-auto px-4">
      <div className="mb-6 flex items-center">
        <Button
          variant="outline"
          onClick={() => router.push('/property-groups')}
          className="text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4 mr-4"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span className="whitespace-nowrap">{t('back')}</span>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">{t('edit')}</h1>
      </div>

      {/* Group Info Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm col-span-3">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{group.name}</h2>
              <p className="text-sm text-muted-foreground">
                {t('editDescription', {
                  defaultMessage: 'Edit your property group details.',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <PropertyGroupForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          availableProperties={availableProperties}
          initialData={{
            name: group.name,
            description: group.description || '',
            properties: group.properties.map(p => p.id),
          }}
        />
      </div>
    </div>
  );
}
