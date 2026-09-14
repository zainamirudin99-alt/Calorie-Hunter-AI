"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  Flame, 
  ScanLine, 
  Bell, 
  Menu, 
  X,
  ArrowLeftRight,
  User,
  LogOut
} from "lucide-react";

interface HeaderProps {
  activeTab?: string;
  onOpenSidebar?: () => void;
}

export function TacticalHeader({ activeTab = "dashboard", onOpenSidebar }: HeaderProps) {
  const { theme, isUltraman, toggleTheme } = useTacticalTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full px-4 md:px-6 py-2.5 flex items-center justify-between border-b hud-border hud-card z-50 sticky top-0 theme-transition shadow-lg">
      <div className="flex items-center gap-3 lg:gap-6">
        {/* Sidebar Trigger using the user's sidebar icon */}
        <button
          onClick={onOpenSidebar || (() => setMobileMenuOpen(!mobileMenuOpen))}
          className="w-9 h-9 rounded hud-card-inner border hud-border flex items-center justify-center hover:border-primary transition-all group shrink-0 overflow-hidden p-1 shadow-sm"
          title="Buka Navigasi Taktis"
        >
          <Image
            src="/sidebar-icon.png"
            alt="Sidebar Menu"
            width={26}
            height={26}
            className="object-contain group-hover:scale-110 transition-transform"
          />
        </button>

        {/* Brand & System Logo using the user's custom logo.png */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded hud-card-high border hud-border flex items-center justify-center overflow-hidden p-1 group-hover:scale-105 transition-transform shrink-0 shadow-md">
            <Image
              src="/logo.png"
              alt="Calorie Hunter AI Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold hud-hero-text tracking-wider flex items-center gap-2 font-display leading-tight">
              CALORIE HUNTER AI
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded hud-card-high hud-beam-text border hud-border hidden sm:inline-block">
                {isUltraman ? "ULTRA.v7.0" : "KAIJU.v4.2"}
              </span>
            </div>
            <span className="text-[10px] font-mono block text-outline uppercase tracking-widest hidden md:block">
              {isUltraman 
                ? "SCIENCE PATROL COMMAND // MECHA SENSOR ACTIVE"
                : "TACTICAL ENERGY HUD // SYSTEM READY"}
            </span>
          </div>
        </Link>

        {/* Desktop Tactical Navigation */}
        <nav className="hidden xl:flex items-center gap-5 ml-4">
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
              <span className="hidden lg:inline">GODZILLA MODE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-600">
              <span className="text-sm">⚡</span>
              <span className="hidden lg:inline">ULTRAMAN MODE</span>
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

        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded hud-card-high border hud-border">
          <span className="text-xs font-mono hud-hero-text font-bold">LVL 42 // S-RANK</span>
        </div>

        {/* Scan Ration Action Button */}
        <Link
          href="/scanner"
          className="hud-clip-chamfer hud-hero-bg px-3 sm:px-4 py-2 font-mono text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg hover:opacity-90 shrink-0"
        >
          <ScanLine className="w-4 h-4" />
          <span className="hidden sm:inline">SCAN RATION</span>
          <span className="sm:hidden">SCAN</span>
        </Link>

        {/* Auth / Profile quick trigger */}
        <Link
          href="/auth"
          className="w-8 h-8 rounded hud-card-inner border hud-border flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors"
          title="Login / Register"
        >
          <User className="w-4 h-4" />
        </Link>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden w-8 h-8 rounded flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Collapsible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 w-full hud-card border-b hud-border px-6 py-4 flex flex-col gap-3 font-mono text-xs uppercase tracking-wider theme-transition shadow-2xl z-50">
          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-hero-text font-bold py-1 border-b border-dashed hud-border flex items-center justify-between"
          >
            <span>► Dashboard HUD</span>
            <span className="text-[10px] text-outline font-mono">[01]</span>
          </Link>
          <Link 
            href="/scanner" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1 flex items-center justify-between"
          >
            <span>► AI Monster Scanner</span>
            <span className="text-[10px] text-outline font-mono">[02]</span>
          </Link>
          <Link 
            href="/meal-plan" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1 flex items-center justify-between"
          >
            <span>► Meal Plan Deck</span>
            <span className="text-[10px] text-outline font-mono">[03]</span>
          </Link>
          <Link 
            href="/activities" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1 flex items-center justify-between"
          >
            <span>► Tactical Activities</span>
            <span className="text-[10px] text-outline font-mono">[04]</span>
          </Link>
          <Link 
            href="/profile" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-text-muted hover:hud-text py-1 flex items-center justify-between"
          >
            <span>► Hunter Profile</span>
            <span className="text-[10px] text-outline font-mono">[05]</span>
          </Link>
          <Link 
            href="/auth" 
            onClick={() => setMobileMenuOpen(false)}
            className="hud-beam-text font-bold py-1 border-t border-dashed hud-border flex items-center justify-between"
          >
            <span>► Login / Registrasi</span>
            <span className="text-[10px] text-outline font-mono">[AUTH]</span>
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
