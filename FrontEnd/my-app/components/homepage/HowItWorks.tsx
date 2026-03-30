"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { StepTimeline } from "./StepTimeline";

export function HowItWorks() {
  return (
    <section className="bg-[#071020] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mb-16 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            How It{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              Works
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-base text-slate-400"
          >
            From quest creation to reward distribution in four simple steps
          </motion.p>
        </div>

        {/* Steps */}
        <StepTimeline />

        {/* Video placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-slate-700/60"
        >
          <div className="flex aspect-video items-center justify-center bg-slate-800/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-600 bg-slate-700/60 text-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.2)] transition-transform hover:scale-105 cursor-pointer">
                {/* Play icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7 translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Watch the tutorial</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
