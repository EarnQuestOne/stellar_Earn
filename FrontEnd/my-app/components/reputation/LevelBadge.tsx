'use client';

import { shouldShowGlow } from '@/lib/utils/reputation';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-lg',
};

export function LevelBadge({
  level,
  size = 'md',
  showGlow,
  className = '',
}: LevelBadgeProps) {
  const shouldGlow = showGlow !== undefined ? showGlow : shouldShowGlow(level);
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={`relative flex items-center justify-center rounded-full text-white font-bold ${sizeClass} ${className}`}
      style={{ backgroundColor: '#089ec3' }}
    >
      {shouldGlow && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            boxShadow:
              '0 0 12px rgba(8, 158, 195, 0.6), 0 0 24px rgba(8, 158, 195, 0.4)',
          }}
        />
      )}
      <span className="relative z-10">{level}</span>
    </div>
  );
}
