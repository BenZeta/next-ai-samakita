'use client';

import {
  Building2,
  CreditCard,
  FileCheck,
  Home,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// All navigation items
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { data: session } = useSession();
  const isVerified = session?.token?.businessVerified === true;

  // Auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render sidebar if not authenticated
  if (!session) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-background p-2 text-foreground shadow-sm lg:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-gray-900 transition-all duration-200 ease-in-out lg:relative ${
          isOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:w-20 lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6">
            <h1
              className={`text-xl font-bold text-white transition-opacity duration-200 ${
                isOpen ? 'opacity-100' : 'lg:opacity-0'
              }`}
            >
              Superkos CMS
            </h1>
            {/* Desktop close button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="hidden rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white lg:block"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map(item => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`transition-opacity duration-200 ${
                      isOpen ? 'opacity-100' : 'lg:hidden'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Section */}
          <div className="mt-auto">
            {/* Sign Out Button */}
            <div className="px-3 pb-4">
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white" />
                <span
                  className={`transition-opacity duration-200 ${
                    isOpen ? 'opacity-100' : 'lg:hidden'
                  }`}
                >
                  Sign Out
                </span>
              </button>
            </div>

            {/* Business Verification Banner */}
            {!isVerified && (
              <div className="bg-yellow-600 p-4">
                <Link
                  href="/business-verification"
                  className="flex items-center gap-2 text-sm text-white hover:text-white/90"
                >
                  <FileCheck className="h-5 w-5" />
                  <span className={`${isOpen ? 'block' : 'lg:hidden'}`}>
                    Complete Business Verification
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
