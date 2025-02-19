'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { format } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  Loader2,
  Mail,
  Phone,
  Upload,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function TenantDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });
  const utils = api.useContext();

  const generateContractMutation = api.tenant.generateContract.useMutation({
    onSuccess: () => {
      toast.success('Contract generated successfully!');
      utils.tenant.detail.invalidate({ id: tenantId });
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const extendLease = api.tenant.extendLease.useMutation({
    onSuccess: () => {
      toast.success('Lease extended successfully');
      utils.tenant.detail.invalidate({ id: tenantId });
      setShowConfirmation(false);
    },
    onError: error => {
      toast.error(error.message);
      setShowConfirmation(false);
    },
  });

  const deactivateTenantMutation = api.tenant.update.useMutation({
    onSuccess: () => {
      toast.success('Tenant deactivated successfully');
      utils.tenant.detail.invalidate({ id: tenantId });
      setShowDeactivateModal(false);
    },
    onError: error => {
      toast.error(error.message);
      setShowDeactivateModal(false);
    },
  });

  const uploadContractMutation = api.tenant.uploadContract.useMutation({
    onSuccess: () => {
      toast.success('Contract uploaded successfully');
      utils.tenant.detail.invalidate({ id: tenantId });
      setShowUploadModal(false);
      setUploadFile(null);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await uploadContractMutation.mutateAsync({
          tenantId,
          file: base64String.split(',')[1],
        });
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error('Failed to upload contract:', error);
      toast.error('Failed to upload contract');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  const handleGenerateContract = async () => {
    try {
      setIsGenerating(true);
      await generateContractMutation.mutateAsync({ tenantId });
    } catch (error) {
      console.error('Failed to generate contract:', error);
      toast.error('Failed to generate contract');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtendLease = async () => {
    try {
      await extendLease.mutateAsync({ tenantId });
    } catch (error) {
      console.error('Failed to extend lease:', error);
      toast.error('Failed to extend lease. Please try again.');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateTenantMutation.mutateAsync({
        id: tenantId,
        status: 'INACTIVE',
      });
    } catch (error) {
      console.error('Failed to deactivate tenant:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{tenant.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {tenant.ktpNumber && `KTP: ${tenant.ktpNumber}`}
          </p>
        </div>
        <div className="flex space-x-4">
          <Link
            href={`/tenants/${tenant.id}/check-in`}
            className="flex items-center rounded-md bg-card px-4 py-2 text-foreground shadow hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <ClipboardList className="mr-2 h-5 w-5" />
            Check-in Items
          </Link>
          <Link
            href={`/tenants/${tenant.id}/payments`}
            className="flex items-center rounded-md bg-card px-4 py-2 text-foreground shadow hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Payments
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowConfirmation(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calendar className="h-4 w-4" />
            Extend Lease
          </button>
          {tenant?.status === 'ACTIVE' && (
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserX className="h-4 w-4" />
              Deactivate Tenant
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-foreground">Personal Information</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">{tenant.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">{tenant.phone}</span>
              </div>
              <div className="flex items-center">
                <Home className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">
                  Room {tenant.room.number} at {tenant.room.property.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Lease Period:</span>
                <span className="text-foreground">
                  {tenant.startDate ? format(new Date(tenant.startDate), 'MMM d, yyyy') : 'Not set'}{' '}
                  - {tenant.endDate ? format(new Date(tenant.endDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Rent Amount:</span>
                <span className="text-foreground">
                  Rp {tenant.rentAmount?.toLocaleString() ?? 'Not set'}
                </span>
              </div>
              <div className="flex items-center">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground" />
                <div className="flex space-x-2">
                  {tenant.ktpFile && (
                    <a
                      href={tenant.ktpFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/90 transition-colors"
                    >
                      View KTP
                    </a>
                  )}
                  {tenant.kkFile && (
                    <a
                      href={tenant.kkFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/90 transition-colors"
                    >
                      View KK
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Contract Status</h2>
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Status</span>
                      <span className="text-sm text-foreground">
                        {tenant.contractFile ? 'Contract Generated' : 'No Contract'}
                      </span>
                    </div>
                    {tenant.contractFile ? (
                      <div className="flex flex-col space-y-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            tenant.contractFile && window.open(tenant.contractFile, '_blank')
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Contract
                        </Button>
                        {tenant.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowUploadModal(true)}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Signed Contract
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleGenerateContract}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="mr-2 h-4 w-4" />
                          )}
                          Generate Contract
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Check-in Items</h2>
          {tenant.checkInItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.checkInItems.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{item.itemName}</span>
                    <span className="text-sm text-muted-foreground">{item.condition}</span>
                  </div>
                  {item.notes && <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No check-in items recorded yet.</p>
          )}
        </div>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl border border-border">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Confirm Lease Extension</h3>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to extend {tenant.name}'s lease by one month? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendLease}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDeactivateModal(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg border border-border">
            <div className="mb-4 flex items-center">
              <div className="mr-4 rounded-full bg-destructive/10 p-3">
                <UserX className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Deactivate Tenant</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to deactivate this tenant? This will also mark their room as
              available. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Contract Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg border border-border">
            <h3 className="mb-4 text-lg font-medium text-foreground">Upload Signed Contract</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground">
                Select PDF File (max 5MB)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium hover:file:text-primary"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
