'use client';

import { api } from '@/lib/trpc/react';
import { CheckCircle, Upload } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

type BusinessType = 'personal' | 'company';

export default function BusinessVerificationPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Business Information
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('personal');
  const [taxId, setTaxId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  // Documents
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [taxDocument, setTaxDocument] = useState<File | null>(null);
  const [propertyDocument, setPropertyDocument] = useState<File | null>(null);

  const verifyBusiness = api.business.verify.useMutation({
    onSuccess: async () => {
      // First, trigger a new sign in to get fresh token
      const result = await signIn('credentials', {
        redirect: false,
        email: localStorage.getItem('userEmail'),
        password: localStorage.getItem('userPassword'),
      });

      if (result?.error) {
        toast.error('Failed to refresh session');
        setIsLoading(false);
      } else {
        toast.success('Business verification completed successfully!');
        setIsVerified(true);
        setIsLoading(false);
      }
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const handleNextStep = () => {
    // Validate current step before proceeding
    if (step === 1) {
      if (!businessName || !phoneNumber || !address || (businessType === 'company' && !taxId)) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else if (step === 2) {
      if (!businessLicense || !propertyDocument) {
        toast.error('Please upload all required documents');
        return;
      }
      if (businessType === 'company' && !taxDocument) {
        toast.error('Please upload tax document');
        return;
      }
      handleSubmit();
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Upload business license
      const businessLicenseFormData = new FormData();
      if (businessLicense) {
        businessLicenseFormData.append('file', businessLicense);
        const businessLicenseResponse = await fetch('/api/upload/business-license', {
          method: 'POST',
          body: businessLicenseFormData,
        });
        if (!businessLicenseResponse.ok) throw new Error('Failed to upload business license');
        const { url: businessLicenseUrl } = await businessLicenseResponse.json();

        // Upload tax document if business type is company
        let taxDocumentUrl;
        if (businessType === 'company' && taxDocument) {
          const taxDocumentFormData = new FormData();
          taxDocumentFormData.append('file', taxDocument);
          const taxDocumentResponse = await fetch('/api/upload/tax-document', {
            method: 'POST',
            body: taxDocumentFormData,
          });
          if (!taxDocumentResponse.ok) throw new Error('Failed to upload tax document');
          const { url } = await taxDocumentResponse.json();
          taxDocumentUrl = url;
        }

        // Upload property document
        let propertyDocumentUrl;
        if (propertyDocument) {
          const propertyDocumentFormData = new FormData();
          propertyDocumentFormData.append('file', propertyDocument);
          const propertyDocumentResponse = await fetch('/api/upload/property-document', {
            method: 'POST',
            body: propertyDocumentFormData,
          });
          if (!propertyDocumentResponse.ok) throw new Error('Failed to upload property document');
          const { url } = await propertyDocumentResponse.json();
          propertyDocumentUrl = url;
        }

        // Submit verification
        await verifyBusiness.mutateAsync({
          business: {
            name: businessName,
            type: businessType,
            taxId,
            phoneNumber,
            address,
            documents: {
              businessLicense: businessLicenseUrl,
              taxDocument: taxDocumentUrl,
              propertyDocument: propertyDocumentUrl,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error during verification:', error);
      toast.error('Failed to complete verification');
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    if (isVerified) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-6 rounded-full bg-green-100 p-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-foreground">Verification Successful!</h2>
          <p className="mb-8 text-center text-muted-foreground">
            Your business has been verified successfully. You can now start managing your
            properties.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Get Started
            </button>
          </div>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Business Information</h2>
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-foreground">
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-foreground">
                Business Type
              </label>
              <select
                id="businessType"
                value={businessType}
                onChange={e => setBusinessType(e.target.value as BusinessType)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="personal">Personal</option>
                <option value="company">Company</option>
              </select>
            </div>

            {businessType === 'company' && (
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-foreground">
                  Tax ID
                </label>
                <input
                  id="taxId"
                  type="text"
                  value={taxId}
                  onChange={e => setTaxId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-foreground">
                Business Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Required Documents</h2>
            <div>
              <label
                htmlFor="businessLicense"
                className="block text-sm font-medium text-foreground"
              >
                Business License
              </label>
              <div className="mt-1 flex items-center gap-4">
                <input
                  id="businessLicense"
                  type="file"
                  onChange={e => setBusinessLicense(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="businessLicense"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <Upload className="h-4 w-4" />
                  {businessLicense ? businessLicense.name : 'Upload Business License'}
                </label>
              </div>
            </div>

            {businessType === 'company' && (
              <div>
                <label htmlFor="taxDocument" className="block text-sm font-medium text-foreground">
                  Tax Document
                </label>
                <div className="mt-1 flex items-center gap-4">
                  <input
                    id="taxDocument"
                    type="file"
                    onChange={e => setTaxDocument(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="taxDocument"
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <Upload className="h-4 w-4" />
                    {taxDocument ? taxDocument.name : 'Upload Tax Document'}
                  </label>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="propertyDocument"
                className="block text-sm font-medium text-foreground"
              >
                Property Ownership Document
              </label>
              <div className="mt-1 flex items-center gap-4">
                <input
                  id="propertyDocument"
                  type="file"
                  onChange={e => setPropertyDocument(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="propertyDocument"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <Upload className="h-4 w-4" />
                  {propertyDocument ? propertyDocument.name : 'Upload Property Document'}
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Business Verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please provide the following information to verify your business
        </p>
      </div>

      {!isVerified && (
        <div className="mb-8">
          <div className="relative">
            <div className="absolute left-0 top-2 h-0.5 w-full bg-gray-200">
              <div
                className="absolute h-0.5 bg-primary transition-all duration-300"
                style={{ width: `${((step - 1) / 1) * 100}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              <div className="step-item">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    step >= 1 ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  1
                </div>
                <p
                  className={`mt-2 text-xs ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Business Info
                </p>
              </div>
              <div className="step-item">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    step >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  2
                </div>
                <p
                  className={`mt-2 text-xs ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  Documents
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-card p-6 shadow-sm">
        <div>
          {renderStep()}

          {!isVerified && (
            <div className="mt-8 flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                >
                  Previous
                </button>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isLoading}
                  className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Submitting...' : 'Complete Verification'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
