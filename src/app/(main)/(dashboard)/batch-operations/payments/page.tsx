'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/trpc/react';
import { PaymentMethod } from '@prisma/client';
import { TRPCClientError } from '@trpc/client';
import { format } from 'date-fns';
import { AlertTriangle, ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

type TargetType = 'property' | 'propertyGroup' | 'all';

interface PaymentPreviewItem {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  baseAmount: number;
  adjustedAmount: number;
  isSelected: boolean;
  hasSpecialArrangement: boolean;
  lastPaymentDate?: Date;
}

type PreviewTenant = {
  id: string;
  name: string;
  rentAmount: number | null;
  room: {
    number: string;
    price: number;
    property: {
      name: string;
    };
  };
  payments: Array<{
    createdAt: Date;
  }>;
};

interface Tenant {
  id: string;
  name: string;
  rentAmount: number | null;
  notes: string | null;
  room: {
    number: string;
    price: number;
    property: {
      name: string;
    };
  };
  payments: Array<{
    createdAt: Date;
  }>;
}

export default function BatchPaymentGenerationPage() {
  const t = useTranslations();
  const router = useRouter();

  // Basic Selection States
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [propertyId, setPropertyId] = useState<string>('');
  const [propertyGroupId, setPropertyGroupId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.MANUAL);

  // Payment Period States
  const [periodStartDate, setPeriodStartDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [generateForMonths, setGenerateForMonths] = useState(1);

  // Payment Settings States
  const [includeLateFee, setIncludeLateFee] = useState(false);
  const [lateFeePercentage, setLateFeePercentage] = useState(0);
  const [bulkAdjustmentPercentage, setBulkAdjustmentPercentage] = useState(0);
  const [applyAdjustment, setApplyAdjustment] = useState(false);

  // Preview States
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewItems, setPreviewItems] = useState<PaymentPreviewItem[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());

  // Process States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    payments: Array<any>;
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
    (sum, item) => (item.isSelected ? sum + item.adjustedAmount : sum),
    0
  );
  const selectedCount = previewItems.filter(item => item.isSelected).length;

  // Mutations
  const previewTenantsMutation = api.payment.getPreviewTenants.useMutation();
  const generateBatchMutation = api.payment.generateBatch.useMutation({
    onSuccess: data => {
      setGenerationResult(data);
      toast.success(t('batchOperations.payments.success'));
      setIsGenerating(false);
    },
    onError: error => {
      toast.error(error.message || t('batchOperations.payments.error'));
      setIsGenerating(false);
    },
  });

  // Preview generation handler
  const handlePreviewGenerate = async () => {
    try {
      // Get tenants based on property selection
      const tenants = await previewTenantsMutation.mutateAsync({
        propertyId: targetType === 'property' ? propertyId : undefined,
        propertyGroupId: targetType === 'propertyGroup' ? propertyGroupId : undefined,
      });

      if (!tenants || tenants.length === 0) {
        toast.error(t('batchOperations.payments.noTenantsFound'));
        return;
      }

      const items: PaymentPreviewItem[] = tenants.map(tenant => ({
        tenantId: tenant.id,
        tenantName: tenant.name,
        propertyName: tenant.room.property.name,
        roomNumber: tenant.room.number,
        baseAmount: tenant.rentAmount || tenant.room.price,
        adjustedAmount: calculateAdjustedAmount(
          tenant.rentAmount || tenant.room.price,
          includeLateFee ? lateFeePercentage : 0,
          applyAdjustment ? bulkAdjustmentPercentage : 0
        ),
        isSelected: true,
        hasSpecialArrangement: Boolean(tenant.rentAmount),
        lastPaymentDate: tenant.payments[0]?.createdAt,
      }));

      setPreviewItems(items);
      setSelectedTenants(new Set(items.map(item => item.tenantId)));
      setIsPreviewMode(true);
    } catch (err: unknown) {
      console.error('Failed to fetch preview data:', err);
      if (err instanceof TRPCClientError) {
        toast.error(err.message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  // Calculate adjusted amount helper
  const calculateAdjustedAmount = (
    baseAmount: number,
    lateFeePercentage: number,
    adjustmentPercentage: number
  ) => {
    let amount = baseAmount;

    // Apply late fee if enabled
    if (lateFeePercentage > 0) {
      amount += (baseAmount * lateFeePercentage) / 100;
    }

    // Apply bulk adjustment if any
    if (adjustmentPercentage !== 0) {
      amount += (amount * adjustmentPercentage) / 100;
    }

    return amount;
  };

  // Handle final generation
  const handleGenerate = async () => {
    if (selectedTenants.size === 0) return;

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const result = await generateBatchMutation.mutateAsync({
        propertyId: targetType === 'property' ? propertyId : undefined,
        propertyGroupId: targetType === 'propertyGroup' ? propertyGroupId : undefined,
        paymentMethod,
        periodStartDate,
        dueDate,
        selectedTenantIds: Array.from(selectedTenants),
        isAdvancePayment,
        generateForMonths,
        includeLateFee,
        lateFeePercentage,
        adjustmentPercentage: applyAdjustment ? bulkAdjustmentPercentage : 0,
      });

      setGenerationResult(result);
      toast.success(t('batchOperations.payments.success'));
    } catch (err: unknown) {
      console.error('Failed to generate payments:', err);
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(t('batchOperations.payments.error'));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (generationResult) {
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
            {t('batchOperations.payments.title')}
          </h1>
        </div>

        <p className="mb-8 text-sm text-muted-foreground sm:text-base">
          {t('batchOperations.payments.description')}
        </p>

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="p-4 sm:p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t('batchOperations.payments.summary.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 sm:pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {t('batchOperations.payments.summary.totalGenerated')}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  {generationResult.totalGenerated}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {t('batchOperations.payments.summary.totalFailed')}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  {generationResult.totalFailed}
                </p>
              </div>
            </div>

            {generationResult.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {t('batchOperations.payments.summary.viewErrors')}
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
                    {t('batchOperations.payments.summary.noErrors')}
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
                {t('batchOperations.payments.summary.viewPayments')}
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
          {t('batchOperations.payments.title')}
        </h1>
      </div>

      <p className="mb-8 text-sm text-muted-foreground sm:text-base">
        {t('batchOperations.payments.description')}
      </p>

      <Card className="mx-auto max-w-4xl">
        {!isPreviewMode ? (
          <>
            <CardHeader className="p-4 sm:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg">
                {t('batchOperations.payments.configuration')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('batchOperations.payments.configurationDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6 sm:pt-0">
              {/* Target Selection Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.payments.targetSelection')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('batchOperations.payments.selectTarget')}</Label>
                    <Select
                      value={targetType}
                      onValueChange={value => setTargetType(value as TargetType)}
                    >
                      <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="property" className="text-xs sm:text-sm">
                          {t('batchOperations.payments.property')}
                        </SelectItem>
                        <SelectItem value="propertyGroup" className="text-xs sm:text-sm">
                          {t('batchOperations.payments.propertyGroup')}
                        </SelectItem>
                        <SelectItem value="all" className="text-xs sm:text-sm">
                          {t('batchOperations.payments.allProperties')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {targetType === 'property' && (
                    <div className="space-y-2">
                      <Label>{t('batchOperations.payments.selectProperty')}</Label>
                      <Select value={propertyId} onValueChange={setPropertyId}>
                        <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map(property => (
                            <SelectItem
                              key={property.id}
                              value={property.id}
                              className="text-xs sm:text-sm"
                            >
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {targetType === 'propertyGroup' && (
                    <div className="space-y-2">
                      <Label>{t('batchOperations.payments.selectPropertyGroup')}</Label>
                      <Select value={propertyGroupId} onValueChange={setPropertyGroupId}>
                        <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyGroups.map(group => (
                            <SelectItem
                              key={group.id}
                              value={group.id}
                              className="text-xs sm:text-sm"
                            >
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Period Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.payments.periodSettings')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('batchOperations.payments.periodStartDate')}</Label>
                    <DatePicker
                      date={periodStartDate}
                      onSelect={date => date && setPeriodStartDate(date)}
                      className="h-9 text-xs sm:h-10 sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('batchOperations.payments.dueDate')}</Label>
                    <DatePicker
                      date={dueDate}
                      onSelect={date => date && setDueDate(date)}
                      className="h-9 text-xs sm:h-10 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="advance-payment"
                    checked={isAdvancePayment}
                    onCheckedChange={setIsAdvancePayment}
                  />
                  <Label htmlFor="advance-payment">
                    {t('batchOperations.payments.generateAdvancePayment')}
                  </Label>
                </div>
                {isAdvancePayment && (
                  <div className="space-y-2">
                    <Label>{t('batchOperations.payments.numberOfMonths')}</Label>
                    <Select
                      value={String(generateForMonths)}
                      onValueChange={value => setGenerateForMonths(Number(value))}
                    >
                      <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 6, 12].map(months => (
                          <SelectItem
                            key={months}
                            value={String(months)}
                            className="text-xs sm:text-sm"
                          >
                            {months} {months === 1 ? t('common.month') : t('common.months')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Payment Settings Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.payments.paymentSettings')}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-late-fee"
                      checked={includeLateFee}
                      onCheckedChange={setIncludeLateFee}
                    />
                    <Label htmlFor="include-late-fee">
                      {t('batchOperations.payments.includeLateFee')}
                    </Label>
                  </div>
                  {includeLateFee && (
                    <div className="space-y-2">
                      <Label>{t('batchOperations.payments.lateFeePercentage')}</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={lateFeePercentage}
                          onChange={e => setLateFeePercentage(Number(e.target.value))}
                          className="h-9 text-xs sm:h-10 sm:text-sm"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="apply-adjustment"
                        checked={applyAdjustment}
                        onCheckedChange={setApplyAdjustment}
                      />
                      <Label htmlFor="apply-adjustment">
                        {t('batchOperations.payments.applyBulkAdjustment')}
                      </Label>
                    </div>
                    {applyAdjustment && (
                      <div className="space-y-2">
                        <Label>{t('batchOperations.payments.adjustmentPercentage')}</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={bulkAdjustmentPercentage}
                            onChange={e => setBulkAdjustmentPercentage(Number(e.target.value))}
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
              </div>

              {/* Payment Method Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  {t('batchOperations.payments.paymentMethod')}
                </h3>
                <Select
                  value={paymentMethod}
                  onValueChange={value => setPaymentMethod(value as PaymentMethod)}
                >
                  <SelectTrigger className="h-9 text-xs sm:h-10 sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.MANUAL} className="text-xs sm:text-sm">
                      {t('batchOperations.payments.manual')}
                    </SelectItem>
                    <SelectItem value={PaymentMethod.STRIPE} className="text-xs sm:text-sm">
                      {t('batchOperations.payments.stripe')}
                    </SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER} className="text-xs sm:text-sm">
                      {t('batchOperations.payments.bank')}
                    </SelectItem>
                    <SelectItem value={PaymentMethod.CASH} className="text-xs sm:text-sm">
                      {t('batchOperations.payments.cash')}
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                {t('batchOperations.payments.preview.title')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('batchOperations.payments.preview.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 sm:pt-0">
              <div className="rounded-lg border border-border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {t('batchOperations.payments.preview.summary')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t('batchOperations.payments.preview.selected', { count: selectedCount })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {t('batchOperations.payments.preview.totalAmount')}
                    </p>
                    <p className="text-lg font-bold">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(totalAmount)}
                    </p>
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {previewItems.map(item => (
                      <div
                        key={item.tenantId}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={item.isSelected}
                            onCheckedChange={checked => {
                              const newSelected = new Set(selectedTenants);
                              if (checked) {
                                newSelected.add(item.tenantId);
                              } else {
                                newSelected.delete(item.tenantId);
                              }
                              setSelectedTenants(newSelected);

                              setPreviewItems(
                                previewItems.map(i =>
                                  i.tenantId === item.tenantId
                                    ? { ...i, isSelected: checked as boolean }
                                    : i
                                )
                              );
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium">{item.tenantName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.propertyName} - Room {item.roomNumber}
                            </p>
                            {item.hasSpecialArrangement && (
                              <span className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                {t('batchOperations.payments.preview.specialArrangement')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(item.adjustedAmount)}
                          </p>
                          {item.baseAmount !== item.adjustedAmount && (
                            <p className="text-xs text-muted-foreground line-through">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                              }).format(item.baseAmount)}
                            </p>
                          )}
                          {item.lastPaymentDate && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('batchOperations.payments.preview.lastPayment', {
                                date: format(item.lastPaymentDate, 'dd MMM yyyy'),
                              })}
                            </p>
                          )}
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
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedCount === 0}
                  className="h-9 text-xs sm:h-10 sm:text-sm"
                >
                  {isGenerating
                    ? t('batchOperations.payments.generating')
                    : t('batchOperations.payments.generate')}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
