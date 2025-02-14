"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";
import SignatureCanvas from "react-signature-canvas";

export default function ContractSigningPage() {
  const searchParams = useSearchParams();
  const contractUrl = searchParams.get("url");
  const [isLoading, setIsLoading] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const signContractMutation = api.tenant.signContract.useMutation({
    onSuccess: () => {
      toast.success("Contract signed successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSign = async () => {
    if (!signatureRef.current) return;
    if (signatureRef.current.isEmpty()) {
      toast.error("Please provide your signature");
      return;
    }

    setIsLoading(true);
    try {
      const signatureData = signatureRef.current.toDataURL();
      await signContractMutation.mutateAsync({
        tenantId: "", // This should be extracted from the contract URL or passed as a param
        signature: signatureData,
        signedDate: new Date(),
      });
    } catch (error) {
      console.error("Error signing contract:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  if (!contractUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Contract URL</h1>
          <p className="mt-2 text-gray-600">The contract URL is missing or invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Sign Rental Agreement</h1>

        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <iframe
            src={contractUrl}
            className="h-[600px] w-full rounded border border-gray-200"
            title="Rental Agreement"
          />
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Digital Signature</h2>
          <div className="mb-4 rounded border border-gray-300 bg-white">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: "w-full h-40",
              }}
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={clearSignature}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Clear Signature
            </button>
            <button
              onClick={handleSign}
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {isLoading ? "Signing..." : "Sign Contract"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
