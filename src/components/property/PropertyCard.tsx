import { api } from '@/lib/trpc/react';
import { Building2, Calendar, Home, Tag, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'use-intl';

interface PropertyCardProps {
  property: {
    id: string;
    name: string;
    address: string;
    facilities: string[];
    images: string[];
    rooms: {
      id: string;
      tenants: any[];
    }[];
    propertyGroupId?: string | null;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const t = useTranslations();
  const totalRooms = property.rooms.length;
  const occupiedRooms = property.rooms.filter(room => room.tenants.length > 0).length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Fetch property group if available
  const { data: propertyGroup } = api.propertyGroup.get.useQuery(
    { id: property.propertyGroupId || '' },
    { enabled: !!property.propertyGroupId }
  );

  // Fetch billings for this property
  const { data: billings } = api.billing.list.useQuery({
    propertyId: property.id,
    status: 'SENT',
  });

  // Get the next due date
  const nextDueDate = billings?.billings
    .filter(billing => new Date(billing.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  // Format the due date to show day and month
  const formatDueDate = (date: Date) => {
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('properties.card.dueToday');
    if (diffDays === 1) return t('properties.card.dueTomorrow');
    if (diffDays <= 7) return t('properties.card.dueInDays', { days: diffDays });

    return t('properties.card.dueOnDay', {
      day: dueDate.getDate(),
      month: dueDate.toLocaleString('default', { month: 'short' }),
    });
  };

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-video">
        {property.images[0] ? (
          <Image
            src={property.images[0]}
            alt={property.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <Building2 className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
            <p className="ml-2 text-sm text-muted-foreground">{t('properties.card.noImage')}</p>
          </div>
        )}
        {nextDueDate && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 shadow backdrop-blur-sm sm:right-3 sm:top-3 sm:gap-2 sm:px-3 sm:py-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            <span className="text-xs font-medium text-foreground sm:text-sm">
              {formatDueDate(nextDueDate.dueDate)}
            </span>
          </div>
        )}

        {propertyGroup && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 shadow backdrop-blur-sm sm:left-3 sm:top-3 sm:gap-2 sm:px-3 sm:py-1.5">
            <Tag className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            <span className="text-xs font-medium text-foreground sm:text-sm">
              {propertyGroup.name}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-3 sm:mb-4">
          <h2 className="mb-1 line-clamp-1 text-base font-semibold text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {property.name}
          </h2>
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {property.address}
          </p>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3 sm:mb-4 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-9 sm:w-9">
              <Home className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground sm:text-sm">{totalRooms}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                {t('properties.card.rooms')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-9 sm:w-9">
              <Users className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground sm:text-sm">{occupancyRate}%</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                {t('properties.card.occupancy')}
              </p>
            </div>
          </div>
        </div>

        {property.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {property.facilities.slice(0, 3).map(facility => (
              <span
                key={facility}
                className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground sm:px-2.5 sm:py-1 sm:text-xs"
              >
                {facility}
              </span>
            ))}
            {property.facilities.length > 3 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground sm:px-2.5 sm:py-1 sm:text-xs">
                +{property.facilities.length - 3} {t('properties.card.more')}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
