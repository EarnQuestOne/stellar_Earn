'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { TransactionResult } from '@/lib/stellar/claim';

interface TransactionModalProps {
  open: boolean;
  result: TransactionResult | null;
  onClose: () => void;
}

export function TransactionModal({ open, result, onClose }: TransactionModalProps) {
  if (!result) return null;

  const isSuccess = result.status === 'success';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSuccess ? '✓ Claim Successful' : '✗ Claim Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Transaction Hash</p>
            <p className="font-mono text-xs break-all bg-muted p-3 rounded">
              {result.transactionHash}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-semibold">{result.amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{result.status}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Timestamp</p>
            <p className="text-sm">{result.timestamp.toLocaleString()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
