'use client';

import { useState, useEffect, useRef } from 'react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  amount: string;
  recipient?: string;
}

/**
 * Fix #2217: handle wallet rejection (user denies the transaction in their
 * wallet) and component unmount (avoid setState on an unmounted component).
 */
export function TransactionModal({
  isOpen, onClose, onConfirm, amount, recipient,
}: TransactionModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleConfirm = async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      await onConfirm();
      if (mountedRef.current) { setStatus('idle'); onClose(); }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Transaction failed.';
      // Detect wallet rejection codes
      const isRejected = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('cancel');
      setErrorMsg(isRejected ? 'Transaction rejected in wallet.' : msg);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm Transaction" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Confirm Transaction</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Send <strong>{amount}</strong>{recipient ? ` to ${recipient}` : ''}.
        </p>
        {status === 'error' && errorMsg && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
        )}
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">Cancel</button>
          <button onClick={handleConfirm} disabled={status === 'loading'} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {status === 'loading' ? 'Sending…' : status === 'error' ? 'Retry' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}