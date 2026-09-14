"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  UserCheck, 
  User, 
  Activity, 
  Target, 
  UtensilsCrossed, 
  ScanLine, 
  LayoutDashboard,
  CheckCircle2
} from "lucide-react";

export function CampaignStepper() {
  const pathname = usePathname();

  const steps = [
    { id: 1, name: "Auth", href: "/auth", icon: UserCheck, code: "01" },
    { id: 2, name: "Profil Biometrik", href: "/profile", icon: User, code: "02" },
    { id: 3, name: "Aktivitas", href: "/activities", icon: Activity, code: "03" },
    { id: 4, name: "TDEE & Program", href: "/program", icon: Target, code: "04" },
    { id: 5, name: "Meal Plan AI", href: "/meal-plan", icon: UtensilsCrossed, code: "05" },
    { id: 6, name: "Tracking Scanner", href: "/scanner", icon: ScanLine, code: "06" },
    { id: 7, name: "Dashboard HUD", href: "/", icon: LayoutDashboard, code: "07" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.href === pathname);
  const activeIndex = currentStepIndex !== -1 ? currentStepIndex : 6;

  return (
    <div className="w-full hud-card-inner border-b hud-border px-4 py-2 overflow-x-auto theme-transition">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between min-w-[760px] gap-2 font-mono text-[11px]">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <Link
                href={step.href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all whitespace-nowrap border ${
                  isCurrent
                    ? "hud-hero-bg border-transparent font-bold shadow"
                    : isCompleted
                    ? "hud-card-high border-primary/40 hud-hero-text"
                    : "hud-card border-transparent hud-text-muted hover:hud-text"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>[{step.code}] {step.name}</span>
              </Link>
              {idx < steps.length - 1 && (
                <span className="text-outline text-xs">➔</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
