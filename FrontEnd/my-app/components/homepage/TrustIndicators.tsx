'use client';

const INDICATORS = [
  { icon: '⚡', label: '5-Second Settlement' },
  { icon: '✅', label: 'On-Chain Verification' },
  { icon: '🏆', label: 'Earn XP & Badges' },
];

export default function TrustIndicators() {
  return (
    <div
      className="flex flex-wrap justify-center gap-3"
      role="list"
      aria-label="Trust indicators"
    >
      {INDICATORS.map(({ icon, label }) => (
        <div
          key={label}
          role="listitem"
          className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1.5 text-xs font-semibold text-slate-300"
        >
          <span aria-hidden="true">{icon}</span>
          {label}
        </div>
      ))}
    </div>
  );
}
