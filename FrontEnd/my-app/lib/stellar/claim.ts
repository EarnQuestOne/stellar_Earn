

export interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amount: number;
  timestamp: string;
}

export async function claimReward(rewardId: string, amount: number): Promise<ClaimResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const isSuccessful = Math.random() > 0.05; 

  if (!isSuccessful) {
    return {
      success: false,
      error: "User rejected transaction or network error",
      amount,
      timestamp: new Date().toISOString(),
    };
  }

  // Generate a mock transaction hash
  const transactionHash = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  return {
    success: true,
    transactionHash,
    amount,
    timestamp: new Date().toISOString(),
  };
}
