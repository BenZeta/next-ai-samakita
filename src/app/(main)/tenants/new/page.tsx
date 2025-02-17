'use client';

import { api } from '@/lib/trpc/react';
import { Building2, ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RoomStatus } from '@prisma/client';

export default function NewTenantPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [roomSearch, setRoomSearch] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1);

    // Fetch properties
    const { data: properties, isLoading: propertiesLoading } = api.property.list.useQuery({
        search,
    }, {
        enabled: step === 1,
    });

    // Fetch rooms when property is selected
    const { data: rooms, isLoading: roomsLoading } = api.room.list.useQuery(
        {
            propertyId: selectedPropertyId!,
            status: RoomStatus.AVAILABLE,
            search: roomSearch,
        },
        {
            enabled: !!selectedPropertyId && step === 2,
        }
    );

    if (propertiesLoading && step === 1) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
                <h1 className="text-3xl font-bold text-foreground">Add New Tenant</h1>
                <p className="mt-2 text-muted-foreground">
                    Follow the steps below to add a new tenant
                </p>
            </div>

            {/* Steps indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-center">
                    <div className="flex items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step === 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>
                            1
                        </div>
                        <div className="relative mx-4 h-[2px] w-32 bg-gray-200">
                            <div className={`absolute inset-0 h-full ${step === 2 ? 'bg-primary' : 'bg-gray-200'}`} />
                        </div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step === 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>
                            2
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-center">
                    <div className="flex w-full max-w-[300px] justify-between px-2">
                        <div className={`text-sm font-medium ${step === 1 ? 'text-primary' : 'text-gray-500'}`}>Select Property</div>
                        <div className={`text-sm font-medium ${step === 2 ? 'text-primary' : 'text-gray-500'}`}>Select Room</div>
                    </div>
                </div>
            </div>

            {step === 1 ? (
                <>
                    {/* Property selection */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search properties..."
                                value={search}
                                onChange={handlePropertySearch}
                                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {properties?.properties.map((property) => (
                            <div
                                key={property.id}
                                onClick={() => {
                                    setSelectedPropertyId(property.id);
                                    setStep(2);
                                }}
                                className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary hover:shadow-lg ${selectedPropertyId === property.id ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-full bg-primary/10 p-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{property.name}</h3>
                                            <p className="text-sm text-gray-500">{property.address}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
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
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search rooms by number..."
                                value={roomSearch}
                                onChange={handleRoomSearch}
                                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {roomsLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : rooms && rooms.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {rooms.map((room) => (
                                <div
                                    key={room.id}
                                    onClick={() => router.push(`/rooms/${room.id}/tenants/new`)}
                                    className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-primary hover:shadow-lg"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">Room {room.number}</h3>
                                            <p className="text-sm text-gray-500">{room.type}</p>
                                            <p className="mt-2 text-lg font-semibold text-primary">
                                                Rp {room.price.toLocaleString()}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No available rooms found.</p>
                            {roomSearch ? (
                                <p className="mt-2 text-sm text-gray-400">Try different search terms or clear the search</p>
                            ) : (
                                <p className="mt-2 text-sm text-gray-400">This property has no available rooms</p>
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
                                className="mt-4 text-sm font-medium text-primary hover:underline"
                            >
                                {roomSearch ? 'Clear search' : 'Select another property'}
                            </button>
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            onClick={() => {
                                setSelectedPropertyId(null);
                                setStep(1);
                            }}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            ← Back to property selection
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
