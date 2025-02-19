'use client';

import { AnimatePresence, motion } from 'framer-motion';
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
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// All navigation items
const navigation = [
  { name: 'sidebar.dashboard', href: '/dashboard', icon: Home },
  { name: 'sidebar.properties', href: '/properties', icon: Building2 },
  { name: 'sidebar.tenants', href: '/tenants', icon: Users },
  { name: 'sidebar.expenses', href: '/expenses', icon: Receipt },
  { name: 'sidebar.billing', href: '/billing', icon: CreditCard },
  { name: 'sidebar.settings', href: '/settings', icon: Settings },
];

const Sidebar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { data: session } = useSession();
  const isVerified = session?.token?.businessVerified === true;
  const t = useTranslations();

  // Auto-close sidebar on mobile with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.innerWidth < 1024) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!session) return null;

  return (
    <div className="flex h-screen">
      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? 256 : 80,
          transition: { duration: 0.3, type: 'spring', stiffness: 200, damping: 25 },
        }}
        className="fixed left-0 top-0 z-50 h-screen overflow-hidden border-r border-input bg-card shadow-xl"
      >
        <motion.div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-input px-4">
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2"
                >
                  <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src="https://ik.imagekit.io/matguchi18/sk.png"
                      alt="Sama Kita Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h1 className="text-xl font-bold text-black dark:text-white">SamaKita</h1>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(!isOpen)}
              className={`rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground ${!isOpen && 'w-full'}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={!isOpen ? 'mx-auto' : ''}
                >
                  {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navigation.map((item, index) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={item.href}>
                    <motion.div
                      className={`group relative flex items-center rounded-xl p-2 text-sm font-medium ${
                        isActive
                          ? 'bg-accent text-white dark:text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                      whileHover={{ x: 4 }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        className={`relative z-10 ${!isOpen && 'mx-auto'}`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isActive
                              ? 'text-white dark:text-foreground'
                              : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                        />
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {isOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="relative z-10 ml-2 truncate"
                          >
                            {t(item.name)}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-gray-800/90"
                          layoutId="activeBackground"
                          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-input p-4">
            <motion.button
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="group flex w-full items-center rounded-xl p-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={!isOpen ? 'mx-auto' : ''}
              >
                <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
              </motion.div>
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ml-2 truncate"
                  >
                    {t('sidebar.signOut')}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {!isVerified && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl bg-accent/50 p-3"
              >
                <Link
                  href="/business-verification"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                    className={!isOpen ? 'mx-auto' : ''}
                  >
                    <FileCheck className="h-5 w-5" />
                  </motion.div>
                  <AnimatePresence mode="wait">
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="truncate"
                      >
                        {t('sidebar.verifyBusiness')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.aside>

      {/* Main content wrapper with margin */}
      <motion.div
        initial={false}
        animate={{
          marginLeft: isOpen ? '256px' : '80px',
          transition: { duration: 0.3, type: 'spring', stiffness: 200, damping: 25 },
        }}
        className="flex-1 overflow-auto"
      >
        {/* Overlay for mobile */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export { Sidebar };
