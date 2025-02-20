'use client';

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
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:gap-4">
        <div className="w-full">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
            {tenant.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            {tenant.ktpNumber && t('tenants.details.ktpNumber', { number: tenant.ktpNumber })}
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:flex lg:items-center lg:gap-4">
          <Link
            href={`/tenants/${tenant.id}/payments`}
            className="flex h-9 w-full items-center justify-center rounded-md bg-card px-3 py-2 text-sm text-foreground shadow hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:px-4"
          >
            <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('tenants.details.payments.title')}
          </Link>
          <Link
            href={`/billing/new?tenantId=${tenant.id}`}
            className="flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:px-4"
          >
            <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('billing.addBilling')}
          </Link>
          <button
            onClick={() => setShowConfirmation(true)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:px-4"
          >
            <Calendar className="h-4 w-4" />
            {t('tenants.details.extendLease')}
          </button>
          {tenant?.status === 'ACTIVE' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground shadow hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:px-4"
            >
              <UserX className="h-4 w-4" />
              {t('tenants.details.deactivateTenant')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-card p-3 shadow-sm sm:p-4">
            <h2 className="mb-3 text-base font-medium text-card-foreground sm:mb-4 sm:text-lg">
              {t('tenants.details.personalInfo')}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                <span className="text-sm text-foreground sm:text-base">{tenant.email}</span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                <span className="text-sm text-foreground sm:text-base">{tenant.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <Home className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                <span className="text-sm text-foreground sm:text-base">
                  {t('tenants.details.roomAt', {
                    number: tenant.room.number,
                    property: tenant.room.property.name,
                  })}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                <div>
                  <span className="text-sm font-medium text-foreground sm:text-base">
                    {t('tenants.details.leasePeriod')}
                  </span>
                  <span className="ml-2 text-sm text-foreground sm:text-base">
                    {tenant.startDate
                      ? format(new Date(tenant.startDate), 'MMM d, yyyy')
                      : 'Not set'}{' '}
                    - {tenant.endDate ? format(new Date(tenant.endDate), 'MMM d, yyyy') : 'Not set'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                <div>
                  <span className="text-sm font-medium text-foreground sm:text-base">
                    {t('tenants.details.rentAmount')}
                  </span>
                  <span className="ml-2 text-sm text-foreground sm:text-base">
                    Rp {tenant.rentAmount?.toLocaleString() ?? 'Not set'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                <div className="flex gap-2">
                  {tenant.ktpFile && (
                    <a
                      href={tenant.ktpFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/90 transition-colors sm:text-base"
                    >
                      {t('tenants.details.viewKtp')}
                    </a>
                  )}
                  {tenant.kkFile && (
                    <a
                      href={tenant.kkFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/90 transition-colors sm:text-base"
                    >
                      View KK
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-card p-3 shadow-sm sm:p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <h2 className="text-base font-medium text-card-foreground sm:text-lg">
                  {t('tenants.details.contract.title')}
                </h2>
                <div className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground sm:text-base">
                        {t('billing.details.status')}
                      </span>
                      <span className="text-sm text-foreground sm:text-base">
                        {tenant.contractFile
                          ? t('tenants.details.contract.status.generated')
                          : t('tenants.details.contract.status.none')}
                      </span>
                    </div>
                    {tenant.contractFile ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                        <button
                          onClick={() =>
                            tenant.contractFile && window.open(tenant.contractFile, '_blank')
                          }
                          className="inline-flex items-center justify-center rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 sm:text-sm"
                        >
                          <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          {t('tenants.details.contract.view')}
                        </button>
                        {tenant.status === 'ACTIVE' && (
                          <button
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center justify-center rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 sm:text-sm"
                          >
                            <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            {t('tenants.details.contract.upload')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                        <button
                          onClick={handleGenerateContract}
                          disabled={isGenerating}
                          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:text-sm"
                        >
                          {isGenerating ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin sm:h-4 sm:w-4" />
                          ) : (
                            <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                          {isGenerating
                            ? t('tenants.details.contract.generating')
                            : t('tenants.details.contract.generate')}
                        </button>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative z-50 w-[95%] max-w-md rounded-lg bg-card p-3 shadow-lg sm:p-4">
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <h3 className="text-base font-medium text-card-foreground sm:text-lg">
                {t('tenants.details.contract.upload')}
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  {t('tenants.details.contract.file')}
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="application/pdf"
                  className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent sm:w-auto"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin sm:h-4 sm:w-4" />
                      {t('tenants.details.contract.uploading')}
                    </>
                  ) : (
                    t('tenants.details.contract.upload')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
