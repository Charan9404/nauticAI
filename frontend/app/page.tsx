"use client";

import Image from "next/image";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PartnerStrip } from "@/components/PartnerStrip";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background image layer */}
      <div className="fixed inset-0 -z-20">
        <Image
          src="/bgimage.jpg"
          alt="Lavender grid background"
          fill
          priority
          className="object-cover opacity-90"
          sizes="100vw"
        />
      </div>

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
