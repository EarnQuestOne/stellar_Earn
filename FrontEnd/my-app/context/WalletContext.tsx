'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useStore } from '@/lib/store';

interface WalletContextType {
  connect: (moduleId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  selectedWalletId: string | null;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
  supportedWallets: { id: string; name: string; icon: string }[];
  error: string | null;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context)
    throw new Error('useWallet must be used within a WalletProvider');
  return context;
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  // ── all wallet state now lives in the store ──────────────────────
  const address = useStore((s) => s.address);
  const isConnecting = useStore((s) => s.isConnecting);
  const isConnected = useStore((s) => s.isConnected);
  const selectedWalletId = useStore((s) => s.selectedWalletId);
  const isModalOpen = useStore((s) => s.isModalOpen);
  const walletError = useStore((s) => s.walletError);

  const setWalletAddress = useStore((s) => s.setWalletAddress);
  const setIsConnecting = useStore((s) => s.setIsConnecting);
  const setSelectedWalletId = useStore((s) => s.setSelectedWalletId);
  const setWalletModalOpen = useStore((s) => s.setWalletModalOpen);
  const setWalletError = useStore((s) => s.setWalletError);
  const disconnectWallet = useStore((s) => s.disconnectWallet);

  // kit lives outside the store (not serialisable)
  const [kit, setKit] = React.useState<any>(null);

  useEffect(() => {
    const initKit = async () => {
      try {
        const walletKitModule = await import('@creit.tech/stellar-wallets-kit');
        const kitInstance = new walletKitModule.StellarWalletsKit({
          network: walletKitModule.WalletNetwork.TESTNET,
          selectedWalletId: walletKitModule.FREIGHTER_ID,
          modules: walletKitModule.allowAllModules(),
        });
        setKit(kitInstance);

        // Rehydrate from store (already persisted by Zustand)
        // Nothing extra needed — store handles it via persist middleware
      } catch (err) {
        console.error('Failed to initialize wallet kit:', err);
        setWalletError('Failed to load wallet kit');
      }
    };
    initKit();
  }, []);

  const supportedWallets = [
    { id: 'freighter', name: 'Freighter', icon: '/icons/freighter.png' },
    { id: 'albedo', name: 'Albedo', icon: '/icons/albedo.png' },
    { id: 'xbull', name: 'xBull', icon: '/icons/xbull.png' },
    { id: 'rabet', name: 'Rabet', icon: '/icons/rabet.png' },
    { id: 'lobstr', name: 'Lobstr', icon: '/icons/lobstr.png' },
  ];

  const connect = async (moduleId: string) => {
    if (!kit) {
      setWalletError('Wallet kit not loaded yet');
      return;
    }

    setIsConnecting(true);
    setWalletError(null);

    try {
      kit.setWallet(moduleId);
      const { address: walletAddress } = await kit.getAddress();
      setWalletAddress(walletAddress);
      setSelectedWalletId(moduleId);
      setWalletModalOpen(false);
    } catch (err: any) {
      setWalletError(err?.message ?? 'Connection failed');
      console.error('Wallet connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (kit) {
      try {
        await kit.disconnect();
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }
    disconnectWallet();
  };

  const signMessage = async (message: string) => {
    if (!kit) {
      throw new Error('Wallet kit not loaded');
    }
    if (!address) {
      throw new Error('Wallet not connected');
    }
    try {
      const { result } = await kit.sign({
        payload: message,
      });
      return result;
    } catch (err: any) {
      console.error('Signing failed:', err);
      throw new Error(err?.message || 'Signing failed');
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        address,
        isConnected,
        isConnecting,
        selectedWalletId,
        openModal: () => {
          setWalletError(null);
          setWalletModalOpen(true);
        },
        closeModal: () => {
          setWalletError(null);
          setWalletModalOpen(false);
        },
        isModalOpen,
        supportedWallets,

        error: walletError,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
