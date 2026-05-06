'use client';

import { useEffect, useState } from 'react';

interface XPProgressBarProps {
  currentXP: number;
  xpForNextLevel: number;
  className?: string;
}

export function XPProgressBar({
  currentXP,
  xpForNextLevel,
  className = '',
}: XPProgressBarProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  const percentage = Math.min(
    100,
    Math.max(0, (currentXP / xpForNextLevel) * 100)
  );

  useEffect(() => {
    // Animate progress bar fill
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
        </span>
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="relative h-3 sm:h-4 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${animatedPercentage}%`,
            background: 'linear-gradient(90deg, #089ec3 0%, #0ab8d4 100%)',
          }}
        />
      </div>
    </div>
  );
}
