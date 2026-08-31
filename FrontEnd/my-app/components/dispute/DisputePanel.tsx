'use client';

import { useEffect, useState } from 'react';
import { disputesApi, type Dispute } from '@/lib/api/disputes';

interface DisputePanelProps {
  submissionId: string;
  canOpen?: boolean;
  canAppeal?: boolean;
  canResolve?: boolean;
  arbitratorAddress?: string;
}

export function DisputePanel({
  submissionId,
  canOpen = false,
  canAppeal = false,
  canResolve = false,
  arbitratorAddress = '',
}: DisputePanelProps) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newArbitrator, setNewArbitrator] = useState(arbitratorAddress);

  const refresh = async () => {
    setLoading(true);
    try {
      const disputes = await disputesApi.list();
      setDispute(
        disputes.find((item) => item.submissionId === submissionId) ?? null
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dispute');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [submissionId]);

  const run = async (action: () => Promise<Dispute>) => {
    setBusy(true);
    try {
      setDispute(await action());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispute action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="dispute-panel-title"
      className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between">
        <h3
          id="dispute-panel-title"
          className="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
        >
          Dispute
        </h3>
        {dispute && (
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {dispute.status.replace('_', ' ')}
          </span>
        )}
      </div>
      {loading && (
        <p className="text-sm text-zinc-500">Loading dispute status...</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {!loading && !dispute && canOpen && (
        <button
          disabled={busy || !arbitratorAddress}
          onClick={() =>
            void run(() => disputesApi.open(submissionId, arbitratorAddress))
          }
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Open dispute
        </button>
      )}
      {dispute && canAppeal && dispute.status === 'RESOLVED' && (
        <div className="flex gap-2">
          <input
            aria-label="New arbitrator address"
            value={newArbitrator}
            onChange={(event) => setNewArbitrator(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            disabled={busy || !newArbitrator}
            onClick={() =>
              void run(() => disputesApi.appeal(dispute.id, newArbitrator))
            }
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Appeal
          </button>
        </div>
      )}
      {dispute &&
        canResolve &&
        ['PENDING', 'UNDER_REVIEW', 'APPEALED'].includes(dispute.status) && (
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() =>
                void run(() => disputesApi.resolve(dispute.id, true))
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Uphold
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(() => disputesApi.resolve(dispute.id, false))
              }
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject dispute
            </button>
          </div>
        )}
    </section>
  );
}
