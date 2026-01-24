'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HistoryItem {
  id: string;
  amount: number;
  asset: string;
  transactionHash: string;
  timestamp: Date;
  status: 'success' | 'failed';
}

interface RewardHistoryProps {
  history: HistoryItem[];
}

export function RewardHistory({ history }: RewardHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No claim history yet</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.asset}</p>
                    <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                    {item.transactionHash}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.timestamp.toLocaleString()}
                  </p>
                </div>
                <p className="font-semibold ml-4">{item.amount}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
