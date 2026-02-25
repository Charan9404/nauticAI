"use client";

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PartnerStrip } from "@/components/PartnerStrip";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background video layer */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 -z-20 h-full w-full object-cover"
      >
        <source src="/bgvideo.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradients and grid to keep text readable */}
      <div className="fixed inset-0 -z-10 bg-dark-bg/50" />
      <div className="fixed inset-0 -z-10 bg-grid-pattern bg-grid opacity-60" />
      <div className="fixed inset-0 -z-10 bg-hero-glow pointer-events-none" />

      <Header />
      <main className="relative">
        <Hero />
        <PartnerStrip />
        <Footer />
      </main>
    </div>
  );
}
