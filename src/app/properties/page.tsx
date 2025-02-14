"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import Link from "next/link";
import Image from "next/image";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const perPage = 12;

  const { data, isLoading } = api.property.list.useQuery({
    search,
    sortBy,
    sortOrder,
    page,
    perPage,
  });

  console.log(data?.properties);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSort = (newSortBy: "createdAt" | "name") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Link
          href="/properties/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Add Property
        </Link>
      </div>

      <div className="mb-6 flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search properties..."
          value={search}
          onChange={handleSearch}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-96"
        />

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSort("name")}
            className={`rounded px-3 py-1 ${sortBy === "name" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
            Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("createdAt")}
            className={`rounded px-3 py-1 ${sortBy === "createdAt" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
            Date {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.properties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="group overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="aspect-video relative">
                  <Image
                    src={property.images[0]}
                    alt={property.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h2 className="mb-1 text-lg font-semibold group-hover:text-indigo-600">{property.name}</h2>
                  <p className="mb-2 text-sm text-gray-600">{property.address}</p>
                  <div className="flex flex-wrap gap-2">
                    {property.facilities.slice(0, 3).map((facility) => (
                      <span
                        key={facility}
                        className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {facility}
                      </span>
                    ))}
                    {property.facilities.length > 3 && <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">+{property.facilities.length - 3} more</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {data && data.pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-md border px-3 py-1 disabled:opacity-50">
                Previous
              </button>
              <span className="px-3 py-1">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === data.pagination.totalPages}
                className="rounded-md border px-3 py-1 disabled:opacity-50">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
