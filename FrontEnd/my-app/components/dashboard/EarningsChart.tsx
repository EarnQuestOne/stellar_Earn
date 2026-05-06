'use client';

import type { EarningsData } from '@/lib/types/dashboard';

interface EarningsChartProps {
  earnings: EarningsData[];
  isLoading: boolean;
}

function ChartSkeleton() {
  return (
    <div
      className="h-48 flex items-end justify-between gap-2 px-4"
      role="status"
      aria-label="Loading earnings chart"
      aria-busy="true"
    >
      {[40, 60, 30, 80, 50, 70, 45].map((height, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-zinc-200 dark:bg-zinc-700"
          style={{ height: `${height}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">
        📈
      </div>
      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">
        No earnings data
      </h4>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Complete quests to start tracking your earnings
      </p>
    </div>
  );
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function EarningsChart({ earnings, isLoading }: EarningsChartProps) {
  const maxAmount = Math.max(...earnings.map((e) => e.amount), 1);
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const avgEarnings = earnings.length > 0 ? totalEarnings / earnings.length : 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Earnings Overview
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Last 7 days
          </p>
        </div>
        {!isLoading && earnings.length > 0 && (
          <div
            className="text-right"
            aria-label={`Total earnings: ${totalEarnings.toFixed(0)} XLM, average ${avgEarnings.toFixed(0)} XLM per day`}
          >
            <p
              className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
              aria-hidden="true"
            >
              {totalEarnings.toFixed(0)} XLM
            </p>
            <p
              className="text-sm text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            >
              ~{avgEarnings.toFixed(0)} XLM/day avg
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : earnings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {/* Accessible data table (visually hidden, for screen readers) */}
          <table
            className="sr-only"
            aria-label="Earnings data for the last 7 days"
          >
            <caption>Daily earnings in XLM over the last 7 days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Amount (XLM)</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((data) => (
                <tr key={data.date}>
                  <td>{formatDate(data.date)}</td>
                  <td>{data.amount} XLM</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>{totalEarnings.toFixed(0)} XLM</td>
              </tr>
            </tfoot>
          </table>

          {/* Visual Chart (aria-hidden since data table above covers it) */}
          <div
            className="h-48 flex items-end justify-between gap-2"
            aria-hidden="true"
          >
            {earnings.map((data, index) => {
              const heightPercent = (data.amount / maxAmount) * 100;
              return (
                <div
                  key={data.date}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                    {data.amount} XLM
                  </div>
                  {/* Bar */}
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-blue-500 to-purple-500 transition-all duration-300 hover:from-blue-400 hover:to-purple-400 cursor-pointer min-h-[4px]"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div
            className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400"
            aria-hidden="true"
          >
            {earnings.map((data) => (
              <span key={data.date} className="flex-1 text-center">
                {formatDate(data.date)}
              </span>
            ))}
          </div>

          {/* Summary stats */}
          <dl className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-center">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Highest
              </dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {Math.max(...earnings.map((e) => e.amount))} XLM
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Lowest
              </dt>
              <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {Math.min(...earnings.map((e) => e.amount))} XLM
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Change
              </dt>
              <dd className="text-sm font-medium text-green-600 dark:text-green-400">
                +
                {(
                  (earnings[earnings.length - 1]?.amount || 0) -
                  (earnings[0]?.amount || 0)
                ).toFixed(0)}{' '}
                XLM
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
