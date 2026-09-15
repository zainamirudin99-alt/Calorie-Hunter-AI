"use client";

import React from "react";
import { useTacticalTheme } from "@/components/theme-provider";

export function TelemetryTicker() {
  const { isUltraman } = useTacticalTheme();

  return (
    <div className="w-full hud-ticker border-b hud-border px-3 sm:px-6 py-1.5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono gap-3 theme-transition overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-2 sm:gap-4 hud-text-muted shrink-0">
        <span className="flex items-center gap-1.5 hud-hero-text font-bold shrink-0">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full hud-hero-bg animate-ping"></span>
          <span>
            {isUltraman 
              ? "PATROL NET: READY" 
              : "COMBAT NET: BIO-RESONANCE"}
          </span>
        </span>
        <span className="text-outline">•</span>
        <span className="shrink-0">SEKTOR: 07-METABOLIC</span>
        <span className="hidden sm:inline text-outline">•</span>
        <span className="hidden sm:inline shrink-0">DEFISIT TARGET: -500 KCAL</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0 ml-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hud-text-muted hidden xs:inline">METABOLISME:</span>
          <span className="hud-beam-text font-bold">142 BPM</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hud-text-muted hidden xs:inline">QUEST:</span>
          <span className="hud-hero-text font-bold">2/3 SELESAI</span>
        </div>
      </div>
    </div>
  );
}
