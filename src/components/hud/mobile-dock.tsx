"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ScanLine, 
  UtensilsCrossed, 
  Target,
  User
} from "lucide-react";
import { useTacticalTheme } from "@/components/theme-provider";

export function MobileTacticalDock() {
  const pathname = usePathname();
  const { isUltraman } = useTacticalTheme();

  // Do not render dock on login / registration pages
  if (pathname === "/auth" || pathname === "/login") {
    return null;
  }

  // 5 exact tab items as specified in requirement 2.2
  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Scanner", href: "/scanner", icon: ScanLine },
    { label: "Rencana", href: "/meal-plan", icon: UtensilsCrossed },
    { label: "Program", href: "/program", icon: Target },
    { label: "Profil", href: "/profile", icon: User },
  ];

  return (
    <nav 
      aria-label="Mobile Tactical Dock"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 hud-card-high border-t hud-border backdrop-blur-xl px-2 pt-1.5 shadow-2xl theme-transition"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-lg font-mono text-[10px] transition-all ${
                isActive
                  ? "hud-hero-text font-bold bg-primary/10 shadow-sm"
                  : "hud-text-muted hover:hud-text"
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? "hud-hero-text scale-110" : ""}`} />
              <span className="leading-tight truncate max-w-full">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full hud-hero-bg mt-0.5"></span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
