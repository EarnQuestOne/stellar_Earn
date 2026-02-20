"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { MobileMenu } from "./MobileMenu";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayoutContext = createContext(false);

export function AppLayout({ children }: AppLayoutProps) {
  const isNestedLayout = useContext(AppLayoutContext);
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isNestedLayout) {
    return <>{children}</>;
  }

  if (isDashboardRoute) {
    return <>{children}</>;
  }

  return (
    <AppLayoutContext.Provider value={true}>
      <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            pathname={pathname}
          />
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </AppLayoutContext.Provider>
  );
}
