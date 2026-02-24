"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-dark-border/50 bg-dark-surface/30 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <Link href="/" className="font-display text-sm font-semibold tracking-wider text-lavender-400/80">
          NAUTICAI
        </Link>
        <p className="text-center text-xs text-slate-500">
          Explore Safer Seas Now · Enhancing Underwater Awareness for Maritime Safety
        </p>
      </div>
    </footer>
  );
}
