// Example of how to integrate the Wallet system in your app/layout.tsx

// app/layout.tsx - Add WalletProvider and integrate components

import { WalletProvider } from "@/context/WalletContext";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { WalletModal } from "@/components/wallet/WalletModal";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {/* Your navbar or header */}
          <header className="flex justify-between items-center p-4">
            {/* Your logo and navigation */}
            <div className="flex-1">
              {/* Navigation items */}
            </div>
            
            {/* Connect Wallet Button */}
            <ConnectButton />
          </header>

          {/* Wallet Modal */}
          <WalletModal />

          {/* Rest of your app */}
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
