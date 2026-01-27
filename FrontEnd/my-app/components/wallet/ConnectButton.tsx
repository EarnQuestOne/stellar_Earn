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
    className="w-5 h-5 text-[#33C5E0]"
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

  // Close dropdown when clicking outside
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
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-6 cursor-pointer py-3 rounded-s-2xl bg-[#0F1621] border border-[#1e293b] hover:border-[#33C5E0]/50 transition-all group pointer-events-auto"
        >
          <div className="w-2 h-2 rounded-full bg-[#33C5E0] shadow-[0_0_8px_#33C5E0]" />
          <span className="text-[#33C5E0] font-medium tracking-wide">
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
              className="absolute top-full right-0 mt-2 w-full min-w-[180px] bg-[#0F1621] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden z-50"
            >
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-white/5 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={openModal}
      className="flex items-center gap-4"
    >
      <div className="flex items-center gap-4 px-8 py-3 rounded-s-2xl bg-[#0F1621] border border-[#1e293b] hover:border-[#33C5E0]/50 transition-all text-[#33C5E0] font-medium tracking-wide shadow-lg shadow-black/20">
        <span>Connect Wallet</span>
        <ArrowDownIcon />
      </div>
      <div className="w-1.5 h-8 bg-[#161E22] flex items-center justify-center transition-colors" />
    </motion.button>
  );
}
