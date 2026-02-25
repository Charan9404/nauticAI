"use client";

import { motion } from "framer-motion";

const partners = [
  "Ultralytics",
  "YOLOv8",
  "ReportLab",
  "Maritime",
  "Subsea",
  "NautiCAI",
];

export function PartnerStrip() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="border-t border-dark-border bg-dark-surface/50 py-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-slate-500 sm:mb-6">
          Powered by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-12">
          {partners.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.05 }}
              className="rounded-lg border border-dark-border bg-dark-card/50 px-6 py-3 text-sm font-medium text-slate-400 transition-colors hover:border-lavender-500/30 hover:text-lavender-300"
            >
              {name}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
