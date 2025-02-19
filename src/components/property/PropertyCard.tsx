import { Building2, Home, Users } from 'lucide-react';
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

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md"
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
      </div>

      <div className="p-4">
        <h2 className="mb-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
          {property.name}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{property.address}</p>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{totalRooms}</p>
              <p className="text-xs text-muted-foreground">{t('properties.card.rooms')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{occupancyRate}%</p>
              <p className="text-xs text-muted-foreground">{t('properties.card.occupancy')}</p>
            </div>
          </div>
        </div>

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
      </div>
    </Link>
  );
}
