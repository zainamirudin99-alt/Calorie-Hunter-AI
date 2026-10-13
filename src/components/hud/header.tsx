"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  ScanLine, 
  Menu, 
  ArrowLeftRight, 
  User, 
  RefreshCw 
} from "lucide-react";

interface HeaderProps {
  activeTab?: string;
  onOpenSidebar?: () => void;
}

export function TacticalHeader({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth" || pathname === "/login";
  const { isUltraman, toggleTheme, toggleSidebar } = useTacticalTheme();
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

  const handleCloudSync = () => {
    setIsGlobalSyncing(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chai_trigger_cloud_sync"));
    }
    setTimeout(() => {
      setIsGlobalSyncing(false);
    }, 1200);
  };

  const handleSidebarClick = () => {
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      toggleSidebar();
    }
  };

  return (
    <header className="w-full px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2.5 flex items-center justify-between border-b hud-border hud-card z-50 sticky top-0 theme-transition shadow-lg">
      {/* Leading Section: Mobile DECK Trigger + Brand Identity */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Tactical Command Deck Trigger: Muncul di desktop dan mobile untuk membuka sidebar on-demand */}
        {!isAuthPage && (
          <button
            onClick={handleSidebarClick}
            className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] px-2 sm:px-2.5 rounded hud-card-inner border hud-border flex items-center justify-center gap-1 sm:gap-1.5 hover:border-primary transition-all group shrink-0 shadow-sm cursor-pointer"
            title="Buka Tactical Command Deck"
            aria-label="Buka Command Deck"
          >
            <Menu className="w-4 h-4 hud-hero-text group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden sm:inline font-mono text-[10px] hud-text-muted group-hover:hud-text uppercase font-bold tracking-wider">
              DECK
            </span>
          </button>
        )}

        {/* Brand & System Logo */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group shrink-0 min-w-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg hud-card-high border hud-border flex items-center justify-center overflow-hidden p-1 group-hover:scale-105 transition-transform shrink-0 shadow-md">
            <Image
              src="/logo.png"
              alt="Calorie Hunter AI Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm md:text-base font-bold hud-hero-text tracking-wide flex items-center gap-1.5 font-display leading-tight truncate">
              <span className="truncate">CALORIE HUNTER</span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1 py-0.2 rounded hud-card-high hud-beam-text border hud-border hidden sm:inline-block shrink-0">
                {isUltraman ? "ULTRA.v7" : "KAIJU.v4"}
              </span>
            </div>
            <span className="text-[9px] font-mono text-outline uppercase tracking-widest hidden md:block truncate">
              {isUltraman 
                ? "SCIENCE PATROL // MECHA SENSOR"
                : "TACTICAL ENERGY // SYSTEM READY"}
            </span>
          </div>
        </Link>
      </div>

      {/* Trailing Tactical Cluster & Global Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* INTERACTIVE DUAL THEME SWITCHER */}
        <button
          onClick={toggleTheme}
          className="relative min-h-[38px] sm:min-h-[40px] flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded border hud-border hud-card-high hover:border-primary transition-all duration-300 shadow-md group cursor-pointer"
          title="Ganti Mode: Godzilla Titan (Dark) vs Ultraman Science Patrol (Light)"
          aria-label="Ganti Tema"
        >
          {!isUltraman ? (
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
              <span className="text-sm">🦖</span>
              <span className="hidden xl:inline text-[11px]">GODZILLA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block"></span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-red-500">
              <span className="text-sm">⚡</span>
              <span className="hidden xl:inline text-[11px]">ULTRAMAN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping hidden sm:inline-block"></span>
            </span>
          )}
          <ArrowLeftRight className="w-3 h-3 text-outline group-hover:hud-hero-text transition-colors hidden md:inline" />
        </button>

        {/* UNIVERSAL CLOUD SYNC TRIGGER (DESKTOP & MOBILE) */}
        <button
          onClick={handleCloudSync}
          disabled={isGlobalSyncing}
          className="relative min-h-[38px] sm:min-h-[40px] min-w-[38px] sm:min-w-[40px] flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded border hud-border hud-card-inner hover:border-primary transition-all duration-200 shadow-sm group cursor-pointer text-slate-300 hover:text-white disabled:opacity-50"
          title="Sinkronisasi seluruh data dengan database Cloud (Desktop & Mobile Sync)"
          aria-label="Sinkronisasi Cloud"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGlobalSyncing ? "animate-spin text-primary" : "text-cyan-400 group-hover:rotate-180 transition-transform duration-500"}`} />
          <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase hidden md:inline">
            {isGlobalSyncing ? "SYNCING..." : "SYNC CLOUD"}
          </span>
          <span className="hidden sm:inline md:hidden font-mono text-[10px] font-bold text-cyan-400">
            {isGlobalSyncing ? "SYNC..." : "SYNC"}
          </span>
        </button>

        {/* Level / Rank Badge (Hanya di layar lebar xl >= 1280px) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded hud-card-high border hud-border">
          <span className="text-xs font-mono hud-hero-text font-bold">LVL 42 // S-RANK</span>
        </div>

        {/* Scan Ration Action Button */}
        <Link
          href="/scanner"
          className="hud-clip-chamfer hud-hero-bg px-2 sm:px-3.5 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[40px] font-mono text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-md hover:opacity-90 shrink-0"
          title="Scan Ransum AI"
        >
          <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">SCAN RATION</span>
        </Link>

        {/* Hunter Profile Quick Link */}
        <Link
          href="/profile"
          className="min-h-[38px] sm:min-h-[40px] min-w-[38px] sm:min-w-[40px] rounded hud-card-inner border hud-border flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors shrink-0"
          title="Data Diri & Profil Hunter"
          aria-label="Profil Hunter"
        >
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
