import { StellarEarn } from '@contracts/earn-quest/bindings/index';
import { env } from '@/lib/config/env';

export interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amount: number;
  timestamp: string;
}

export async function createStellarEarnClient(): Promise<StellarEarn> {
  const rpcUrl = env.sorobanRpcUrl();
  const contractId = env.contractId();

  if (!rpcUrl) {
    throw new Error('SOROBAN_RPC_URL is not configured');
  }
  if (!contractId) {
    throw new Error('CONTRACT_ID is not configured');
  }

  const client = new StellarEarn({ rpcUrl, contractId });
  await client.connect();
  return client;
}

export async function claimReward(
  rewardId: string,
  amount: number,
  walletAddress: string,
  signTransaction: (xdr: string) => Promise<string>,
  rpcUrl?: string,
  contractId?: string
): Promise<ClaimResult> {
  try {
    const client = new StellarEarn({
      rpcUrl: rpcUrl ?? env.sorobanRpcUrl(),
      contractId: contractId ?? env.contractId(),
    });
    await client.connect();

    const tx = client.claim_reward({
      quest_id: rewardId,
      submitter: walletAddress,
      amount: BigInt(amount),
    });

    const result = await tx.signAndSend({ signTransaction });

    return {
      success: true,
      transactionHash: result.sendTransactionResponse?.hash,
      amount,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Claim transaction failed';
    return {
      success: false,
      error: message,
      amount,
      timestamp: new Date().toISOString(),
    };
  }
}
