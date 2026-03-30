"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Upload,
  ShieldCheck,
  Zap,
  ChevronDown,
  Clock,
} from "lucide-react";

const steps = [
  {
    number: 1,
    icon: ClipboardList,
    title: "Quest Created",
    summary:
      "Browse through quests organized by category, difficulty, and reward value to find the right fit.",
    details:
      "Quest creators publish tasks with clear objectives, acceptance criteria, and XLM rewards. Filter by skill set, time commitment, or reward size to find quests that match your expertise.",
    estimatedTime: "5 min",
  },
  {
    number: 2,
    icon: Upload,
    title: "Submit Proof",
    summary:
      "Complete the quest objective and submit your proof of work for review.",
    details:
      "Upload screenshots, links, code, or any required deliverables through the submission form. Ensure your proof clearly demonstrates completion of all stated objectives before submitting.",
    estimatedTime: "Varies",
  },
  {
    number: 3,
    icon: ShieldCheck,
    title: "Verification",
    summary:
      "Your submission is reviewed by assigned verifiers on the platform.",
    details:
      "Dedicated verifiers evaluate your submission against the quest criteria. The process is transparent and on-chain, ensuring fair and tamper-proof assessment of your work.",
    estimatedTime: "24–48 hrs",
  },
  {
    number: 4,
    icon: Zap,
    title: "Instant Payout",
    summary:
      "Once verified, rewards are automatically distributed to your Stellar wallet.",
    details:
      "Smart contracts on the Stellar network execute the payout instantly upon verification approval. No intermediaries, no delays — your XLM earnings land directly in your connected wallet.",
    estimatedTime: "Instant",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: "easeOut" },
  }),
};

export function StepTimeline() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (num: number) =>
    setExpanded((prev) => (prev === num ? null : num));

  return (
    <div className="relative">
      {/* Connecting line — desktop only */}
      <div
        aria-hidden="true"
        className="absolute top-[52px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] hidden h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent lg:block"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isOpen = expanded === step.number;

          return (
            <motion.div
              key={step.number}
              custom={step.number - 1}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="relative flex flex-col"
            >
              {/* Step number badge — sits above the card on the connecting line */}
              <div className="mb-4 flex justify-center">
                <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-cyan-500 bg-[#0a1628] shadow-[0_0_16px_rgba(34,211,238,0.35)]">
                  <Icon className="h-6 w-6 text-cyan-400" strokeWidth={1.75} />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Card */}
              <div className="flex flex-1 flex-col rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 backdrop-blur-sm transition-colors hover:border-cyan-500/40">
                <h3 className="mb-2 text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-slate-400">
                  {step.summary}
                </p>

                {/* Estimated time */}
                <div className="mt-4 flex items-center gap-1.5 text-xs text-cyan-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{step.estimatedTime}</span>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => toggle(step.number)}
                  aria-expanded={isOpen}
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {isOpen ? "Less detail" : "More detail"}
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.p
                      key="details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden text-xs leading-relaxed text-slate-400 pt-3"
                    >
                      {step.details}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
