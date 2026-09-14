"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Camera, 
  Activity, 
  Target,
  User
} from "lucide-react";
import { useTacticalTheme } from "@/components/theme-provider";

export function MobileTacticalDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Hidden file input for direct native camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        // Store temporarily in sessionStorage for scanner page to pick up
        if (typeof reader.result === "string") {
          sessionStorage.setItem("chai_quick_capture", reader.result);
        }
        router.push("/scanner");
      };
      reader.readAsDataURL(file);
    } else {
      router.push("/scanner");
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Tracking", href: "/scanner", icon: UtensilsCrossed },
    { label: "Scan AI", href: "/scanner", isAction: true, icon: Camera },
    { label: "Program", href: "/program", icon: Target },
    { label: "Profil", href: "/profile", icon: User },
  ];

  return (
    <>
      {/* Hidden Native Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      {/* Mobile Fixed Bottom Tactical Navigation Dock */}
      <nav 
        aria-label="Mobile Tactical Dock"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 hud-card-high border-t hud-border backdrop-blur-lg px-2 py-1.5 shadow-2xl theme-transition"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <div key={item.label} className="relative -top-4 flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (cameraInputRef.current) {
                        cameraInputRef.current.click();
                      } else {
                        router.push("/scanner");
                      }
                    }}
                    className="w-13 h-13 rounded-full hud-hero-bg border-2 border-primary/50 flex items-center justify-center shadow-lg transition-transform active:scale-95 group focus:outline-none"
                    title="Buka Kamera Native / Scan Ransum"
                  >
                    <Camera className="w-6 h-6 text-black dark:text-black group-hover:scale-110 transition-transform" />
                  </button>
                  <span className="font-mono text-[9px] font-bold hud-hero-text mt-1 uppercase">
                    SCAN AI
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded font-mono text-[10px] transition-all ${
                  isActive
                    ? "hud-hero-text font-bold scale-105"
                    : "hud-text-muted hover:hud-text"
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "hud-hero-text" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
