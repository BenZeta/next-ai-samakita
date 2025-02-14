"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";

export default function ContractUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");

  const uploadContractMutation = api.tenant.uploadContract.useMutation({
    onSuccess: () => {
      toast.success("Contract uploaded successfully!");
      if (tenantId) {
        router.push(`/tenants/${tenantId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
        toast.error("File size should be less than 5MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !tenantId) return;

    setLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await uploadContractMutation.mutateAsync({
          tenantId,
          file: base64String.split(",")[1], // Remove data URL prefix
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to upload contract:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Missing tenant ID</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 text-2xl font-bold">Upload Signed Contract</h1>

      <div className="rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select PDF File
          </label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 5MB</p>
            </div>
          </div>
        </div>

        {file && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Selected file: {file.name}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload Contract"}
        </button>
      </div>
    </div>
  );
} 