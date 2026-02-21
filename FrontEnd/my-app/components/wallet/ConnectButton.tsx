"use client";

import { useWallet } from "../../context/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";

const ArrowDownIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-[#33C5E0]"
  >
    <path
      d="M18.7504 8.24993V17.9999C18.7504 18.1988 18.6714 18.3896 18.5307 18.5303C18.3901 18.6709 18.1993 18.7499 18.0004 18.7499H8.25042C8.0515 18.7499 7.86074 18.6709 7.72009 18.5303C7.57943 18.3896 7.50042 18.1988 7.50042 17.9999C7.50042 17.801 7.57943 17.6103 7.72009 17.4696C7.86074 17.3289 8.0515 17.2499 8.25042 17.2499H16.1901L5.46979 6.53055C5.32906 6.38982 5.25 6.19895 5.25 5.99993C5.25 5.80091 5.32906 5.61003 5.46979 5.4693C5.61052 5.32857 5.80139 5.24951 6.00042 5.24951C6.19944 5.24951 6.39031 5.32857 6.53104 5.4693L17.2504 16.1896V8.24993C17.2504 8.05102 17.3294 7.86025 17.4701 7.7196C17.6107 7.57895 17.8015 7.49993 18.0004 7.49993C18.1993 7.49993 18.3901 7.57895 18.5307 7.7196C18.6714 7.86025 18.7504 8.05102 18.7504 8.24993Z"
      fill="#33C5E0"
    />
  </svg>
);

export function ConnectButton() {
  const { isConnected, address, openModal, disconnect } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleDisconnect = async () => {
    await disconnect();
    setDropdownOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="group pointer-events-auto flex cursor-pointer items-center gap-2 rounded-s-2xl border border-zinc-300 bg-white px-3 py-2 transition-all hover:border-[#33C5E0]/50 dark:border-[#1e293b] dark:bg-[#0F1621] sm:gap-3 sm:px-6 sm:py-3"
        >
          <div className="h-2 w-2 rounded-full bg-[#33C5E0] shadow-[0_0_8px_#33C5E0]" />
          <span className="font-medium tracking-wide text-[#33C5E0]">
            {formatAddress(address)}
          </span>
          <div
            className={`transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          >
            <ArrowDownIcon />
          </div>
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xl dark:border-[#1e293b] dark:bg-[#0F1621]"
            >
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={openModal}
      className="flex items-center gap-2 sm:gap-4"
      aria-label="Connect wallet"
    >
      <div className="flex items-center gap-2 rounded-s-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium tracking-wide text-[#33C5E0] shadow-lg shadow-black/10 transition-all hover:border-[#33C5E0]/50 dark:border-[#1e293b] dark:bg-[#0F1621] dark:shadow-black/20 sm:gap-4 sm:px-8 sm:py-3 sm:text-base">
        <span>Connect Wallet</span>
        <ArrowDownIcon />
      </div>
      <div className="hidden h-8 w-1.5 items-center justify-center bg-zinc-300 transition-colors dark:bg-[#161E22] sm:flex" />
    </motion.button>
  );
}
