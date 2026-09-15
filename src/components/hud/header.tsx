"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  Flame, 
  ScanLine, 
  Menu, 
  X,
  ArrowLeftRight,
  User,
  LayoutDashboard
} from "lucide-react";

interface HeaderProps {
  activeTab?: string;
  onOpenSidebar?: () => void;
}

export function TacticalHeader({ activeTab = "dashboard", onOpenSidebar }: HeaderProps) {
  const { isUltraman, toggleTheme, toggleSidebar } = useTacticalTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarClick = () => {
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      toggleSidebar();
    }
  };

  return (
    <header className="w-full px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 flex items-center justify-between border-b hud-border hud-card z-50 sticky top-0 theme-transition shadow-lg">
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0">
        {/* Tactical Command Deck Trigger */}
        <button
          onClick={handleSidebarClick}
          className="h-8 sm:h-9 px-2 sm:px-2.5 rounded hud-card-inner border hud-border flex items-center gap-1.5 hover:border-primary transition-all group shrink-0 shadow-sm cursor-pointer"
          title="Buka Tactical Command Deck"
          aria-label="Buka Command Deck"
        >
          <Menu className="w-4 h-4 hud-hero-text group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden sm:inline font-mono text-[10px] hud-text-muted group-hover:hud-text uppercase font-bold tracking-wider">
            DECK
          </span>
        </button>

        {/* Brand & System Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
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
            <div className="text-xs sm:text-base font-bold hud-hero-text tracking-wide flex items-center gap-1.5 font-display leading-tight truncate">
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

        {/* Desktop Tactical Navigation */}
        <nav className="hidden xl:flex items-center gap-5 ml-2">
          <Link
            href="/"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "dashboard"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
            style={{ borderColor: activeTab === "dashboard" ? "var(--hero-accent)" : undefined }}
          >
            Dashboard Progress
          </Link>
          <Link
            href="/scanner"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "scanner"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
            style={{ borderColor: activeTab === "scanner" ? "var(--hero-accent)" : undefined }}
          >
            Tracking Makanan
          </Link>
          <Link
            href="/program"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "program"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
            style={{ borderColor: activeTab === "program" ? "var(--hero-accent)" : undefined }}
          >
            Pilih Program
          </Link>
          <Link
            href="/meal-plan"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "meal-plan"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
            style={{ borderColor: activeTab === "meal-plan" ? "var(--hero-accent)" : undefined }}
          >
            Rencana Makan AI
          </Link>
          <Link
            href="/profile"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "profile"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
            style={{ borderColor: activeTab === "profile" ? "var(--hero-accent)" : undefined }}
          >
            Data Diri & Aktivitas
          </Link>
        </nav>
      </div>

      {/* Trailing Tactical Cluster & Dual Theme Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* INTERACTIVE DUAL THEME SWITCHER */}
        <button
          onClick={toggleTheme}
          className="relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded border hud-border hud-card-high hover:border-primary transition-all duration-300 shadow-md group cursor-pointer"
          title="Ganti Mode: Godzilla Titan (Dark) vs Ultraman Science Patrol (Light)"
          aria-label="Ganti Tema"
        >
          {!isUltraman ? (
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
              <span className="text-sm">🦖</span>
              <span className="hidden lg:inline text-[11px]">GODZILLA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-red-500">
              <span className="text-sm">⚡</span>
              <span className="hidden lg:inline text-[11px]">ULTRAMAN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            </span>
          )}
          <ArrowLeftRight className="w-3 h-3 text-outline group-hover:hud-hero-text transition-colors hidden sm:inline" />
        </button>

        {/* Telemetry Badges (Desktop) */}
        <div className="hidden 2xl:flex items-center gap-2 border hud-border hud-card-inner px-3 py-1 rounded">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-mono text-xs hud-text font-bold">18 HARI STREAK</span>
          <span className="text-outline mx-1">|</span>
          <span className="font-mono text-[11px] hud-beam-text uppercase">HARI 42/180</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded hud-card-high border hud-border">
          <span className="text-xs font-mono hud-hero-text font-bold">LVL 42 // S-RANK</span>
        </div>

        {/* Scan Ration Action Button */}
        <Link
          href="/scanner"
          className="hud-clip-chamfer hud-hero-bg px-2.5 sm:px-3.5 py-1.5 sm:py-2 font-mono text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-md hover:opacity-90 shrink-0"
          title="Scan Ransum AI"
        >
          <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">SCAN RATION</span>
          <span className="sm:hidden text-[11px]">SCAN</span>
        </Link>

        {/* Hunter Profile Quick Link */}
        <Link
          href="/profile"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded hud-card-inner border hud-border flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors shrink-0"
          title="Data Diri & Profil Hunter"
          aria-label="Profil Hunter"
        >
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>

        {/* Mobile Menu Dropdown Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors shrink-0"
          aria-label="Menu navigasi cepat"
        >
          {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>

      {/* Collapsible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 w-full hud-card border-b hud-border px-4 sm:px-6 py-4 flex flex-col gap-2.5 font-mono text-xs uppercase tracking-wider theme-transition shadow-2xl z-50 animate-in fade-in-50 duration-150">
          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-hero-text font-bold py-1.5 border-b border-dashed hud-border flex items-center justify-between"
          >
            <span>► Dashboard Progress</span>
            <span className="text-[10px] text-outline font-mono">[01]</span>
          </Link>
          <Link 
            href="/scanner" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1.5 flex items-center justify-between"
          >
            <span>► Tracking Makanan (AI Scan)</span>
            <span className="text-[10px] text-outline font-mono">[02]</span>
          </Link>
          <Link 
            href="/program" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1.5 flex items-center justify-between"
          >
            <span>► Pilih Program & TDEE</span>
            <span className="text-[10px] text-outline font-mono">[03]</span>
          </Link>
          <Link 
            href="/meal-plan" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1.5 flex items-center justify-between"
          >
            <span>► Rencana Makan AI</span>
            <span className="text-[10px] text-outline font-mono">[04]</span>
          </Link>
          <Link 
            href="/profile" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1.5 flex items-center justify-between"
          >
            <span>► Data Diri & Biometrik</span>
            <span className="text-[10px] text-outline font-mono">[05]</span>
          </Link>
          <Link 
            href="/activities" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1.5 flex items-center justify-between"
          >
            <span>► Aktivitas & Hobi</span>
            <span className="text-[10px] text-outline font-mono">[06]</span>
          </Link>
          <div className="pt-2 border-t hud-border flex items-center justify-between text-[10px] sm:text-[11px] hud-text-muted">
            <span>STREAK: 18 HARI</span>
            <span className="hud-hero-text font-bold">LVL 42 // S-RANK</span>
          </div>
        </div>
      )}
    </header>
  );
}
