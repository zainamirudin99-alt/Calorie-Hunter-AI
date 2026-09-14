"use client";

import React from "react";
import { useTacticalTheme } from "@/components/theme-provider";

export function TelemetryTicker() {
  const { isUltraman } = useTacticalTheme();

  return (
    <div className="w-full hud-ticker border-b hud-border px-4 md:px-6 py-2 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2 theme-transition">
      <div className="flex items-center gap-3 sm:gap-4 hud-text-muted flex-wrap">
        <span className="flex items-center gap-1.5 hud-hero-text font-bold">
          <span className="w-2 h-2 rounded-full hud-hero-bg animate-ping"></span>
          <span>
            {isUltraman 
              ? "PATROL NET: SCIENCE PATROL DEFENSE READY" 
              : "COMBAT NET: GODZILLA BIO-RESONANCE"}
          </span>
        </span>
        <span className="hidden sm:inline text-outline">•</span>
        <span>SEKTOR: 07-METABOLIC RUNAWAY</span>
        <span className="hidden md:inline text-outline">•</span>
        <span className="hidden md:inline">DEFISIT TARGET: -500 KCAL</span>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="hud-text-muted">DENYUT METABOLISME:</span>
          <span className="hud-beam-text font-bold">142 BPM SYNC</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-text-muted">STATUS QUEST HARIAN:</span>
          <span className="hud-hero-text font-bold">2/3 SELESAI</span>
        </div>
      </div>
    </div>
  );
}
