"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  Shield, 
  Swords, 
  Flame, 
  ScanLine, 
  Bell, 
  Menu, 
  X,
  ArrowLeftRight
} from "lucide-react";

interface HeaderProps {
  activeTab?: string;
}

export function TacticalHeader({ activeTab = "dashboard" }: HeaderProps) {
  const { theme, isUltraman, toggleTheme } = useTacticalTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full px-4 md:px-6 py-3 flex items-center justify-between border-b hud-border hud-card z-50 sticky top-0 theme-transition shadow-lg">
      <div className="flex items-center gap-4 lg:gap-8">
        {/* Brand & System Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div 
            className="w-9 h-9 rounded bg-primary/10 border hud-border flex items-center justify-center hud-hero-text transition-colors group-hover:scale-105"
            style={{ borderColor: isUltraman ? "var(--hero-accent)" : undefined }}
          >
            {isUltraman ? (
              <Shield className="w-5 h-5 transition-transform" />
            ) : (
              <Swords className="w-5 h-5 transition-transform" />
            )}
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold hud-hero-text tracking-wider flex items-center gap-2 font-display">
              CALORIE HUNTER AI
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded hud-card-high hud-beam-text border hud-border">
                {isUltraman ? "ULTRA.v7.0" : "KAIJU.v4.2"}
              </span>
            </div>
            <span className="text-[10px] font-mono block text-outline uppercase tracking-widest hidden sm:block">
              {isUltraman 
                ? "SCIENCE PATROL COMMAND // MECHA SENSOR ACTIVE"
                : "TACTICAL ENERGY HUD // SYSTEM READY"}
            </span>
          </div>
        </Link>

        {/* Desktop Tactical Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link
            href="/"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "dashboard"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
            style={{ borderColor: activeTab === "dashboard" ? "var(--hero-accent)" : undefined }}
          >
            Dashboard HUD
          </Link>
          <Link
            href="/scanner"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "scanner"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
          >
            AI Monster Scanner
          </Link>
          <Link
            href="/meal-plan"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "meal-plan"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
          >
            Meal Plan Deck
          </Link>
          <Link
            href="/activities"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "activities"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
          >
            Tactical Activities
          </Link>
          <Link
            href="/profile"
            className={`font-mono text-xs uppercase tracking-wider pb-1 transition-colors ${
              activeTab === "profile"
                ? "border-b-2 hud-hero-text font-bold"
                : "hud-text-muted hover:hud-text"
            }`}
          >
            Hunter Profile
          </Link>
        </nav>
      </div>

      {/* Trailing Tactical Cluster & Dual Theme Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* INTERACTIVE DUAL THEME SWITCHER */}
        <button
          onClick={toggleTheme}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded border hud-border hud-card-high hover:border-primary transition-all duration-300 shadow-md group cursor-pointer"
          title="Ganti Mode: Godzilla Titan (Dark) vs Ultraman Science Patrol (Light)"
        >
          {!isUltraman ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
              <span className="text-sm">🦖</span>
              <span className="hidden md:inline">GODZILLA MODE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-600">
              <span className="text-sm">⚡</span>
              <span className="hidden md:inline">ULTRAMAN MODE</span>
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            </span>
          )}
          <ArrowLeftRight className="w-3.5 h-3.5 text-outline group-hover:hud-hero-text transition-colors" />
        </button>

        {/* Telemetry Badges (Desktop) */}
        <div className="hidden 2xl:flex items-center gap-2 border hud-border hud-card-inner px-3 py-1 rounded">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-mono text-xs hud-text font-bold">18 HARI STREAK</span>
          <span className="text-outline mx-1">|</span>
          <span className="font-mono text-[11px] hud-beam-text uppercase">HARI 42/180 PROGRAM</span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded hud-card-high border hud-border">
          <span className="text-xs font-mono hud-hero-text font-bold">LVL 42 // S-RANK</span>
        </div>

        {/* Scan Ration Action Button */}
        <Link
          href="/scanner"
          className="hud-clip-chamfer hud-hero-bg px-3 sm:px-4 py-2 font-mono text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg hover:opacity-90"
        >
          <ScanLine className="w-4 h-4" />
          <span className="hidden sm:inline">SCAN RATION</span>
          <span className="sm:hidden">SCAN</span>
        </Link>

        {/* Notifications & Mobile Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l hud-border">
          <button 
            className="w-8 h-8 rounded flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 rounded flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full hud-card border-b hud-border px-6 py-4 flex flex-col gap-3 font-mono text-xs uppercase tracking-wider theme-transition shadow-2xl">
          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-hero-text font-bold py-1 border-b border-dashed hud-border"
          >
            ► Dashboard HUD
          </Link>
          <Link 
            href="/scanner" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1"
          >
            ► AI Monster Scanner
          </Link>
          <Link 
            href="/meal-plan" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1"
          >
            ► Meal Plan Deck
          </Link>
          <Link 
            href="/activities" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1"
          >
            ► Tactical Activities
          </Link>
          <Link 
            href="/profile" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1"
          >
            ► Hunter Profile
          </Link>
          <div className="pt-2 border-t hud-border flex items-center justify-between text-[11px] hud-text-muted">
            <span>STREAK: 18 HARI</span>
            <span className="hud-hero-text font-bold">LVL 42 // S-RANK</span>
          </div>
        </div>
      )}
    </header>
  );
}
