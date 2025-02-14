"use client";

import { PropertyForm } from "@/components/property/PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Add New Property</h1>
      <div className="mx-auto max-w-3xl">
        <PropertyForm />
      </div>
    </div>
  );
}
