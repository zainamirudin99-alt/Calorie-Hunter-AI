"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalSidebar } from "@/components/hud/sidebar";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { TacticalFooter } from "@/components/hud/footer";
import { LockoutGate } from "@/components/hud/lockout-gate";
import { useTacticalTheme } from "@/components/theme-provider";
import { DailyCalorieChart, WeightTrendChart, MacroDistributionChart } from "@/components/hud/charts";
import { 
  Swords, 
  Shield, 
  Bolt, 
  Utensils, 
  Gauge, 
  Layers, 
  LineChart, 
  TrendingDown, 
  PieChart, 
  Award, 
  Camera, 
  Droplets, 
  Dumbbell,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowRight
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<any | null>(null);

  // Auto-redirect to /auth if not logged in (Requirement: initial entry is Login & Registration)
  useEffect(() => {
    const token = localStorage.getItem("chai_auth_token");
    if (!token) {
      router.replace("/auth");
      return;
    }

    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/dashboard/summary", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
        }
      } catch {}
    };
    fetchSummary();
  }, [router]);

  const dailyHistory = telemetry?.daily_history || [
    { day: "SEN", calories: 1890, target: 1950 },
    { day: "SEL", calories: 1940, target: 1950 },
    { day: "RAB", calories: 1780, target: 1950 },
    { day: "KAM", calories: 1960, target: 1950 },
    { day: "JUM", calories: 1820, target: 1950 },
    { day: "SAB", calories: 2050, target: 1950 },
    { day: "HARI INI", calories: 1420, target: 1950 },
  ];

  const weightTrend = telemetry?.weight_trend || [
    { week: "MG 1", weight: 82.0 },
    { week: "MG 2", weight: 81.2 },
    { week: "MG 3", weight: 80.5 },
    { week: "MG 4", weight: 79.8 },
    { week: "MG 5", weight: 79.1 },
    { week: "MG 6", weight: 78.4 },
  ];

  const targetKcal = telemetry?.daily_target_kcal || 1950;
  const consumedKcal = telemetry?.today_consumed_kcal || 1420;
  const remainingKcal = Math.max(0, targetKcal - consumedKcal);
  const isExpired = telemetry?.program_status?.isExpired || false;

  return (
    <div className="flex flex-col min-h-screen">
      {/* 6-Month Lockout Gate Interlock */}
      <LockoutGate isExpired={isExpired} />

      {/* Slide-over Tactical Sidebar with custom sidebar-icon.png */}
      <TacticalSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* HUD Header with custom logo.png & sidebar trigger */}
      <TacticalHeader activeTab="dashboard" onOpenSidebar={() => setSidebarOpen(true)} />

      {/* Live Telemetry Ticker */}
      <TelemetryTicker />

      {/* Main HUD Viewport: Responsive 3-Column Command Center */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Dashboard Progress Title Header */}
        <div className="hud-card border rounded p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border-primary/30">
          <div>
            <span className="font-display text-base sm:text-lg font-bold hud-hero-text uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              MENU DASHBOARD & GRAFIK PROGRESS HARIAN
            </span>
            <p className="font-mono text-xs hud-text-muted mt-0.5">
              Pantau kepatuhan defisit/surplus kalori, persebaran makronutrisi, tren berat badan, dan status bio-resonansi familiar Anda.
            </p>
          </div>

          <Link
            href="/scanner"
            className="hud-clip-chamfer hud-hero-bg py-2.5 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shadow hover:opacity-90 shrink-0 text-black dark:text-black"
          >
            <span>BUKA TRACKING MAKANAN</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: HUNTER VITALITY & COMPANION (Cols 1-4)                          */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* CYBER MONSTER COMPANION CARD */}
          <div className="relative hud-card border rounded p-5 overflow-hidden group shadow-lg theme-transition">
            <div className="absolute top-2 left-2 text-outline font-mono text-[9px]">[+]</div>
            <div className="absolute top-2 right-2 text-outline font-mono text-[9px]">[+]</div>
            <div className="absolute bottom-2 left-2 text-outline font-mono text-[9px]">[+]</div>
            <div className="absolute bottom-2 right-2 text-outline font-mono text-[9px]">[+]</div>

            <div className="flex items-center justify-between mb-3 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                {isUltraman ? (
                  <Shield className="w-5 h-5 hud-beam-text" />
                ) : (
                  <Swords className="w-5 h-5 hud-beam-text" />
                )}
                <span className="font-display text-base hud-text tracking-wide font-bold">
                  {isUltraman ? "ULTRA-GUARDIAN" : "VOLT-FANG"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded border hud-border hud-hero-text hud-card-inner font-mono font-bold">
                  LVL 24
                </span>
              </div>
              <span className="font-mono text-xs hud-beam-text tracking-wider">
                {isUltraman ? "MECHA COMBAT UNIT" : "BIO-MECH FAMILIAR"}
              </span>
            </div>

            {/* Visual Companion Frame */}
            <div className="relative h-56 rounded hud-card-inner border hud-border overflow-hidden flex items-center justify-center crt-scanlines">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVO6miNoH-FgRBDaHTjNKtiRwfWLhiRklLi_OhT69Y7kJb1fyWTwgI_BrOe41ffmqCbspeXEaiRB00FttDC5urU0NEqHhNZV2Dx8ajWDz8CzofWlC1YeBesV8kmo3pmHN0Im473PLW5iWp-JcvfqbTqVxjgxhN7dor9LSL1eoTJaUo18SGAs6wCIUsN6_YEOEpYgUqGiE8B0DYLV6sZg3cncPAfffv6D2O52TcM8Q7eKICzXKMoWqo"
                alt="Tactical Familiar Creature"
                fill
                className="object-cover opacity-85 glow-companion transition-all duration-500"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

              {/* Dynamic bio-mood badges */}
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border hud-border px-2 py-1 rounded flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full hud-hero-bg animate-pulse"></span>
                <span className="font-mono text-xs hud-hero-text">
                  STATUS: SIAP TEMPUR
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-xs bg-black/85 backdrop-blur p-2 border hud-border rounded text-white">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Bonus Pertarungan</span>
                  <span className="hud-beam-text font-bold">+12% PENYERAPAN PROTEIN</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Rasio Sinkronisasi</span>
                  <span className="hud-hero-text font-bold">94.8% RESONANSI</span>
                </div>
              </div>
            </div>

            {/* Hunger & Energy Gauges */}
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1">
                  <span className="hud-text-muted flex items-center gap-1">
                    <Bolt className="w-3.5 h-3.5 hud-hero-text" />
                    ENERGI FAMILIAR
                  </span>
                  <span className="hud-hero-text font-bold">73% (TERPUASKAN)</span>
                </div>
                <div className="w-full h-2 hud-card-high rounded overflow-hidden flex gap-0.5">
                  <div className="hud-hero-bg h-full w-[73%] transition-all"></div>
                  <div className="hud-card-inner h-full flex-1"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1">
                  <span className="hud-text-muted flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 hud-beam-text" />
                    BUFFER KEKENYANGAN MAKAN
                  </span>
                  <span className="hud-beam-text font-bold">1,420 / {targetKcal} FEED UNITS</span>
                </div>
                <div className="w-full h-2 hud-card-high rounded overflow-hidden flex gap-0.5">
                  <div className="h-full w-[72.8%] transition-all" style={{ backgroundColor: "var(--beam-accent)" }}></div>
                  <div className="hud-card-inner h-full flex-1"></div>
                </div>
              </div>
            </div>
          </div>

          {/* TODAY'S CALORIE HP GAUGE CARD */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 hud-hero-text" />
                <h2 className="font-display text-base hud-text font-bold">MESIN KALORI HP</h2>
              </div>
              <span className="font-mono text-xs hud-text-muted">BATAS: {targetKcal} KCAL</span>
            </div>

            {/* Circular Arc Gauge */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-300 dark:text-slate-800"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="42"
                    stroke="currentColor"
                    strokeDasharray="264"
                    strokeDashoffset="0"
                    strokeWidth="8"
                  />
                  <circle
                    className="radial-hud-track"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="42"
                    stroke="var(--hero-accent)"
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] hud-text-muted uppercase">Terkonsumsi</span>
                  <span className="font-display text-2xl hud-hero-text font-bold leading-none">{consumedKcal}</span>
                  <span className="font-mono text-xs text-outline">KCAL</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="p-3 hud-card-inner rounded border hud-border">
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="hud-text-muted uppercase">Target Tersisa</span>
                    <span className="hud-beam-text font-bold">{remainingKcal} KCAL</span>
                  </div>
                  <div className="text-xs text-muted-foreground hud-text-muted">
                    Cadangan ransum malam untuk menjamin defisit metabolisme yang aman dan terkontrol.
                  </div>
                </div>
                <div className="flex items-center justify-between font-mono text-xs px-1">
                  <span className="hud-text-muted">TARGET PEMBAKARAN:</span>
                  <span className="hud-text font-bold font-mono">2,450 KCAL TDEE</span>
                </div>
              </div>
            </div>

            {/* Segmented Micro Status Track */}
            <div className="mt-4 pt-3 border-t hud-border flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm opacity-50 hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-card-high"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-card-high"></div>
            </div>
          </div>

          {/* MACRO BREAKDOWN METER CARD */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 hud-beam-text" />
                <h2 className="font-display text-base hud-text font-bold">TELEMETRI MAKRO</h2>
              </div>
              <span className="font-mono text-xs hud-hero-text">RASIO OPTIMAL</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="hud-beam-text flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "var(--beam-accent)" }}></span>
                    PROTEIN [PERISAI INTEGRITAS]
                  </span>
                  <span className="hud-text">145g / 160g <span className="hud-beam-text font-bold">(90%)</span></span>
                </div>
                <div className="w-full h-3 hud-card-inner rounded-sm p-0.5 border hud-border">
                  <div className="h-full rounded-sm w-[90%]" style={{ backgroundColor: "var(--beam-accent)", boxShadow: "0 0 8px rgba(77,216,247,0.4)" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="hud-sub-text flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "var(--sub-accent)" }}></span>
                    KARBOHIDRAT [MANA CADANGAN]
                  </span>
                  <span className="hud-text">130g / 180g <span className="hud-sub-text font-bold">(72%)</span></span>
                </div>
                <div className="w-full h-3 hud-card-inner rounded-sm p-0.5 border hud-border">
                  <div className="h-full rounded-sm w-[72%]" style={{ backgroundColor: "var(--sub-accent)", boxShadow: "0 0 8px rgba(221,183,255,0.3)" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="hud-hero-text flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-sm hud-hero-bg"></span>
                    LEMAK [STAMINA INTI]
                  </span>
                  <span className="hud-text">38g / 55g <span className="hud-hero-text font-bold">(69%)</span></span>
                </div>
                <div className="w-full h-3 hud-card-inner rounded-sm p-0.5 border hud-border">
                  <div className="hud-hero-bg h-full rounded-sm w-[69%]" style={{ boxShadow: "0 0 8px var(--hud-glow)" }}></div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t hud-border flex justify-between font-mono text-xs hud-text-muted">
              <span>TARGET SPLIT: 35P / 45C / 20F</span>
              <span className="hud-hero-text font-bold">STATUS: SEIMBANG</span>
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: DAILY VS TARGET ANALYTICS & WEIGHT TREND (Cols 5-8)             */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* RECHARTS: KALORI HARIAN VS TARGET */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 hud-hero-text" />
                  <h2 className="font-display text-base hud-text font-bold">KALORI HARIAN VS TARGET</h2>
                </div>
                <p className="font-mono text-[11px] hud-text-muted mt-0.5 uppercase">RADAR DEFISIT HISTORIS 7 HARI</p>
              </div>
              <span className="font-mono text-xs hud-beam-text px-2 py-0.5 rounded hud-card-inner border hud-border">
                BATAS: {targetKcal} kcal
              </span>
            </div>

            {/* Recharts Bar Chart Visualizer */}
            <DailyCalorieChart data={dailyHistory} targetKcal={targetKcal} />

            <div className="mt-3 pt-3 border-t hud-border flex items-center justify-between font-mono text-xs">
              <span className="hud-text-muted uppercase">Kepatuhan Mingguan:</span>
              <span className="hud-hero-text font-bold">85.7% TARGET TERCAPAI</span>
            </div>
          </div>

          {/* RECHARTS: TREND BERAT BADAN */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 hud-beam-text" />
                  <h2 className="font-display text-base hud-text font-bold">TREND BERAT BADAN</h2>
                </div>
                <p className="font-mono text-[11px] hud-text-muted mt-0.5 uppercase">PROGRESS KAMPANYE AKTIF</p>
              </div>
              <div className="text-right">
                <span className="font-display text-lg hud-hero-text font-bold">78.4 kg</span>
                <span className="font-mono text-xs hud-text-muted block">-3.6 kg TOTAL</span>
              </div>
            </div>

            {/* Recharts Area Chart Visualizer */}
            <WeightTrendChart data={weightTrend} />

            <div className="mt-3 pt-3 border-t hud-border flex justify-between items-center font-mono text-xs">
              <span className="hud-text-muted">SASARAN: 75.0 kg</span>
              <span className="hud-beam-text font-bold">RITME: 0.6 kg / MG (OPTIMAL)</span>
            </div>
          </div>

          {/* RECHARTS: BREAKDOWN MAKRO MINGGUAN */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 hud-sub-text" />
                <h2 className="font-display text-base hud-text font-bold">BREAKDOWN MAKRO MINGGUAN</h2>
              </div>
              <span className="font-mono text-xs hud-text-muted uppercase">AGREGAT 7 HARI</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 my-2">
              <div className="hud-card-inner p-2.5 rounded border hud-border text-center">
                <span className="font-mono text-[10px] hud-beam-text block mb-0.5 font-bold">PROTEIN</span>
                <span className="font-display text-base font-bold hud-text">1,015g</span>
                <span className="font-mono text-[9px] hud-text-muted block mt-0.5">38% total</span>
              </div>
              <div className="hud-card-inner p-2.5 rounded border hud-border text-center">
                <span className="font-mono text-[10px] hud-sub-text block mb-0.5 font-bold">KARBO</span>
                <span className="font-display text-base font-bold hud-text">1,120g</span>
                <span className="font-mono text-[9px] hud-text-muted block mt-0.5">42% total</span>
              </div>
              <div className="hud-card-inner p-2.5 rounded border hud-border text-center">
                <span className="font-mono text-[10px] hud-hero-text block mb-0.5 font-bold">LEMAK</span>
                <span className="font-display text-base font-bold hud-text">294g</span>
                <span className="font-mono text-[9px] hud-text-muted block mt-0.5">20% total</span>
              </div>
            </div>

            {/* Recharts Pie Chart Visualizer */}
            <MacroDistributionChart proteinPct={38} carbsPct={42} fatPct={20} />

            <div className="flex justify-between items-center font-mono text-xs hud-text-muted mt-2 pt-2 border-t hud-border">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--beam-accent)" }}></span> 38% P</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sub-accent)" }}></span> 42% K</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full hud-hero-bg"></span> 20% L</span>
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 3: DAILY HUNTING LOG & ACTIVE QUESTS (Cols 9-12)                   */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* LOG RANSUM TEMPUR */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 hud-hero-text" />
                <h2 className="font-display text-base hud-text font-bold">LOG RANSUM TEMPUR</h2>
              </div>
              <span className="font-mono text-xs hud-beam-text font-bold">3 TERCATAT</span>
            </div>

            <div className="space-y-3">
              <div className="hud-card-inner border hud-border rounded p-3 flex items-center justify-between hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text font-mono text-xs">
                    08:30
                  </div>
                  <div>
                    <span className="font-mono text-[11px] hud-text-muted block uppercase">Pertarungan Sarapan</span>
                    <span className="font-display text-sm hud-text font-semibold">Proto-Oat Beast</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs hud-hero-text font-bold block">420 kcal</span>
                  <span className="font-mono text-[11px] hud-beam-text">28g P • 52g K</span>
                </div>
              </div>

              <div className="hud-card-inner border hud-border rounded p-3 flex items-center justify-between hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text font-mono text-xs">
                    13:15
                  </div>
                  <div>
                    <span className="font-mono text-[11px] hud-text-muted block uppercase">Serbuan Siang</span>
                    <span className="font-display text-sm hud-text font-semibold">Cyber-Chicken Skewer</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs hud-hero-text font-bold block">680 kcal</span>
                  <span className="font-mono text-[11px] hud-beam-text">54g P • 45g K</span>
                </div>
              </div>

              <div className="hud-card-inner border hud-border rounded p-3 flex items-center justify-between hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text font-mono text-xs">
                    16:40
                  </div>
                  <div>
                    <span className="font-mono text-[11px] hud-text-muted block uppercase">Katalis Buff Energi</span>
                    <span className="font-display text-sm hud-text font-semibold">Whey Elixir of Power</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs hud-hero-text font-bold block">180 kcal</span>
                  <span className="font-mono text-[11px] hud-beam-text">30g P • 4g K</span>
                </div>
              </div>

              {/* Pending Dinner Slot */}
              <div className="hud-card-inner border border-dashed rounded p-3 flex items-center justify-between" style={{ borderColor: "var(--hero-accent)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded hud-card border border-dashed flex items-center justify-center hud-hero-text font-mono text-xs animate-pulse" style={{ borderColor: "var(--hero-accent)" }}>
                    [?]
                  </div>
                  <div>
                    <span className="font-mono text-[11px] hud-hero-text block uppercase font-bold">SLOT QUEST MAKAN MALAM</span>
                    <span className="font-display text-sm hud-text font-medium italic">Menunggu Catatan Asupan...</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs hud-beam-text font-bold block">{remainingKcal} kcal</span>
                  <span className="font-mono text-[11px] hud-text-muted">Batas Sisa</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE QUESTS */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 hud-beam-text" />
                <h2 className="font-display text-base hud-text font-bold">QUEST HUNTER AKTIF</h2>
              </div>
              <span className="font-mono text-xs hud-hero-text">REFRESH: 05:42:19</span>
            </div>

            <div className="space-y-3">
              <div className="hud-card-inner p-3.5 rounded border hud-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 mt-0.5 border hud-border flex items-center justify-center" style={{ borderColor: "var(--hero-accent)" }}>
                      <div className="w-2 h-2 hud-hero-bg"></div>
                    </div>
                    <div>
                      <h3 className="font-display text-xs hud-text font-semibold">Capai Target 150g Protein</h3>
                      <p className="text-xs text-muted-foreground hud-text-muted mt-0.5">Target: 145g tercatat / sisa 5g lagi.</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] hud-hero-text px-2 py-0.5 rounded border hud-border whitespace-nowrap" style={{ backgroundColor: "var(--tag-bg)" }}>
                    +250 EXP
                  </span>
                </div>
                <div className="w-full h-1.5 hud-card-high rounded mt-2.5 overflow-hidden">
                  <div className="hud-hero-bg h-full w-[96%]"></div>
                </div>
              </div>

              <div className="hud-card-inner p-3.5 rounded border hud-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 hud-hero-text" />
                    <div>
                      <h3 className="font-display text-xs hud-text font-semibold">Reservoir Hidrasi (2,500ml)</h3>
                      <p className="text-xs text-muted-foreground hud-text-muted mt-0.5">2,600ml tercatat. Protokol hidrasi selesai!</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] hud-beam-text px-2 py-0.5 rounded border hud-border font-bold whitespace-nowrap">
                    SELESAI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TACTICAL QUICK-ACTION BUTTONS */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <span className="font-mono text-xs hud-text-muted block uppercase tracking-wider mb-3">
              DISPATCH CEPAT TAKTIS
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href="/scanner"
                className="hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold transition-all flex items-center justify-between shadow-lg hover:opacity-90"
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  PINDAI CEPAT RANSUM
                </span>
                <span className="text-[10px] font-mono">[AI-KAMERA]</span>
              </Link>

              <button className="hud-card-inner border hud-border hud-beam-text py-3 px-4 font-mono text-xs font-bold hover:bg-sky-500/10 transition-colors flex items-center justify-between" style={{ borderColor: "var(--beam-accent)" }}>
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  CATAT AIR MINUM (+250ML)
                </span>
                <span className="text-[10px] font-mono">[HIDRASI]</span>
              </button>

              <Link
                href="/activities"
                className="hud-card-inner border hud-border hud-sub-text py-3 px-4 font-mono text-xs font-bold hover:opacity-80 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  LOG DUNGEON (LATIHAN)
                </span>
                <span className="text-[10px] font-mono">[BAKAR EXP]</span>
              </Link>
            </div>
          </div>
        </section>
        </div>
      </main>

      {/* HUD Footer */}
      <TacticalFooter />
    </div>
  );
}
