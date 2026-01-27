// Type definitions and interfaces for the Wallet System

export interface Wallet {
  id: string;
  name: string;
  icon: string;
}

export interface WalletContextType {
  /**
   * Connect to a specific wallet
   * @param moduleId - The wallet ID (e.g., 'freighter', 'albedo')
   */
  connect: (moduleId: string) => Promise<void>;

  /**
   * Disconnect from the currently connected wallet
   */
  disconnect: () => Promise<void>;

  /**
   * The connected wallet's public address
   * Null if not connected
   */
  address: string | null;

  /**
   * Whether a wallet is currently connected
   */
  isConnected: boolean;

  /**
   * Whether a connection attempt is in progress
   */
  isConnecting: boolean;

  /**
   * The ID of the currently selected wallet
   */
  selectedWalletId: string | null;

  /**
   * Open the wallet selection modal
   */
  openModal: () => void;

  /**
   * Close the wallet selection modal
   */
  closeModal: () => void;

  /**
   * Whether the wallet selection modal is visible
   */
  isModalOpen: boolean;

  /**
   * Array of supported wallets available for connection
   */
  supportedWallets: Wallet[];

  /**
   * Error message from the last operation
   * Null if no error
   */
  error: string | null;
}

export interface WalletConnectButtonProps {
  className?: string;
  disabled?: boolean;
}

export interface WalletModalProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface StellarWalletsKitOptions {
  network: "TESTNET" | "MAINNET" | "FUTURENET";
  selectedWalletId: string;
  modules: any[];
}

export type WalletId = 
  | "freighter" 
  | "albedo" 
  | "xbull" 
  | "rabet" 
  | "lobstr";

export const WALLET_IDS: Record<WalletId, string> = {
  freighter: "freighter",
  albedo: "albedo",
  xbull: "xbull",
  rabet: "rabet",
  lobstr: "lobstr",
};

export const WALLET_DISPLAY_NAMES: Record<WalletId, string> = {
  freighter: "Freighter",
  albedo: "Albedo",
  xbull: "xBull",
  rabet: "Rabet",
  lobstr: "Lobstr",
};

export const STORAGE_KEYS = {
  WALLET_ADDRESS: "inheritx_wallet_address",
  WALLET_ID: "inheritx_wallet_id",
} as const;
