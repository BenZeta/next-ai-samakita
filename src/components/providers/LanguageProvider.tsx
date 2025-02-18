'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [messages, setMessages] = useState<any>(null);
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    // Load saved language preference
    const savedLocale = localStorage.getItem('language') || 'en';
    setLocale(savedLocale);

    // Load messages for the current locale
    import(`../../messages/${savedLocale}.json`)
      .then(messages => {
        setMessages(messages.default);
      })
      .catch(error => {
        console.error('Error loading messages:', error);
        // Fallback to English if there's an error
        import('../../messages/en.json').then(messages => {
          setMessages(messages.default);
        });
      });
  }, []);

  if (!messages) {
    return null; // or a loading spinner
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

// Export a hook to use and update the language
export function useLanguage() {
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('language') || 'en';
    setLocale(savedLocale);
  }, []);

  const changeLanguage = (newLocale: string) => {
    localStorage.setItem('language', newLocale);
    window.location.reload(); // Reload to apply new language
  };

  return { locale, changeLanguage };
}
