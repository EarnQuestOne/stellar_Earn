'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CTAButtons from './CTAButtons';
import StatsCounter from './StatsCounter';
import TrustIndicators from './TrustIndicators';

const ROTATING_WORDS = ['Achievements', 'Rewards', 'Reputation', 'Income'];

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 350);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-[#071020] px-4 pb-16 pt-24 text-center sm:pt-32"
      aria-label="Hero"
    >
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 opacity-20"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse, rgba(34,211,238,0.5) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6">
        {/* "Built on Stellar & Soroban" badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1.5"
        >
          <span aria-hidden="true">⭐</span>
          <span className="text-xs font-semibold text-slate-300">
            Built on Stellar &amp; Soroban
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          Turn Work Into <br className="hidden sm:block" />
          <span
            className="inline-block bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent transition-all duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(-8px)',
            }}
            aria-live="polite"
          >
            On-Chain {ROTATING_WORDS[wordIndex]}
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="max-w-xl text-base leading-relaxed text-slate-400"
        >
          Complete quests, earn rewards, and build your reputation on the
          Stellar blockchain. Fast settlements, low fees, global reach.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="w-full"
        >
          <CTAButtons />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full border-t border-slate-800 pt-8"
        >
          <StatsCounter />
        </motion.div>

        {/* Trust indicator pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.38 }}
          className="w-full"
        >
          <TrustIndicators />
        </motion.div>
      </div>
    </section>
  );
}
