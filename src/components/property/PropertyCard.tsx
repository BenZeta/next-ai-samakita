import { api } from '@/lib/trpc/react';
import { Building2, Calendar, Home, Users } from 'lucide-react';
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
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const t = useTranslations();
  const totalRooms = property.rooms.length;
  const occupiedRooms = property.rooms.filter(room => room.tenants.length > 0).length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <p>{t('properties.card.noImage')}</p>
          </div>
        )}
        {nextDueDate && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 shadow backdrop-blur-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {formatDueDate(nextDueDate.dueDate)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h2 className="mb-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
            {property.name}
          </h2>
          <p className="text-sm text-muted-foreground">{property.address}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Home className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{totalRooms}</p>
              <p className="text-xs text-muted-foreground">{t('properties.card.rooms')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{occupancyRate}%</p>
              <p className="text-xs text-muted-foreground">{t('properties.card.occupancy')}</p>
            </div>
          </div>
        </div>

        {property.facilities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {property.facilities.slice(0, 3).map(facility => (
              <span
                key={facility}
                className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground"
              >
                {facility}
              </span>
            ))}
            {property.facilities.length > 3 && (
              <span className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">
                +{property.facilities.length - 3} {t('properties.card.more')}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
