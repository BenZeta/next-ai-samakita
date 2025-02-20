'use client';

import { useTheme } from 'next-themes';
import { ToastContainer } from 'react-toastify';

export function ThemeAwareToast() {
  const { resolvedTheme } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      limit={3}
      style={{ zIndex: 9999 }}
    />
  );
}
