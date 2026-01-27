"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<any>(null);

  useEffect(() => {
    const initKit = async () => {
      try {
        const walletKitModule = await import("@creit.tech/stellar-wallets-kit");

        const kitInstance = new walletKitModule.StellarWalletsKit({
          network: walletKitModule.WalletNetwork.TESTNET,
          selectedWalletId: walletKitModule.FREIGHTER_ID,
          modules: walletKitModule.allowAllModules(),
        });

        setKit(kitInstance);

        const savedAddress = localStorage.getItem("inheritx_wallet_address");
        const savedWalletId = localStorage.getItem("inheritx_wallet_id");
        if (savedAddress && savedWalletId) {
          setAddress(savedAddress);
          setSelectedWalletId(savedWalletId);
        }
      } catch (err) {
        console.error("Failed to initialize wallet kit:", err);
        setError("Failed to load wallet kit");
      }
    };

    initKit();
  }, []);

  const supportedWallets = [
    { id: "freighter", name: "Freighter", icon: "/icons/freighter.png" },
    { id: "albedo", name: "Albedo", icon: "/icons/albedo.png" },
    { id: "xbull", name: "xBull", icon: "/icons/xbull.png" },
    { id: "rabet", name: "Rabet", icon: "/icons/rabet.png" },
    { id: "lobstr", name: "Lobstr", icon: "/icons/lobstr.png" },
  ];

  const connectWallet = async (moduleId: string) => {
    if (!kit) {
      setError("Wallet kit not loaded yet");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      kit.setWallet(moduleId);
      const { address: walletAddress } = await kit.getAddress();

      setAddress(walletAddress);
      setSelectedWalletId(moduleId);
      localStorage.setItem("inheritx_wallet_address", walletAddress);
      localStorage.setItem("inheritx_wallet_id", moduleId);
      setIsModalOpen(false);
    } catch (err: any) {
      const errorMessage = err?.message || "Connection failed";
      setError(errorMessage);
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (kit) {
      try {
        await kit.disconnect();
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    }
    setAddress(null);
    setSelectedWalletId(null);
    setError(null);
    localStorage.removeItem("inheritx_wallet_address");
    localStorage.removeItem("inheritx_wallet_id");
  };

  const openModal = () => {
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setError(null);
    setIsModalOpen(false);
  };

  return (
    <WalletContext.Provider
      value={{
        connect: connectWallet,
        disconnect,
        address,
        isConnected: !!address,
        isConnecting,
        selectedWalletId,
        openModal,
        closeModal,
        isModalOpen,
        supportedWallets,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
