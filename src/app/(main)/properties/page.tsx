"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/property/PropertyCard";

export default function PropertiesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading } = api.property.list.useQuery({
        search,
        page,
        limit,
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

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
                    className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
                    Add Property
                </Link>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search properties..."
                        className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                    <PropertyCard
                        key={property.id}
                        property={property}
                    />
                ))}
            </div>

            {properties.length === 0 && (
                <div className="mt-8 text-center">
                    <p className="text-gray-500">No properties found</p>
                </div>
            )}

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
