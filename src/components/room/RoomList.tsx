"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import Link from "next/link";
import { RoomType } from "@prisma/client";

interface RoomListProps {
  propertyId: string;
}

export function RoomList({ propertyId }: RoomListProps) {
  const [selectedType, setSelectedType] = useState<RoomType | undefined>();
  const [sortBy, setSortBy] = useState<"number" | "price" | "type">("number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: rooms, isLoading } = api.room.list.useQuery({
    propertyId,
    type: selectedType,
    sortBy,
    sortOrder,
  });

  const handleSort = (newSortBy: "number" | "price" | "type") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value ? (e.target.value as RoomType) : undefined)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">All Types</option>
            {Object.values(RoomType).map((type) => (
              <option
                key={type}
                value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSort("number")}
              className={`rounded px-3 py-1 ${sortBy === "number" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
              Number {sortBy === "number" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              onClick={() => handleSort("price")}
              className={`rounded px-3 py-1 ${sortBy === "price" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
              Price {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              onClick={() => handleSort("type")}
              className={`rounded px-3 py-1 ${sortBy === "type" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
              Type {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>
        </div>

        <Link
          href={`/properties/${propertyId}/rooms/new`}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Add Room
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rooms?.map((room) => (
          <div
            key={room.id}
            className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Room {room.number}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-sm capitalize text-gray-600">{room.type.toLowerCase()}</span>
              </div>
              <div className="mb-4 space-y-2 text-sm text-gray-600">
                <p>Size: {room.size} m²</p>
                <p>Price: ${room.price.toLocaleString()} / month</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Amenities:</h4>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Link
                  href={`/properties/${propertyId}/rooms/${room.id}/edit`}
                  className="rounded px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50">
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rooms?.length === 0 && <div className="text-center text-gray-500">No rooms found. Add your first room!</div>}
    </div>
  );
}
