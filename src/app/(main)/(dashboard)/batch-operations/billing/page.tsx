'use client';

import { api } from '@/lib/trpc/react';
import { BillingStatus, PaymentType, Tenant } from '@prisma/client';
import { AlertTriangle, ArrowLeft, CheckCircle, Construction, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

import { PropertyGroupSelect } from '@/components/property-group-select';
import { PropertySelect } from '@/components/property-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

type TargetType = 'property' | 'propertyGroup' | 'all';

interface TenantWithDetails extends Tenant {
  room: {
    number: string;
    price: number;
    property: {
      id: string;
      name: string;
    };
  };
}

export default function BulkBillingCreationPage() {
  const t = useTranslations();
  const router = useRouter();

  // Basic Selection States
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [propertyId, setPropertyId] = useState<string>('');
  const [propertyGroupId, setPropertyGroupId] = useState<string>('');
  const [billingType, setBillingType] = useState<PaymentType>(PaymentType.RENT);

  // Billing Period States
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [isAdvanceBilling, setIsAdvanceBilling] = useState(false);
  const [billingMonths, setBillingMonths] = useState(1);

  // Billing Settings States
  const [applyAdjustment, setApplyAdjustment] = useState(false);
  const [adjustmentPercentage, setAdjustmentPercentage] = useState(0);

  // Preview States
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewItems, setPreviewItems] = useState<TenantWithDetails[]>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  // Process States
  const [generationResult, setGenerationResult] = useState<{
    billings: Array<any>;
    errors: Array<{
      tenantId: string;
      tenantName: string;
      error: string;
    }>;
    totalGenerated: number;
    totalFailed: number;
  } | null>(null);

  // Fetch data
  const { data: propertiesData } = api.property.list.useQuery({ limit: 100 });
  const properties = propertiesData?.properties || [];
  const { data: propertyGroupsData } = api.propertyGroup.list.useQuery();
  const propertyGroups = propertyGroupsData?.groups || [];

  // Calculate totals
  const totalAmount = previewItems.reduce(
    (sum, item) =>
      selectedTenantIds.includes(item.id) ? sum + (item.rentAmount || item.room.price) : sum,
    0
  );
  const selectedCount = selectedTenantIds.length;

  // Mutations
  const { data: previewTenants, isLoading: isLoadingPreview } =
    api.billing.getPreviewTenants.useQuery(
      {
        propertyId: targetType === 'property' ? propertyId : undefined,
        propertyGroupId: targetType === 'propertyGroup' ? propertyGroupId : undefined,
      },
      {
        enabled: Boolean(propertyId || propertyGroupId),
      }
    );

  const { mutate: generateBillings, isLoading: isGenerating } =
    api.billing.generateBulk.useMutation({
      onSuccess: data => {
        setGenerationResult(data);
        toast.success(
          t('batchOperations.billing.summary.totalGenerated', {
            count: data.totalGenerated,
          })
        );
        if (data.totalFailed > 0) {
          toast.error(
            t('batchOperations.billing.summary.totalFailed', {
              count: data.totalFailed,
            })
          );
        }
        router.push('/billings');
      },
      onError: error => {
        toast.error(error.message);
      },
    });

  const { mutate: markAsPaid } = api.billing.markAsPaid.useMutation({
    onSuccess: () => {
      toast.success(t('billing.status.paid'));
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Preview generation handler
  const handlePreviewGenerate = async () => {
    try {
      if (!previewTenants || previewTenants.length === 0) {
        toast.error(t('common.noTenantsFound'));
        return;
      }

      setPreviewItems(previewTenants);
      setSelectedTenantIds(previewTenants.map(tenant => tenant.id));
      setIsPreviewMode(true);
    } catch (err) {
      console.error('Failed to fetch preview data:', err);
      toast.error(t('common.error'));
    }
  };

  // Handle final generation
  const handleGenerateBillings = () => {
    if (!selectedTenantIds.length) {
      toast.error(t('batchOperations.billing.preview.noTenantsSelected'));
      return;
    }

    generateBillings({
      propertyId: targetType === 'property' ? propertyId : undefined,
      propertyGroupId: targetType === 'propertyGroup' ? propertyGroupId : undefined,
      billingType,
      dueDate,
      selectedTenantIds,
      isAdvanceBilling,
      billingMonths,
      adjustmentPercentage,
    });
  };

  // Toggle tenant selection
  const toggleTenantSelection = (tenantId: string) => {
    const newSelected = selectedTenantIds.filter(id => id !== tenantId);
    setSelectedTenantIds(newSelected);
  };

  // Render generation result
  if (generationResult) {
    return (
      <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
        <Card className="mx-auto max-w-4xl">
          <CardHeader className="p-4 sm:p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t('batchOperations.billing.summary.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 sm:pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {t('batchOperations.billing.summary.totalGenerated')}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  {generationResult.totalGenerated}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {t('batchOperations.billing.summary.totalFailed')}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  {generationResult.totalFailed}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-4 text-sm font-semibold">Generated Billings</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {generationResult.billings.map((billing: any) => (
                    <div
                      key={billing.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-medium">{billing.title}</p>
                        <p className="text-sm text-muted-foreground">{billing.description}</p>
                        <p className="mt-1 text-sm">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(billing.amount)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsPaid({ billingId: billing.id })}
                        disabled={billing.status === BillingStatus.PAID}
                      >
                        {billing.status === BillingStatus.PAID
                          ? t('billing.status.paid')
                          : t('billing.status.markAsPaid')}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {generationResult.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {t('batchOperations.billing.summary.viewErrors')}
                  </h3>
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md bg-white p-2 text-xs dark:bg-gray-800 sm:text-sm">
                  <ul className="list-inside list-disc space-y-1">
                    {generationResult.errors.map((error, index) => (
                      <li key={index}>
                        <span className="font-medium">{error.tenantName}</span>: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {generationResult.errors.length === 0 && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {t('batchOperations.billing.summary.noErrors')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setGenerationResult(null)}
                className="text-xs sm:text-sm h-9 sm:h-10"
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={() => router.push('/billing')}
                className="text-xs sm:text-sm h-9 sm:h-10"
              >
                {t('batchOperations.billing.summary.viewBillings')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/batch-operations')}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {t('batchOperations.billing.title')}
        </h1>
      </div>

      <p className="mb-8 text-sm text-muted-foreground sm:text-base">
        {t('batchOperations.billing.description')}
      </p>

      <Card className="mx-auto max-w-4xl">
        {!isPreviewMode ? (
          <>
            <CardHeader className="p-4 sm:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg">
                {t('batchOperations.billing.configuration')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('batchOperations.billing.configurationDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6 sm:pt-0">
              {/* Target Selection Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.billing.targetSelection')}
                </h3>
                <RadioGroup
                  value={targetType}
                  onValueChange={(value: TargetType) => setTargetType(value)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">{t('batchOperations.billing.allProperties')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="property" id="property" />
                    <Label htmlFor="property">{t('batchOperations.billing.property')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="propertyGroup" id="propertyGroup" />
                    <Label htmlFor="propertyGroup">
                      {t('batchOperations.billing.propertyGroup')}
                    </Label>
                  </div>
                </RadioGroup>

                {targetType === 'property' && (
                  <PropertySelect value={propertyId} onChange={value => setPropertyId(value)} />
                )}

                {targetType === 'propertyGroup' && (
                  <PropertyGroupSelect
                    value={propertyGroupId}
                    onChange={value => setPropertyGroupId(value)}
                  />
                )}
              </div>

              {/* Billing Type Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.billing.billingType')}
                </h3>
                <Select
                  value={billingType}
                  onValueChange={(value: PaymentType) => setBillingType(value)}
                >
                  <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PaymentType).map(type => (
                      <SelectItem key={type} value={type} className="text-xs sm:text-sm">
                        {t(`billing.type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Billing Period Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.billing.periodSettings')}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('batchOperations.billing.dueDate')}</Label>
                    <DatePicker date={dueDate} onSelect={date => date && setDueDate(date)} />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="advance-billing"
                      checked={isAdvanceBilling}
                      onCheckedChange={checked => setIsAdvanceBilling(checked as boolean)}
                    />
                    <Label htmlFor="advance-billing">
                      {t('batchOperations.billing.generateAdvanceBilling')}
                    </Label>
                  </div>

                  {isAdvanceBilling && (
                    <div className="space-y-2">
                      <Label>{t('batchOperations.billing.numberOfMonths')}</Label>
                      <Input
                        type="number"
                        value={billingMonths}
                        onChange={e => setBillingMonths(Number(e.target.value))}
                        className="h-9 text-xs sm:h-10 sm:text-sm"
                        min="1"
                        max="12"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Settings Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.billing.billingSettings')}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="apply-adjustment"
                      checked={applyAdjustment}
                      onCheckedChange={setApplyAdjustment}
                    />
                    <Label htmlFor="apply-adjustment">
                      {t('batchOperations.billing.applyBulkAdjustment')}
                    </Label>
                  </div>
                  {applyAdjustment && (
                    <div className="space-y-2">
                      <Label>{t('batchOperations.billing.adjustmentPercentage')}</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={adjustmentPercentage}
                          onChange={e => setAdjustmentPercentage(Number(e.target.value))}
                          className="h-9 text-xs sm:h-10 sm:text-sm"
                          min="-100"
                          max="100"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  className="h-9 w-full text-xs sm:h-10 sm:text-sm"
                  onClick={handlePreviewGenerate}
                  disabled={
                    (targetType === 'property' && !propertyId) ||
                    (targetType === 'propertyGroup' && !propertyGroupId)
                  }
                >
                  {t('batchOperations.preview')}
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">
                {t('batchOperations.billing.preview.title')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('batchOperations.billing.preview.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-6 grid gap-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('batchOperations.billing.preview.selected', {
                      count: selectedCount,
                    })}
                  </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {previewItems.map((tenant: TenantWithDetails) => (
                      <div
                        key={tenant.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedTenantIds.includes(tenant.id)}
                              onCheckedChange={checked => {
                                if (checked) {
                                  setSelectedTenantIds([...selectedTenantIds, tenant.id]);
                                } else {
                                  setSelectedTenantIds(
                                    selectedTenantIds.filter(id => id !== tenant.id)
                                  );
                                }
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium">{tenant.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {tenant.room.property.name} - Room {tenant.room.number}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-4">
                            <p className="font-medium">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                              }).format(tenant.rentAmount || tenant.room.price)}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaid({ billingId: tenant.id })}
                            >
                              {t('billing.status.markAsPaid')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewMode(false)}
                  className="h-9 text-xs sm:h-10 sm:text-sm"
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleGenerateBillings}
                  disabled={isGenerating || selectedCount === 0}
                  className="h-9 text-xs sm:h-10 sm:text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      {t('batchOperations.billing.preview.generating')}
                    </>
                  ) : (
                    t('batchOperations.billing.preview.generateBillings')
                  )}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      <Card className="mx-auto max-w-3xl text-center py-16">
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-6">
            <Construction className="h-16 w-16 text-primary opacity-60" />

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">{t('common.comingSoon')}</h2>
              <p className="text-muted-foreground">
                {t('batchOperations.billing.comingSoonDescription')}
                <br />
                {t('batchOperations.checkBackLater')}
              </p>
            </div>

            <Link href="/batch-operations" className="text-primary hover:underline">
              {t('common.returnToBatchOperations')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
