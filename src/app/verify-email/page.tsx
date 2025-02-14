"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  const verifyEmailMutation = api.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (error) => {
      setStatus("error");
      setError(error.message);
    },
  });

  useEffect(() => {
    if (token) {
      verifyEmailMutation.mutate({ token });
    } else {
      setStatus("error");
      setError("No verification token provided");
    }
  }, [token, verifyEmailMutation]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Verifying your email...</h1>
          <p>Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Verification Failed</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-green-600">Email Verified!</h1>
        <p className="text-gray-600">Your email has been successfully verified.</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">Loading...</h1>
            <p>Please wait...</p>
          </div>
        </div>
      }>
      <VerifyEmailContent />
    </Suspense>
  );
}
