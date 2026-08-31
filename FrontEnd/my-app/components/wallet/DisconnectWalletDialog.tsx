'use client';

import React from 'react';

export interface DisconnectWalletDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDisconnecting?: boolean;
}

/**
 * Confirmation dialog shown before disconnecting the wallet.
 *
 * Requires an explicit confirm click before the disconnect fires so an
 * accidental click cannot drop the wallet session context (issue #2274).
 */
export function DisconnectWalletDialog({
  open,
  onConfirm,
  onCancel,
  isDisconnecting = false,
}: DisconnectWalletDialogProps) {
  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="disconnect-dialog-title"
      aria-describedby="disconnect-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2
          id="disconnect-dialog-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Disconnect Wallet
        </h2>
        <p
          id="disconnect-dialog-desc"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          You will be signed out and this wallet will be disconnected from your
          session. You can reconnect at any time.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDisconnecting}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDisconnecting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    </div>
  );
}
