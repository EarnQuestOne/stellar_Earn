export interface NavigationItem {
  href: string;
  label: string;
  exact?: boolean;
}

export interface UserMenuItem {
  href: string;
  label: string;
}

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/quests", label: "Quests" },
  { href: "/submissions", label: "Submissions" },
  { href: "/rewards", label: "Rewards" },
  { href: "/settings/notifications", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export const userMenuItems: UserMenuItem[] = [
  { href: "/profile/john.doe", label: "Profile" },
  { href: "/settings/notifications", label: "Settings" },
  { href: "/rewards", label: "Rewards" },
];

export const routeLabelMap: Record<string, string> = {
  dashboard: "Dashboard",
  quests: "Quests",
  submissions: "Submissions",
  rewards: "Rewards",
  settings: "Settings",
  notifications: "Notifications",
  admin: "Admin",
  profile: "Profile",
};

export function isActiveRoute(pathname: string, item: NavigationItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getRouteLabel(segment: string): string {
  const cleanedSegment = decodeURIComponent(segment).toLowerCase();
  return (
    routeLabelMap[cleanedSegment] ??
    cleanedSegment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}
