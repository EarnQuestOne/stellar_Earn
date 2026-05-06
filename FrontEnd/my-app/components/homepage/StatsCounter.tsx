'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const STATS: Stat[] = [
  {
    label: 'XLM Distributed',
    target: 2.5,
    prefix: '',
    suffix: 'M+',
    decimals: 1,
  },
  {
    label: 'Quests Completed',
    target: 10,
    prefix: '',
    suffix: 'K+',
    decimals: 0,
  },
  { label: 'Active Quests', target: 5, prefix: '', suffix: 'K+', decimals: 0 },
];

function useCountUp(target: number, decimals = 0, active: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, decimals, active]);

  return count;
}

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
  const count = useCountUp(stat.target, stat.decimals ?? 0, active);
  const display = stat.decimals
    ? count.toFixed(stat.decimals)
    : Math.round(count).toLocaleString();

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
        aria-label={`${stat.prefix ?? ''}${display}${stat.suffix ?? ''}`}
      >
        {stat.prefix}
        {display}
        {stat.suffix}
      </span>
      <span className="text-xs font-medium text-slate-400">{stat.label}</span>
    </div>
  );
}

export default function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-wrap justify-center gap-10 sm:gap-16"
      role="region"
      aria-label="Platform statistics"
    >
      {STATS.map((stat) => (
        <StatItem key={stat.label} stat={stat} active={active} />
      ))}
    </div>
  );
}
