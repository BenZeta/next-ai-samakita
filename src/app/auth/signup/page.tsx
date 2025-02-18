'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 form data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 form data
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string>('');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleKtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast.error('File size should not exceed 5MB');
        return;
      }
      setKtpFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setKtpPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let ktpUrl = '';

      // Only upload KTP if file is provided
      if (ktpFile) {
        const formData = new FormData();
        formData.append('file', ktpFile);

        const response = await fetch('/api/upload/ktp', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload KTP');
        }

        const data = await response.json();
        ktpUrl = data.url;
      }

      // Register user via tRPC
      const result = await fetch('/api/trpc/auth.register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            email,
            password,
            name: fullName,
            phone,
            address,
            ktpFile: ktpUrl || '', // Send empty string if no KTP URL
          },
        }),
      });

      if (!result.ok) {
        const error = await result.json();
        throw new Error(error.error?.message || 'Failed to create account');
      }

      toast.success('Account created successfully!');
      router.push('/auth/signin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90 px-4 py-8 overflow-hidden">
      {/* Modern Geometric Background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        {/* Large Animated Circles */}
        <div className="absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-morph rounded-full bg-gradient-to-r from-primary/40 to-foreground/40 blur-3xl"></div>
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-morph-delayed rounded-full bg-gradient-to-r from-foreground/40 to-primary/40 blur-3xl"></div>
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Glowing Orbs */}
        <div className="absolute inset-0">
          <div className="absolute left-20 top-20 h-24 w-24 animate-float-slow rounded-full bg-foreground/30 shadow-[0_0_40px_20px] shadow-foreground/20"></div>
          <div className="absolute right-40 bottom-40 h-32 w-32 animate-float rounded-full bg-primary/30 shadow-[0_0_40px_20px] shadow-primary/20"></div>
          <div className="absolute left-1/3 top-1/2 h-28 w-28 animate-float-delayed rounded-full bg-foreground/30 shadow-[0_0_40px_20px] shadow-foreground/20"></div>
        </div>

        {/* Animated Lines */}
        <div className="absolute inset-0">
          <div className="absolute left-0 top-1/4 h-px w-full animate-network bg-gradient-to-r from-transparent via-foreground/40 to-transparent"></div>
          <div className="absolute left-0 top-2/4 h-px w-full animate-network-delayed bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
          <div className="absolute left-0 top-3/4 h-px w-full animate-network bg-gradient-to-r from-transparent via-foreground/40 to-transparent"></div>
        </div>

        {/* Diagonal Lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 top-0 h-[200%] w-1 rotate-45 animate-beam bg-gradient-to-b from-transparent via-foreground/30 to-transparent"></div>
          <div className="absolute left-1/2 top-0 h-[200%] w-1 rotate-45 animate-beam-delayed bg-gradient-to-b from-transparent via-primary/30 to-transparent"></div>
          <div className="absolute right-1/4 top-0 h-[200%] w-1 rotate-45 animate-beam bg-gradient-to-b from-transparent via-foreground/30 to-transparent"></div>
        </div>
      </div>

      {/* Logo & Brand Section */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="group relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-600 dark:bg-gray-700 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 via-foreground/40 to-foreground/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative h-14 w-14 overflow-hidden">
              <Image
                src="https://ik.imagekit.io/matguchi18/sk.png"
                alt="SamaKita Logo"
                fill
                className="object-contain transition-all duration-300 group-hover:scale-110"
              />
            </div>
          </div>
        </div>
        <h1 className="relative bg-gradient-to-r from-primary via-foreground to-foreground bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Create Account
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Join SamaKita and manage your properties
        </p>
      </div>

      {/* Progress Steps */}
      <div className="relative mb-6 flex w-full max-w-[400px] items-center justify-between">
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-muted"></div>
        <motion.div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: step === 1 ? '50%' : '100%' }}
          transition={{ duration: 0.3 }}
        ></motion.div>
        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          1
        </div>
        <div
          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          2
        </div>
      </div>

      {/* Signup Card */}
      <div className="group relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-card/90 p-5 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-foreground/10 to-foreground/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Let's start with your basic details
                </p>
              </div>

              <form onSubmit={handleNextStep} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Confirm
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="relative w-full overflow-hidden rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <span className="flex items-center justify-center">
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-foreground">Contact Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Almost there! Just a few more details
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+62812xxx"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ktpFile"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      KTP File (Optional)
                    </label>
                    <div className="relative">
                      <input
                        id="ktpFile"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleKtpChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="ktpFile"
                        className="flex h-[42px] w-full cursor-pointer items-center justify-center rounded-lg border border-input bg-background/80 px-4 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                      >
                        {ktpFile ? <span className="truncate">{ktpFile.name}</span> : 'Upload KTP'}
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Address
                  </label>
                  <textarea
                    id="address"
                    required
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    rows={2}
                    className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter your full address"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="relative flex-1 overflow-hidden rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-muted/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <span className="flex items-center justify-center">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative flex-1 overflow-hidden rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                        <span className="ml-2">Creating...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-primary transition-colors hover:text-primary/90"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
