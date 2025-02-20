'use client';

import { api } from '@/lib/trpc/react';
import { Building2, ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'use-intl';

export default function NewTenantPage() {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = api.property.list.useQuery(
    {},
    {
      enabled: step === 1,
    }
  );

  // Filter properties based on search
  const filteredProperties = properties?.properties.filter(property =>
    search
      ? property.name.toLowerCase().includes(search.toLowerCase()) ||
        property.address.toLowerCase().includes(search.toLowerCase())
      : true
  );

  // Fetch rooms when property is selected
  const { data: rooms, isLoading: roomsLoading } = api.room.list.useQuery(
    {
      propertyId: selectedPropertyId!,
      status: 'available',
    },
    {
      enabled: !!selectedPropertyId && step === 2,
    }
  );

  const filteredRooms = rooms?.filter(room =>
    roomSearch ? room.number.toLowerCase().includes(roomSearch.toLowerCase()) : true
  );

  if (propertiesLoading && step === 1) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  const handlePropertySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleRoomSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomSearch(e.target.value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('tenants.new.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('tenants.new.subtitle')}</p>
      </div>

      {/* Steps indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              1
            </div>
            <div className="relative mx-4 h-[2px] w-32 bg-muted">
              <div
                className={`absolute inset-0 h-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`}
              />
            </div>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              2
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <div className="flex w-full max-w-[300px] justify-between px-2">
            <div
              className={`text-sm font-medium ${
                step === 1 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {t('tenants.new.steps.property')}
            </div>
            <div
              className={`text-sm font-medium ${
                step === 2 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {t('tenants.new.steps.room')}
            </div>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <>
          {/* Property selection */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('tenants.new.search.property')}
                value={search}
                onChange={handlePropertySearch}
                className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties?.map(property => (
              <div
                key={property.id}
                onClick={() => {
                  setSelectedPropertyId(property.id);
                  setStep(2);
                }}
                className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary hover:shadow-lg ${
                  selectedPropertyId === property.id
                    ? 'border-primary bg-primary/5'
                    : 'border-input bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{property.name}</h3>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Room selection */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('tenants.new.search.room')}
                value={roomSearch}
                onChange={handleRoomSearch}
                className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {roomsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRooms?.map(room => (
                <div
                  key={room.id}
                  onClick={() => router.push(`/rooms/${room.id}/tenants/new`)}
                  className="cursor-pointer rounded-lg border border-input bg-card p-4 transition-all hover:border-primary hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">Room {room.number}</h3>
                      <p className="text-sm text-muted-foreground">{room.type}</p>
                      <p className="mt-2 text-lg font-semibold text-primary">
                        Rp {room.price.toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-input bg-card p-8 text-center">
              <p className="text-foreground">{t('tenants.new.noRooms.title')}</p>
              {roomSearch ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('tenants.new.noRooms.withSearch')}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('tenants.new.noRooms.noSearch')}
                </p>
              )}
              <button
                onClick={() => {
                  if (roomSearch) {
                    setRoomSearch('');
                  } else {
                    setSelectedPropertyId(null);
                    setStep(1);
                  }
                }}
                className="mt-4 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {roomSearch
                  ? t('tenants.new.buttons.clearSearch')
                  : t('tenants.new.buttons.selectAnother')}
              </button>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => {
                setSelectedPropertyId(null);
                setStep(1);
              }}
              className="inline-flex items-center rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {t('tenants.new.buttons.back')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
