import { StateCreator } from 'zustand';

export interface WalletSlice {
  // state
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isVerifyingWallet: boolean;
  selectedWalletId: string | null;
  isModalOpen: boolean;
  walletError: string | null;

  // actions
  setWalletAddress: (address: string | null) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setIsVerifyingWallet: (verifying: boolean) => void;
  setSelectedWalletId: (id: string | null) => void;
  setWalletModalOpen: (open: boolean) => void;
  setWalletError: (error: string | null) => void;
  disconnectWallet: () => void;
}

export const createWalletSlice: StateCreator<WalletSlice> = (set) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  isVerifyingWallet: false,
  selectedWalletId: null,
  isModalOpen: false,
  walletError: null,

  setWalletAddress: (address) => set({ address, isConnected: !!address }),

  setIsConnecting: (isConnecting) => set({ isConnecting }),

  setIsVerifyingWallet: (isVerifyingWallet) => set({ isVerifyingWallet }),

  setSelectedWalletId: (selectedWalletId) => set({ selectedWalletId }),

  setWalletModalOpen: (isModalOpen) => set({ isModalOpen }),

  setWalletError: (walletError) => set({ walletError }),

  disconnectWallet: () =>
    set({
      address: null,
      isConnected: false,
      selectedWalletId: null,
      walletError: null,
    }),
});
