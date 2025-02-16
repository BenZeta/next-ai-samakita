"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/property/PropertyCard";

export default function PropertiesPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 10;

    useEffect(() => {
        setIsSearching(false);
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const { data, isFetching, isInitialLoading } = api.property.list.useQuery(
        {
            search: debouncedSearch,
            page,
            limit,
        },
        {
            keepPreviousData: true,
            staleTime: 5000,
        }
    );

    const properties = data?.properties ?? [];
    const { total, totalPages } = data?.pagination ?? { total: 0, totalPages: 0 };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Properties</h1>
                    <p className="mt-2 text-gray-600">Manage your properties and rooms</p>
                </div>
                <Link
                    href="/properties/new"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Add Property
                </Link>
            </div>

            <div className="mb-6">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-600" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search properties..."
                        className="w-full h-12 rounded-xl border border-gray-200 bg-white pl-12 pr-12 text-sm transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none hover:border-gray-300"
                    />
                </div>
            </div>

            <div className="min-h-[300px] relative">
                {(isInitialLoading || (isFetching && !isInitialLoading)) && (
                    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-xl bg-white/80 p-4 shadow-lg backdrop-blur-md transition-all duration-300 border border-gray-100">
                        <div className="h-5 w-5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-indigo-600/30 border-t-indigo-600"></div>
                        <p className="text-sm font-medium text-gray-600">
                            {isInitialLoading ? "Loading properties..." : "Searching..."}
                        </p>
                    </div>
                )}

                <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${(isInitialLoading || isFetching) ? 'opacity-60' : 'opacity-100'} transition-opacity duration-200`}>
                    {properties.map((property) => (
                        <PropertyCard
                            key={property.id}
                            property={property}
                        />
                    ))}
                </div>

                {properties.length === 0 && !isInitialLoading && !isFetching && (
                    <div className="mt-8 text-center">
                        <p className="text-gray-500">No properties found</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-8 flex justify-center space-x-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                        Previous
                    </button>
                    <span className="flex items-center text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
