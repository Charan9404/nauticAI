"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const features = [
  "Real-time hull & pipeline anomaly detection",
  "YOLOv8-powered inspection for ROV & AUV feeds",
  "Professional PDF reports & agent-driven alerts",
];

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center px-6 pt-24 pb-20 md:flex-row md:items-center md:gap-16 md:px-12 lg:px-16">
      <div className="relative z-10 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-lavender-400">
            AI Intelligence Layer · Maritime Safety
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
            Full-Stack Underwater
            <br />
            <span className="bg-gradient-to-r from-lavender-300 via-lavender-400 to-lavender-500 bg-clip-text text-transparent">
              Anomaly Detection
            </span>
          </h1>
          <ul className="mt-8 space-y-3">
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-400"
              >
                <span className="text-lavender-500">→</span>
                <span className="text-sm md:text-base">{feature}</span>
              </motion.li>
            ))}
          </ul>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link
              href="/detect"
              className="rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-6 py-3 text-sm font-semibold text-white shadow-lavender-glow transition-all hover:from-lavender-500 hover:to-lavender-600 hover:shadow-lavender-glow-lg"
            >
              Explore the model
            </Link>
            <Link
              href="https://www.nauticai-ai.com/contact"
              className="rounded-lg border border-dashed border-slate-500 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-lavender-500 hover:text-lavender-300"
            >
              Contact us
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Hero visual: abstract glow + grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="relative hidden flex-1 md:block"
      >
        <div className="relative aspect-square max-w-lg rounded-2xl border border-dark-border bg-dark-card/50 p-8 backdrop-blur-sm">
          <div className="absolute inset-0 rounded-2xl bg-hero-glow opacity-80" />
          <div className="grid-bg absolute inset-0 rounded-2xl" />
          <div className="glow-orb absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-lavender-500/20 blur-3xl" />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex flex-col items-center justify-center gap-4 pt-12"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-lavender-500/30 bg-lavender-500/10">
              <span className="text-4xl">🌊</span>
            </div>
            <p className="font-display text-center text-sm font-medium text-lavender-300">
              ROV · AUV · Pipelines
            </p>
            <p className="max-w-[200px] text-center text-xs text-slate-500">
              Upload image or video → AI detection → Report & alerts
            </p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
