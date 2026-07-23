'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useHydrated } from '@/lib/hooks/useHydrated';
import * as authApi from '@/lib/api/auth';

interface WalletContextType {
  connect: (moduleId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isVerifyingWallet: boolean;
  selectedWalletId: string | null;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
  supportedWallets: { id: string; name: string; icon: string }[];
  error: string | null;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (
    xdr: string,
    opts: { networkPassphrase: string; address: string }
  ) => Promise<string>;
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
  const isVerifyingWallet = useStore((s) => s.isVerifyingWallet);
  const selectedWalletId = useStore((s) => s.selectedWalletId);
  const isModalOpen = useStore((s) => s.isModalOpen);
  const walletError = useStore((s) => s.walletError);

  const setWalletAddress = useStore((s) => s.setWalletAddress);
  const setIsConnecting = useStore((s) => s.setIsConnecting);
  const setIsVerifyingWallet = useStore((s) => s.setIsVerifyingWallet);
  const setSelectedWalletId = useStore((s) => s.setSelectedWalletId);
  const setWalletModalOpen = useStore((s) => s.setWalletModalOpen);
  const setWalletError = useStore((s) => s.setWalletError);
  const disconnectWallet = useStore((s) => s.disconnectWallet);

  // kit lives outside the store (not serialisable)
  const [kit, setKit] = React.useState<any>(null);

  const hydrated = useHydrated();

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

        // ── Wallet reconnection verification ────────────────────────────
        // Wait until Zustand's persist middleware has rehydrated from
        // localStorage so we know whether there is a session to verify.
        // Without this gate the effect races against async rehydration
        // and could skip verification on a cold load (address would still
        // be the default null).
        if (!hydrated) return;

        const persistedAddress = useStore.getState().address;
        const persistedWalletId = useStore.getState().selectedWalletId;

        if (!persistedAddress || !persistedWalletId) {
          // No previously-connected session — nothing to verify.
          return;
        }

        // Mark verifying so UI renders neither connected nor disconnected
        // until we know whether the session is still valid.
        setIsVerifyingWallet(true);

        try {
          kitInstance.setWallet(persistedWalletId);

          // Query the wallet extension for the current address *without*
          // triggering a popup (skipRequestAccess).  If the extension was
          // uninstalled, frozen, or the user revoked permissions, this
          // will throw or return a different address.
          const verifyPromise = kitInstance.getAddress({
            skipRequestAccess: true,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Wallet verification timed out')),
              5000
            )
          );

          const { address: liveAddress } = await Promise.race([
            verifyPromise,
            timeoutPromise,
          ]);

          if (liveAddress !== persistedAddress) {
            // Identity-boundary violation: the wallet extension now controls
            // a *different* account than the one the backend session was
            // issued for.  Full logout is the only safe response — the
            // backend does not re-verify wallet ownership on API calls, so
            // leaving the session alive would let the UI show account B
            // while the backend authenticates every write as account A.
            console.warn(
              'Wallet verification: address mismatch —',
              `persisted ${persistedAddress}, got ${liveAddress}.`,
              'Clearing session.'
            );
            await authApi.logout();
            disconnectWallet();
          }
          // Address matches — session is still valid, no action needed.
        } catch (err) {
          // Fail-closed: if we cannot reach the wallet extension at all
          // (uninstalled, frozen, permissions revoked) OR if verification
          // times out, we clear both the wallet state and the backend
          // session.  This is conservative — "can't verify" and "verified
          // as wrong" are distinguishable in code but not obviously
          // distinguishable in security posture.  The backend never
          // re-verifies wallet ownership after login, so there is no
          // independent safety net if we leave the session alive.
          console.error('Wallet verification failed:', err);
          try {
            await authApi.logout();
          } catch {
            // Logout call itself failed — best-effort, still clear
            // the local wallet state below so the UI is not stuck.
          }
          disconnectWallet();
        } finally {
          setIsVerifyingWallet(false);
        }
      } catch (err) {
        console.error('Failed to initialize wallet kit:', err);
        setWalletError('Failed to load wallet kit');
      }
    };
    initKit();
  }, [hydrated]);

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

  const getNetworkPassphrase = () => {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
    return network === 'mainnet'
      ? 'Public Global Stellar Network ; September 2015'
      : 'Test SDF Network ; September 2015';
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

  const signTransaction = async (
    xdr: string,
    opts: { networkPassphrase: string; address: string }
  ) => {
    if (!kit) {
      throw new Error('Wallet kit not loaded');
    }
    const { signedTxXdr } = await kit.signTransaction(xdr, {
      networkPassphrase: opts.networkPassphrase,
      address: opts.address,
    });
    return signedTxXdr;
  };

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        address,
        isConnected,
        isConnecting,
        isVerifyingWallet,
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
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
