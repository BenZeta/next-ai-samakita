'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { PaymentMethod } from '@prisma/client';
import { AlertTriangle, ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'use-intl';

type TargetType = 'property' | 'propertyGroup' | 'all';

export default function BatchPaymentGenerationPage() {
  const t = useTranslations();
  const router = useRouter();
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [propertyId, setPropertyId] = useState<string>('');
  const [propertyGroupId, setPropertyGroupId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.MANUAL);
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

  // Fetch properties
  const { data: propertiesData } = api.property.list.useQuery({
    limit: 100,
  });
  const properties = propertiesData?.properties || [];

  // Fetch property groups
  const { data: propertyGroupsData } = api.propertyGroup.list.useQuery();
  const propertyGroups = propertyGroupsData?.groups || [];

  // Mutation for batch payment generation
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationResult(null);

    try {
      await generateBatchMutation.mutateAsync({
        propertyId: targetType === 'property' ? propertyId : undefined,
        propertyGroupId: targetType === 'propertyGroup' ? propertyGroupId : undefined,
        paymentMethod,
      });
    } catch (error) {
      // Error is handled in the mutation callbacks
      console.error('Failed to generate payments:', error);
    }
  };

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

      {!generationResult ? (
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="p-4 sm:p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t('batchOperations.payments.title')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t('batchOperations.payments.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 sm:pt-0">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('batchOperations.payments.selectTarget')}
              </label>
              <Select
                value={targetType}
                onValueChange={value => setTargetType(value as TargetType)}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
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
                <label className="text-sm font-medium">
                  {t('batchOperations.payments.selectProperty')}
                </label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
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
                <label className="text-sm font-medium">
                  {t('batchOperations.payments.selectPropertyGroup')}
                </label>
                <Select value={propertyGroupId} onValueChange={setPropertyGroupId}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyGroups.map(group => (
                      <SelectItem key={group.id} value={group.id} className="text-xs sm:text-sm">
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('batchOperations.payments.paymentMethod')}
              </label>
              <Select
                value={paymentMethod}
                onValueChange={value => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
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
                className="w-full text-xs sm:text-sm h-9 sm:h-10"
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  (targetType === 'property' && !propertyId) ||
                  (targetType === 'propertyGroup' && !propertyGroupId)
                }
              >
                {isGenerating
                  ? t('batchOperations.payments.generating')
                  : t('batchOperations.payments.generate')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
