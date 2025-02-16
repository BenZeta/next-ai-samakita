'use client';

import { api } from '@/lib/trpc/react';
import { Building2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function BusinessVerificationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Business Information
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('personal'); // personal or company
  const [taxId, setTaxId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  // Property Information
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyProvince, setPropertyProvince] = useState('');
  const [propertyPostalCode, setPropertyPostalCode] = useState('');
  const [propertyDescription, setPropertyDescription] = useState('');

  // Documents
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [taxDocument, setTaxDocument] = useState<File | null>(null);
  const [propertyDocument, setPropertyDocument] = useState<File | null>(null);

  const verifyBusiness = api.business.verify.useMutation({
    onSuccess: () => {
      toast.success('Business verification submitted successfully!');
      router.push('/dashboard');
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Upload documents first
      const uploadPromises = [];
      if (businessLicense) {
        const formData = new FormData();
        formData.append('file', businessLicense);
        uploadPromises.push(
          fetch('/api/upload/business-license', { method: 'POST', body: formData })
        );
      }
      if (taxDocument) {
        const formData = new FormData();
        formData.append('file', taxDocument);
        uploadPromises.push(fetch('/api/upload/tax-document', { method: 'POST', body: formData }));
      }
      if (propertyDocument) {
        const formData = new FormData();
        formData.append('file', propertyDocument);
        uploadPromises.push(
          fetch('/api/upload/property-document', { method: 'POST', body: formData })
        );
      }

      const uploadResults = await Promise.all(uploadPromises);
      const documentUrls = await Promise.all(uploadResults.map(res => res.json()));

      // Submit verification
      await verifyBusiness.mutateAsync({
        business: {
          name: businessName,
          type: businessType,
          taxId,
          phoneNumber,
          address,
          documents: {
            businessLicense: documentUrls[0]?.url,
            taxDocument: documentUrls[1]?.url,
            propertyDocument: documentUrls[2]?.url,
          },
        },
        property: {
          name: propertyName,
          address: propertyAddress,
          city: propertyCity,
          province: propertyProvince,
          postalCode: propertyPostalCode,
          description: propertyDescription,
        },
      });
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to submit verification');
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Business Information</h2>
            <div>
              <label className="block text-sm font-medium text-foreground">Business Type</label>
              <div className="mt-2 space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="personal"
                    checked={businessType === 'personal'}
                    onChange={e => setBusinessType(e.target.value)}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2">Personal</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="company"
                    checked={businessType === 'company'}
                    onChange={e => setBusinessType(e.target.value)}
                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2">Company</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Tax ID (NPWP)</label>
              <input
                type="text"
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                required={businessType === 'company'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Business Address</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                rows={3}
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Property Information</h2>
            <div>
              <label className="block text-sm font-medium text-foreground">Property Name</label>
              <input
                type="text"
                value={propertyName}
                onChange={e => setPropertyName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Property Address</label>
              <textarea
                value={propertyAddress}
                onChange={e => setPropertyAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground">City</label>
                <input
                  type="text"
                  value={propertyCity}
                  onChange={e => setPropertyCity(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Province</label>
                <input
                  type="text"
                  value={propertyProvince}
                  onChange={e => setPropertyProvince(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Postal Code</label>
              <input
                type="text"
                value={propertyPostalCode}
                onChange={e => setPropertyPostalCode(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Property Description
              </label>
              <textarea
                value={propertyDescription}
                onChange={e => setPropertyDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                rows={4}
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Document Upload</h2>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Business License (SIUP/NIB)
              </label>
              <div className="mt-1 flex items-center">
                <label className="flex w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-8 text-sm text-muted-foreground hover:border-primary">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setBusinessLicense(e.target.files?.[0] || null)}
                  />
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6" />
                    <span className="mt-2 block">
                      {businessLicense ? businessLicense.name : 'Upload business license'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
            {businessType === 'company' && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Tax Registration Document
                </label>
                <div className="mt-1 flex items-center">
                  <label className="flex w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-8 text-sm text-muted-foreground hover:border-primary">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setTaxDocument(e.target.files?.[0] || null)}
                    />
                    <div className="text-center">
                      <Upload className="mx-auto h-6 w-6" />
                      <span className="mt-2 block">
                        {taxDocument ? taxDocument.name : 'Upload tax document'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground">
                Property Ownership Document
              </label>
              <div className="mt-1 flex items-center">
                <label className="flex w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-8 text-sm text-muted-foreground hover:border-primary">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setPropertyDocument(e.target.files?.[0] || null)}
                  />
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6" />
                    <span className="mt-2 block">
                      {propertyDocument ? propertyDocument.name : 'Upload property document'}
                    </span>
                  </div>
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold text-foreground">
            Complete Your Business Profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please provide the following information to verify your business
          </p>
        </div>

        <div className="mt-12">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`flex-1 ${i < 3 ? 'border-t-2' : ''} ${
                    i <= step ? 'border-primary' : 'border-input'
                  } relative`}
                >
                  <div
                    className={`absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full ${
                      i === step
                        ? 'bg-primary text-primary-foreground'
                        : i < step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-input text-muted-foreground'
                    }`}
                  >
                    {i}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between text-xs">
              <span className={step >= 1 ? 'text-foreground' : 'text-muted-foreground'}>
                Business Info
              </span>
              <span className={step >= 2 ? 'text-foreground' : 'text-muted-foreground'}>
                Property Details
              </span>
              <span className={step >= 3 ? 'text-foreground' : 'text-muted-foreground'}>
                Documents
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {renderStep()}

            <div className="flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent"
                >
                  Previous
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? 'Submitting...' : 'Submit Verification'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
