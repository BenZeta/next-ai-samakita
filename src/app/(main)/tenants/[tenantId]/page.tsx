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
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmationModal({ isOpen, onClose, onConfirm }: ConfirmationModalProps) {
  const t = useTranslations();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center">
          <div className="mr-4 rounded-full bg-destructive/10 p-3">
            <UserX className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-medium text-card-foreground">
            {t('tenants.details.deactivate.confirmTitle')}
          </h3>
        </div>
        <p className="mb-6 text-muted-foreground">
          {t('tenants.details.deactivate.confirmMessage')}
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            {t('tenants.details.deactivate.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantDetailsPage() {
  const t = useTranslations();
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });
  const utils = api.useContext();

  const generateContractMutation = api.tenant.generateContract.useMutation({
    onSuccess: () => {
      toast.success(t('tenants.details.contract.success'));
      utils.tenant.detail.invalidate({ id: tenantId });
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const extendLease = api.tenant.extendLease.useMutation({
    onSuccess: () => {
      toast.success(t('tenants.details.lease.extended'));
      utils.tenant.detail.invalidate({ id: tenantId });
      setShowConfirmation(false);
    },
    onError: error => {
      toast.error(t('tenants.details.lease.error'));
      setShowConfirmation(false);
    },
  });

  const deactivateTenantMutation = api.tenant.update.useMutation({
    onSuccess: () => {
      toast.success(t('tenants.details.deactivate.success'));
      utils.tenant.list.invalidate();
      router.push('/tenants');
      setShowDeactivateModal(false);
    },
    onError: error => {
      toast.error(t('tenants.details.deactivate.error'));
      setShowDeactivateModal(false);
    },
  });

  const uploadContractMutation = api.tenant.uploadContract.useMutation({
    onSuccess: () => {
      toast.success(t('tenants.details.contract.uploadSuccess'));
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
        toast.error(t('tenants.details.contract.fileError'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('tenants.details.contract.sizeError'));
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
      toast.error(t('tenants.details.contract.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  if (!tenant) {
    return <div>{t('tenants.details.notFound')}</div>;
  }

  const handleGenerateContract = async () => {
    try {
      setIsGenerating(true);
      await generateContractMutation.mutateAsync({ tenantId });
    } catch (error) {
      console.error('Failed to generate contract:', error);
      toast.error(t('tenants.details.contract.error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtendLease = async () => {
    try {
      await extendLease.mutateAsync({ tenantId });
    } catch (error) {
      console.error('Failed to extend lease:', error);
      toast.error(t('tenants.details.lease.error'));
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
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:w-auto">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{tenant.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {tenant.ktpNumber && t('tenants.details.ktpNumber', { number: tenant.ktpNumber })}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-4 px-0 sm:grid-cols-2 sm:gap-4 sm:px-6 lg:w-auto lg:flex lg:items-center lg:gap-6 lg:px-0">
          <div className="col-span-1">
            <Link
              href={`/tenants/${tenant.id}/payments`}
              className="flex h-10 w-full items-center justify-center rounded-md bg-card px-4 py-2 text-foreground shadow hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:w-[180px]"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {t('tenants.details.payments.title')}
            </Link>
          </div>
          <div className="col-span-1 justify-self-end">
            <Link
              href={`/billing/new?tenantId=${tenant.id}`}
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:w-[180px]"
            >
              <FileText className="mr-2 h-5 w-5" />
              {t('billing.addBilling')}
            </Link>
          </div>
          <div className="col-span-1">
            <button
              onClick={() => setShowConfirmation(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:w-[180px]"
            >
              <Calendar className="h-4 w-4" />
              {t('tenants.details.extendLease')}
            </button>
          </div>
          {tenant?.status === 'ACTIVE' && (
            <div className="col-span-1 justify-self-end">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:w-[180px]"
              >
                <UserX className="h-4 w-4" />
                {t('tenants.details.deactivateTenant')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {t('tenants.details.personalInfo')}
            </h2>
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
                  {t('tenants.details.roomAt', {
                    number: tenant.room.number,
                    property: tenant.room.property.name,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {t('tenants.details.leasePeriod')}
                </span>
                <span className="text-foreground">
                  {tenant.startDate ? format(new Date(tenant.startDate), 'MMM d, yyyy') : 'Not set'}{' '}
                  - {tenant.endDate ? format(new Date(tenant.endDate), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {t('tenants.details.rentAmount')}
                </span>
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
                      {t('tenants.details.viewKtp')}
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
                <h2 className="text-lg font-semibold text-foreground">
                  {t('tenants.details.contract.title')}
                </h2>
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {t('billing.details.status')}
                      </span>
                      <span className="text-sm text-foreground">
                        {tenant.contractFile
                          ? t('tenants.details.contract.status.generated')
                          : t('tenants.details.contract.status.none')}
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
                          {t('tenants.details.contract.view')}
                        </Button>
                        {tenant.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowUploadModal(true)}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {t('tenants.details.contract.upload')}
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
                          {isGenerating
                            ? t('tenants.details.contract.generating')
                            : t('tenants.details.contract.generate')}
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {t('tenants.details.checkInItems')}
            </h2>
            <Link
              href={`/tenants/${tenant.id}/check-in`}
              className="flex h-10 w-[160px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <ClipboardList className="mr-2 h-5 w-5" />
              {t('tenants.details.checkInItems')}
            </Link>
          </div>
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
            <p className="text-muted-foreground">{t('tenants.details.noCheckInItems')}</p>
          )}
        </div>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl border border-border">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {t('tenants.details.lease.confirmTitle')}
            </h3>
            <p className="mb-6 text-muted-foreground">
              {t('tenants.details.lease.confirmMessage', { name: tenant.name })}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExtendLease}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {t('tenants.details.lease.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeactivate}
      />

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg border border-border">
            <h3 className="mb-4 text-lg font-medium text-foreground">
              {t('tenants.details.contract.upload')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground">
                {t('tenants.details.contract.fileError')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {isUploading
                  ? t('tenants.details.contract.uploading')
                  : t('tenants.details.contract.upload')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
