import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Target,
  FileText,
  Gift,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  href: string;
  labelKey: string;
  exact?: boolean;
  icon?: LucideIcon;
}

export interface UserMenuItem {
  href: string;
  labelKey: string;
}

export const navigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    exact: true,
    icon: LayoutDashboard,
  },
  { href: '/quests', labelKey: 'nav.quests', icon: Target },
  { href: '/submissions', labelKey: 'nav.submissions', icon: FileText },
  { href: '/rewards', labelKey: 'nav.rewards', icon: Gift },
  { href: '/settings/notifications', labelKey: 'nav.settings', icon: Settings },
  { href: '/admin', labelKey: 'nav.admin', icon: Shield },
];

export const userMenuItems: UserMenuItem[] = [
  { href: '/profile/john.doe', labelKey: 'nav.profile' },
  { href: '/settings/notifications', labelKey: 'nav.settings' },
  { href: '/rewards', labelKey: 'nav.rewards' },
];

export const routeLabelMap: Record<string, string> = {
  dashboard: 'nav.dashboard',
  quests: 'nav.quests',
  submissions: 'nav.submissions',
  rewards: 'nav.rewards',
  settings: 'nav.settings',
  notifications: 'nav.notifications',
  admin: 'nav.admin',
  profile: 'nav.profile',
};

// Hook to get translated navigation items
export function useTranslatedNavigation() {
  const t = useTranslations();

  return {
    navigationItems: navigationItems.map((item) => ({
      ...item,
      label: t(item.labelKey),
    })) as TranslatedNavigationItem[],
    userMenuItems: userMenuItems.map((item) => ({
      ...item,
      label: t(item.labelKey),
    })) as TranslatedUserMenuItem[],
  };
}

// TranslatedNavigationItem is the type after useTranslatedNavigation adds the label
export interface TranslatedNavigationItem extends NavigationItem {
  label: string;
}

export interface TranslatedUserMenuItem extends UserMenuItem {
  label: string;
}

export function isActiveRoute(
  pathname: string,
  item: { href: string; exact?: boolean }
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function useTranslatedRouteLabel() {
  const t = useTranslations();

  return (segment: string): string => {
    const cleanedSegment = decodeURIComponent(segment).toLowerCase();
    const labelKey = routeLabelMap[cleanedSegment];
    if (labelKey) {
      return t(labelKey);
    }
    return cleanedSegment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };
}
