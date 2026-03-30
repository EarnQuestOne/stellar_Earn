"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Do I need a Stellar wallet to get started?",
    answer:
      "Yes. You'll need a Stellar-compatible wallet (such as Freighter or LOBSTR) to connect to the platform, submit quests, and receive XLM rewards. Connecting takes less than a minute.",
  },
  {
    question: "How long does verification take?",
    answer:
      "Most submissions are reviewed within 24–48 hours. Complex technical quests may take slightly longer. You'll receive an on-platform notification once a decision is made.",
  },
  {
    question: "What types of quests are available?",
    answer:
      "Quests span development, design, content creation, community engagement, bug bounties, and more. Each quest specifies the required skills, estimated effort, and XLM reward upfront.",
  },
  {
    question: "Can I submit proof for multiple quests at once?",
    answer:
      "Absolutely. You can work on and submit proof for as many quests simultaneously as you'd like. Each submission is tracked independently in your dashboard.",
  },
  {
    question: "What happens if my submission is rejected?",
    answer:
      "If a submission is rejected, verifiers are required to provide feedback. You can revise and resubmit if the quest is still open. Your on-chain reputation is only affected by verified completions.",
  },
  {
    question: "How are rewards distributed?",
    answer:
      "Rewards are held in a Soroban smart contract and released automatically upon verification approval. The XLM lands directly in your connected Stellar wallet — no manual claims needed.",
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

function FAQItem({ question, answer, isOpen, onToggle, index }: FAQItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="border-b border-slate-200 dark:border-slate-700/60 last:border-b-0"
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
      >
        <span className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-cyan-500"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          >
            Common Questions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 text-base text-slate-500 dark:text-slate-400"
          >
            Everything you need to know before getting started
          </motion.p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-6 dark:border-slate-700/60 dark:bg-slate-800/40 sm:px-8">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              index={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
