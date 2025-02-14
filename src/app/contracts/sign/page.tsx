"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

function ContractSigningContent() {
  const searchParams = useSearchParams();
  const contractUrl = searchParams.get("contractUrl");
  const tenantId = searchParams.get("tenantId");
  const signatureRef = useRef<SignatureCanvas>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signContractMutation = api.tenant.signContract.useMutation({
    onSuccess: () => {
      toast.success("Contract signed successfully!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSign = async () => {
    if (!signatureRef.current || !tenantId) return;

    const signature = signatureRef.current.toDataURL();
    setLoading(true);

    try {
      await signContractMutation.mutateAsync({
        tenantId,
        signature,
        signedDate: new Date(),
      });
    } catch (error) {
      console.error("Failed to sign contract:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  if (!contractUrl || !tenantId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Invalid contract URL or tenant ID</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-2xl font-bold">Contract Signing</h1>

      <div className="mb-8 rounded-lg border border-gray-200 p-4">
        <h2 className="mb-4 text-lg font-medium">Contract Preview</h2>
        <iframe
          src={contractUrl}
          className="h-[600px] w-full rounded-lg border border-gray-200"
          title="Contract Preview"
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-medium">Digital Signature</h2>
        <div className="rounded-lg border border-gray-200 p-4">
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              className: "w-full h-64 border border-gray-300 rounded-lg",
            }}
          />
          <div className="mt-4 flex justify-end space-x-4">
            <button
              onClick={clearSignature}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Clear
            </button>
            <button
              onClick={handleSign}
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
              {loading ? "Signing..." : "Sign Contract"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContractSigningPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContractSigningContent />
    </Suspense>
  );
}
