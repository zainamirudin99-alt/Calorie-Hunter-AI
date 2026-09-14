"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  LayoutDashboard, 
  ScanLine, 
  UtensilsCrossed, 
  Activity, 
  User, 
  Target, 
  ShieldAlert,
  ChevronRight,
  X
} from "lucide-react";

interface TacticalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TacticalSidebar({ isOpen, onClose }: TacticalSidebarProps) {
  const pathname = usePathname();
  const { isUltraman } = useTacticalTheme();

  const navigationItems = [
    {
      name: "Dashboard HUD",
      href: "/",
      icon: LayoutDashboard,
      code: "SECTOR-01",
    },
    {
      name: "AI Monster Scanner",
      href: "/scanner",
      icon: ScanLine,
      code: "SECTOR-02",
    },
    {
      name: "Meal Plan Deck",
      href: "/meal-plan",
      icon: UtensilsCrossed,
      code: "SECTOR-03",
    },
    {
      name: "Tactical Activities",
      href: "/activities",
      icon: Activity,
      code: "SECTOR-04",
    },
    {
      name: "Program & TDEE",
      href: "/program",
      icon: Target,
      code: "SECTOR-05",
    },
    {
      name: "Hunter Profile",
      href: "/profile",
      icon: User,
      code: "SECTOR-06",
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Tactical Drawer */}
      <aside className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] hud-card border-r hud-border z-50 flex flex-col p-5 shadow-2xl theme-transition animate-in slide-in-from-left duration-200">
        {/* Sidebar Header with user's sidebar icon */}
        <div className="flex items-center justify-between pb-4 border-b hud-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded hud-card-high border hud-border flex items-center justify-center p-1.5 shadow-md">
              <Image
                src="/sidebar-icon.png"
                alt="Tactical Command System"
                width={30}
                height={30}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-display text-sm font-bold hud-hero-text uppercase tracking-wider block">
                COMMAND DECK
              </span>
              <span className="font-mono text-[10px] text-outline uppercase">
                {isUltraman ? "SCIENCE PATROL NET" : "TITAN PROTOCOL"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded hud-card-inner border hud-border flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors"
            title="Tutup Navigasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded font-mono text-xs uppercase tracking-wider transition-all border ${
                  isActive
                    ? "hud-hero-bg border-transparent font-bold shadow-md"
                    : "hud-card-inner border-transparent hud-text-muted hover:border-primary/40 hover:hud-text"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">{item.code}</span>
              </Link>
            );
          })}
        </nav>

        {/* System telemetry footer in sidebar */}
        <div className="pt-4 border-t hud-border font-mono text-[11px] hud-text-muted space-y-2">
          <div className="flex items-center justify-between">
            <span>KEAMANAN RLS:</span>
            <span className="hud-beam-text font-bold">AKTIF</span>
          </div>
          <div className="flex items-center justify-between">
            <span>AI ENGINE:</span>
            <span className="hud-hero-text font-bold">GEMINI 3.8 FLASH</span>
          </div>
          <div className="p-2 rounded hud-card-inner border hud-border text-[10px] text-center mt-2">
            CALORIE HUNTER AI TACTICAL HUD
          </div>
        </div>
      </aside>
    </>
  );
}
