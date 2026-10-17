import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it } from 'vitest';
import { ClaimButton } from '@/components/rewards/ClaimButton';

const BURST_SIZES = [10, 100, 1000];

describe('ClaimButton duplicate claim prevention benchmark', () => {
  it('measures in-flight lock efficiency and duplicate call reduction across click burst sizes', async () => {
    const results = [];

    for (const burstSize of BURST_SIZES) {
      // 1. Measure WITH in-flight lock (current ClaimButton implementation)
      let lockedDispatches = 0;
      let lockedResolve: () => void = () => {};
      const lockedPromise = new Promise<void>((resolve) => {
        lockedResolve = resolve;
      });

      const lockedOnClick = async () => {
        lockedDispatches++;
        await lockedPromise;
      };

      const startLocked = performance.now();
      const { container: containerLocked, unmount: unmountLocked } = render(
        <ClaimButton onClick={lockedOnClick} status="idle" />
      );
      const buttonLocked = containerLocked.querySelector('button')!;

      await act(async () => {
        for (let i = 0; i < burstSize; i++) {
          fireEvent.click(buttonLocked);
        }
      });
      const lockedBurstMs = performance.now() - startLocked;

      await act(async () => {
        lockedResolve();
      });
      unmountLocked();

      // 2. Measure WITHOUT in-flight lock (un-guarded baseline simulation)
      let baselineDispatches = 0;
      let baselineResolve: () => void = () => {};
      const baselinePromise = new Promise<void>((resolve) => {
        baselineResolve = resolve;
      });

      const baselineOnClick = async () => {
        baselineDispatches++;
        await baselinePromise;
      };

      // Simulated un-guarded click handler
      const handleClickUnguarded = async (
        e: React.MouseEvent<HTMLButtonElement>
      ) => {
        e.preventDefault();
        await baselineOnClick();
      };

      const startBaseline = performance.now();
      const { container: containerBaseline, unmount: unmountBaseline } = render(
        <button onClick={handleClickUnguarded}>Claim All Rewards</button>
      );
      const buttonBaseline = containerBaseline.querySelector('button')!;

      await act(async () => {
        for (let i = 0; i < burstSize; i++) {
          fireEvent.click(buttonBaseline);
        }
      });
      const baselineBurstMs = performance.now() - startBaseline;

      await act(async () => {
        baselineResolve();
      });
      unmountBaseline();

      const blockedDuplicates = baselineDispatches - lockedDispatches;
      const loadReductionPercent =
        baselineDispatches > 0
          ? ((baselineDispatches - lockedDispatches) / baselineDispatches) * 100
          : 0;

      results.push({
        burstSize,
        baselineDispatches,
        lockedDispatches,
        blockedDuplicates,
        loadReductionPercent: round(loadReductionPercent),
        baselineBurstMs: round(baselineBurstMs),
        lockedBurstMs: round(lockedBurstMs),
      });
    }

    const outPath =
      process.env.CLAIM_BUTTON_BENCH_OUT ||
      resolve(__dirname, 'results', 'claim-button.latest.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          label: process.env.CLAIM_BUTTON_BENCH_LABEL || 'latest',
          generatedAt: new Date().toISOString(),
          summary:
            'In-flight lock in ClaimButton guards against duplicate reward claim calls during active transactions.',
          results,
        },
        null,
        2
      )
    );
  });
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
