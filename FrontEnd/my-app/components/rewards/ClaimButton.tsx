'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface ClaimButtonProps {
  amount: number;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ClaimButton({ amount, loading, disabled, onClick }: ClaimButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      size="lg"
      className="w-full"
    >
      {loading ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          Claiming...
        </>
      ) : (
        `Claim ${amount} Rewards`
      )}
    </Button>
  );
}
