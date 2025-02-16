'use client';

import { ExpenseList } from '@/components/expense/ExpenseList';
import { api } from '@/lib/trpc/react';
import { Building2, Search } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ExpensesPage() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

    useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const { data: properties, isFetching, isInitialLoading } = api.property.list.useQuery(
        {
            search: debouncedSearch,
        },
        {
            keepPreviousData: true,
            staleTime: 5000,
        }
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
                <p className="mt-2 text-muted-foreground">
                    Track and manage expenses across all properties
                </p>
            </div>

            <div className="mb-8">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
                    <input
                        type="text"
                        placeholder="Search properties..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-12 rounded-xl border border-gray-200 bg-white pl-12 pr-12 text-sm transition-all duration-200 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none hover:border-gray-300"
                    />
                </div>
            </div>

            {(isInitialLoading || (isFetching && !isInitialLoading)) && (
                <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-md transition-all duration-300 border border-gray-100">
                    <div className="h-5 w-5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-primary/30 border-t-primary"></div>
                    <p className="text-sm font-medium text-gray-600">
                        {isInitialLoading ? "Loading properties..." : "Searching..."}
                    </p>
                </div>
            )}

            <div className={`mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${(isInitialLoading || isFetching) ? 'opacity-60' : 'opacity-100'} transition-opacity duration-200`}>
                <div
                    className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800 ${!selectedPropertyId ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedPropertyId(null)}
                >
                    <div className="flex items-center">
                        <div className="rounded-full bg-primary/10 p-3">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-card-foreground">All Properties</h3>
                            <p className="text-sm text-muted-foreground">View expenses across all properties</p>
                        </div>
                    </div>
                </div>

                {properties?.properties.map(property => (
                    <div
                        key={property.id}
                        className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800 ${selectedPropertyId === property.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setSelectedPropertyId(property.id)}
                    >
                        <div className="flex items-center">
                            <div className="rounded-full bg-primary/10 p-3">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-medium text-card-foreground">{property.name}</h3>
                                <p className="text-sm text-muted-foreground">{property.address}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-lg bg-card p-6 shadow dark:bg-gray-800">
                <ExpenseList propertyId={selectedPropertyId || undefined} />
            </div>
        </div>
    );
}
