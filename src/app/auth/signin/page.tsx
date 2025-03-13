'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userPassword', password);

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPassword');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('An error occurred during sign in');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPassword');
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
      <div className="relative mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="group relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-600 dark:bg-gray-700 shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 via-foreground/40 to-foreground/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative h-14 w-14 overflow-hidden">
              <Image
                src="https://ik.imagekit.io/matguchi18/sk.png"
                alt="Superkos Logo"
                fill
                sizes="(max-width: 768px) 56px, 56px"
                className="object-contain transition-all duration-300 group-hover:scale-110"
              />
            </div>
          </div>
        </div>
        <h1 className="relative bg-gradient-to-r from-primary via-foreground to-foreground bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Welcome to SamaKita
        </h1>
        <p className="mt-2 text-base text-muted-foreground">Property management made simple</p>
      </div>

      {/* Login Card */}
      <div className="group relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-card/90 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-foreground/10 to-foreground/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
        <div className="relative">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background/80 px-4 py-2.5 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                  <span className="ml-2">Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href="/auth/signup"
                className="font-medium text-primary transition-colors hover:text-primary/90"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
