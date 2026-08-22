import type { Metadata } from 'next';
import { createPageMetadata, getLocale } from '@/lib/seo';

const dashboardMetadata = {
  en: {
    title: 'Your Dashboard',
    description:
      'Review your StellarEarn quest activity, rewards, progress, and active submissions in one place.',
  },
  es: {
    title: 'Tu panel',
    description:
      'Consulta tu actividad, recompensas, progreso y misiones activas de StellarEarn en un solo lugar.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = getLocale(localeParam);

  return createPageMetadata({
    ...dashboardMetadata[locale],
    locale,
    pathname: '/dashboard',
    index: false,
  });
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
