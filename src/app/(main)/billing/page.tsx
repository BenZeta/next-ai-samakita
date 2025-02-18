'use client';

import { api } from '@/lib/trpc/react';
import { BillingStatus } from '@prisma/client';
import { Building2, Check, ChevronsUpDown, FileText, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BillingStatus | 'ALL'>('ALL');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: properties } = api.property.list.useQuery({
    search: debouncedSearch,
  });

  const { data: billings, isLoading } = api.billing.list.useQuery({
    search: debouncedSearch,
    propertyId: selectedPropertyId ?? undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="mt-2 text-muted-foreground">Manage your tenant billing and payments</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search billings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {selectedPropertyId
                ? properties?.properties.find(p => p.id === selectedPropertyId)?.name ||
                  'Select Property'
                : 'All Properties'}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {isOpen && (
            <div className="absolute z-10 mt-2 w-full rounded-lg border border-input bg-card p-2 shadow-lg">
              <div
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                onClick={() => {
                  setSelectedPropertyId(null);
                  setIsOpen(false);
                }}
              >
                <Check className={`h-4 w-4 ${!selectedPropertyId ? 'opacity-100' : 'opacity-0'}`} />
                <span>All Properties</span>
              </div>
              {properties?.properties.map(property => (
                <div
                  key={property.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                  onClick={() => {
                    setSelectedPropertyId(property.id);
                    setIsOpen(false);
                  }}
                >
                  <Check
                    className={`h-4 w-4 ${
                      selectedPropertyId === property.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span>{property.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value as BillingStatus | 'ALL')}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All Status</option>
          {Object.values(BillingStatus).map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {!billings?.billings.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-background p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No billings found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || selectedStatus !== 'ALL' || selectedPropertyId
              ? "Try adjusting your search or filters to find what you're looking for."
              : 'Get started by creating your first billing.'}
          </p>
          <Link
            href="/billing/new"
            className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Billing
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {billings.billings.map(billing => (
            <Link
              key={billing.id}
              href={`/billing/${billing.id}`}
              className="rounded-lg bg-card p-6 shadow transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-card-foreground">{billing.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Room {billing.tenant?.room?.number}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    billing.status === 'SENT'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : billing.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {billing.status}
                </span>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Amount:</span>
                  <span className="font-medium text-foreground">
                    Rp {billing.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Due Date:</span>
                  <span className="font-medium text-foreground">
                    {new Date(billing.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
