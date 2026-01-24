'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClaimReward } from '@/lib/stellar/claim';

interface PendingRewardsProps {
  rewards: ClaimReward[];
}

export function PendingRewards({ rewards }: PendingRewardsProps) {
  const totalRewards = rewards.reduce((sum, reward) => sum + reward.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pending Rewards</span>
          <Badge variant="secondary">{rewards.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending rewards</p>
          ) : (
            <>
              {rewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{reward.asset}</p>
                    <p className="text-sm text-muted-foreground">Quest {reward.id}</p>
                  </div>
                  <p className="font-semibold">{reward.amount}</p>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{totalRewards}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
