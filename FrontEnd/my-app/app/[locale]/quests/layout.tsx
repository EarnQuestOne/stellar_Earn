import type { Metadata } from 'next';
import { createPageMetadata, getLocale } from '@/lib/seo';

const questBoardMetadata = {
  en: {
    title: 'Quest Board',
    description:
      'Browse open StellarEarn quests, compare rewards and requirements, and find your next opportunity to earn on Stellar.',
  },
  es: {
    title: 'Tablero de misiones',
    description:
      'Explora misiones abiertas de StellarEarn, compara recompensas y requisitos, y encuentra tu próxima oportunidad en Stellar.',
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
    ...questBoardMetadata[locale],
    locale,
    pathname: '/quests',
  });
}

export default function QuestsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
