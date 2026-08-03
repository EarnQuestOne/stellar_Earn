import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClaim } from './useClaim';
import * as claimModule from '../stellar/claim';
import * as walletModule from '@/context/WalletContext';
import * as toastModule from '@/components/notifications/Toast';

// Closes #1939: unit coverage for the payout/claim reward flow.
vi.mock('../stellar/claim');
vi.mock('@/context/WalletContext');
vi.mock('@/components/notifications/Toast');

describe('useClaim', () => {
  beforeEach(() => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      address: 'GADDR',
      signTransaction: vi.fn(),
    } as any);
    vi.mocked(toastModule.useToast).mockReturnValue({ showToast: vi.fn() } as any);
  });

  it('claims successfully and reports the success status', async () => {
    vi.mocked(claimModule.claimReward).mockResolvedValue({ success: true } as any);
    const { result } = renderHook(() => useClaim());
    await act(async () => {
      await result.current.claim('reward-1', 10);
    });
    expect(result.current.status).toBe('success');
  });

  it('surfaces an error status when the wallet rejects the claim', async () => {
    vi.mocked(claimModule.claimReward).mockRejectedValue(new Error('User rejected'));
    const { result } = renderHook(() => useClaim());
    await act(async () => {
      await result.current.claim('reward-1', 10);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('rejected');
  });

  it('rejects the claim when no wallet is connected', async () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({ address: null, signTransaction: vi.fn() } as any);
    const { result } = renderHook(() => useClaim());
    const outcome = await act(async () => result.current.claim('reward-1', 10));
    expect(outcome).toBeNull();
    expect(result.current.status).toBe('error');
  });
});
