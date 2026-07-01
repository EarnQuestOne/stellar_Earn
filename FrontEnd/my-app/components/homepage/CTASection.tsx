'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="bg-dark-surface-hero px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Ready to Start{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
            Earning?
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-base text-slate-400"
        >
          Join thousands of contributors completing quests and building their
          on-chain reputation. Connect your wallet to get started.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/quests"
            className="rounded-lg bg-cyan-500 px-7 py-3 text-sm font-semibold text-white shadow-glow-cta transition-all hover:bg-cyan-400 hover:shadow-glow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Get Started
          </Link>
          <Link
            href="/quests"
            className="rounded-lg border border-slate-600 bg-transparent px-7 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Browse Quests
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
