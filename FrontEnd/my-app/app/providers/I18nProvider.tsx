'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'use-intl';
import { useEffect, useState } from 'react';
import { defaultLocale } from '@/lib/i18n/config';

async function loadMessages(locale: string) {
  try {
    return (await import(`@/lib/i18n/messages/${locale}.json`)).default;
  } catch {
    return (await import(`@/lib/i18n/messages/${defaultLocale}.json`)).default;
  }
}

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: string;
}

export function I18nProvider({ children, locale }: I18nProviderProps) {
  const [messages, setMessages] = useState<AbstractIntlMessages | null>(null);
  const [currentLocale, setCurrentLocale] = useState(locale || defaultLocale);

  useEffect(() => {
    // Load saved locale from localStorage if it exists
    const savedLocale = localStorage.getItem('stellar_earn_locale');
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'es')) {
      setCurrentLocale(savedLocale);
    } else if (locale) {
      setCurrentLocale(locale);
    }
  }, [locale]);

  useEffect(() => {
    loadMessages(currentLocale).then(setMessages);
  }, [currentLocale]);

  if (!messages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={currentLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

// Helper to update locale
export function useLocaleUpdater() {
  const setLocale = (newLocale: string) => {
    localStorage.setItem('stellar_earn_locale', newLocale);
    // Reload to apply new locale
    window.location.href = `/${newLocale}${window.location.pathname.replace(/^\/(en|es)/, '')}`;
  };
  return { setLocale };
}
