"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { TacticalSidebar } from "@/components/hud/sidebar";
import { MobileTacticalDock } from "@/components/hud/mobile-dock";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth" || pathname === "/login";

  if (isAuthPage) {
    return (
      <div className="min-h-[100dvh] flex flex-col w-full">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col w-full relative">
      {/* Persistent Left Sidebar on Desktop (>=1024px) & Slide-over Drawer on Mobile (<1024px) */}
      <TacticalSidebar />

      {/* Main Content Area: Offset by 18rem (w-72) on desktop (>=1024px), centered with max-w-[1200px] */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 w-full">
        <div className="flex-1 w-full max-w-[1200px] mx-auto min-w-0 flex flex-col pb-24 lg:pb-8">
          {children}
        </div>
      </div>

      {/* Mobile Fixed Bottom Dock (<1024px) with 5 Tab Items */}
      <MobileTacticalDock />
    </div>
  );
}
