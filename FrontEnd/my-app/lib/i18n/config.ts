export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

// Type for our translations
export type Messages = {
  nav: {
    home: string;
    dashboard: string;
    quests: string;
    rewards: string;
    submissions: string;
    admin: string;
    settings: string;
  };
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    submit: string;
    connectWallet: string;
    disconnectWallet: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
  };
  language: {
    switchLanguage: string;
  };
  hero: {
    title: string;
    subtitle: string;
    getStarted: string;
    learnMore: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
  };
  quests: {
    title: string;
    createQuest: string;
    browseQuests: string;
    noQuests: string;
  };
};
