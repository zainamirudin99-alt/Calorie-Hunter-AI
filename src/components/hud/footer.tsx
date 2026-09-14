"use client";

import React from "react";
import { useTacticalTheme } from "@/components/theme-provider";

export function TacticalFooter() {
  const { isUltraman } = useTacticalTheme();

  return (
    <footer className="w-full border-t hud-border hud-card px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between text-[11px] font-mono hud-text-muted gap-2 mt-auto theme-transition">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        <span className="hud-text font-bold">CALORIE HUNTER AI TACTICAL ENGINE</span>
        <span>•</span>
        <span>SYS LATENCY: 12ms</span>
        <span>•</span>
        <span>
          {isUltraman 
            ? "ENKRIPSI: ULTRA-SOLAR-PATROL-512" 
            : "ENKRIPSI: KAIJU-QUANTUM-256"}
        </span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hud-hero-text font-bold">
          {isUltraman 
            ? "STATUS: DISINKRONISASI [ULTRAMAN SCIENCE PATROL]" 
            : "STATUS: DISINKRONISASI [GODZILLA TITAN NET]"}
        </span>
        <span className="text-outline">|</span>
        <span>HAK CIPTA DILINDUNGI // PROTOKOL HUNTER © 2026</span>
      </div>
    </footer>
  );
}
