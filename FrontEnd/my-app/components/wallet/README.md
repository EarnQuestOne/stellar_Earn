# Wallet Connection System Implementation

This wallet connection system provides seamless integration with Stellar wallets including Freighter, Albedo, xBull, Rabet, and Lobstr.

## Files Created

### 1. **WalletContext.tsx** (`/context/WalletContext.tsx`)
- React Context for managing wallet state and operations
- Provides `useWallet()` hook for components to access wallet functionality
- Handles wallet initialization, connection, disconnection
- Persists wallet address and ID in localStorage
- Manages error states and connection loading states

### 2. **WalletModal.tsx** (`/components/wallet/WalletModal.tsx`)
- Modal component for selecting and connecting wallets
- Displays all supported wallets with radio button selection
- Shows connection status and error messages
- Animated with Framer Motion

### 3. **ConnectButton.tsx** (`/components/wallet/ConnectButton.tsx`)
- Button component that displays wallet status
- Shows "Connect Wallet" when disconnected
- Shows formatted wallet address with dropdown menu when connected
- Includes disconnect functionality
- Responsive and animated

### 4. **userIcon.tsx** (`/components/wallet/userIcon.tsx`)
- SVG icon component used in the connect button

## Setup Instructions

### 1. Install Dependencies
All required dependencies have been added to `package.json`:
- `@creit.tech/stellar-wallets-kit` - Stellar wallet SDK
- `framer-motion` - Animation library
- `lucide-react` - Icon library
- `class-variance-authority` - Component variants
- `clsx` - Utility for conditional classes
- `tailwind-merge` - Merge Tailwind classes

Run the installation (already done):
```bash
npm install
```

### 2. Integrate into Your App

Update your `app/layout.tsx` to wrap your app with the wallet provider:

```tsx
"use client";
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
```

### 3. Use the Wallet in Your Components

```tsx
"use client";
import { useWallet } from "@/context/WalletContext";

export function MyComponent() {
  const { address, isConnected, connect, disconnect } = useWallet();

  return (
    <div>
      {isConnected && address && (
        <p>Connected: {address.slice(0, 4)}...{address.slice(-4)}</p>
      )}
    </div>
  );
}
```

## Features

✅ **Multiple Wallet Support**: Freighter, Albedo, xBull, Rabet, Lobstr
✅ **Session Persistence**: Wallet address and ID stored in localStorage
✅ **Error Handling**: User-friendly error messages
✅ **Loading States**: Visual feedback during connection attempts
✅ **Responsive Design**: Works on mobile and desktop
✅ **Animations**: Smooth transitions with Framer Motion
✅ **Type Safety**: Full TypeScript support

## Context API Reference

### useWallet() Hook

```typescript
interface WalletContextType {
  connect: (moduleId: string) => Promise<void>;      // Connect to a wallet
  disconnect: () => Promise<void>;                    // Disconnect from wallet
  address: string | null;                             // Current wallet address
  isConnected: boolean;                               // Connection status
  isConnecting: boolean;                              // Loading state during connection
  selectedWalletId: string | null;                    // Currently selected wallet ID
  openModal: () => void;                              // Open wallet selection modal
  closeModal: () => void;                             // Close wallet selection modal
  isModalOpen: boolean;                               // Modal visibility state
  supportedWallets: Array<{                           // Available wallets
    id: string;
    name: string;
    icon: string;
  }>;
  error: string | null;                               // Error message, if any
}
```

## Customization

### Change Network
Edit `WalletContext.tsx` to change from TESTNET to MAINNET:
```tsx
network: walletKitModule.WalletNetwork.MAINNET,
```

### Change Storage Keys
Update localStorage key names:
```tsx
localStorage.setItem("your_app_wallet_address", walletAddress);
localStorage.setItem("your_app_wallet_id", moduleId);
```

### Add/Remove Wallets
Modify the `supportedWallets` array in `WalletContext.tsx`:
```tsx
const supportedWallets = [
  { id: "freighter", name: "Freighter", icon: "/icons/freighter.png" },
  // Add or remove wallets here
];
```

## Wallet Icons

Place wallet icons in `/public/icons/`:
- `freighter.png`
- `albedo.png`
- `xbull.png`
- `rabet.png`
- `lobstr.png`

Or update the icon paths in the `supportedWallets` array.

## Notes

- The system uses localStorage for session persistence
- Wallet connections are network-specific (TESTNET by default)
- All wallet operations are async and properly error-handled
- Components are fully client-side (`"use client"` directive)

## Support

For issues with the Stellar Wallets Kit, refer to:
https://github.com/creittech/stellar-wallets-kit
