'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useLocaleUpdater } from '@/app/providers/I18nProvider';
import { locales, localeNames } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const { setLocale } = useLocaleUpdater();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Change language"
      >
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">
          {localeNames[currentLocale as keyof typeof localeNames]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-900 dark:ring-zinc-700">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => {
                setLocale(locale);
                setIsOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm ${
                currentLocale === locale
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {localeNames[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
