"use client";

import React from "react";
import Image from "next/image";
import { TacticalHeader } from "@/components/hud/header";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { TacticalFooter } from "@/components/hud/footer";
import { useTacticalTheme } from "@/components/theme-provider";
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
  Clock
} from "lucide-react";

export default function DashboardPage() {
  const { isUltraman } = useTacticalTheme();

  return (
    <div className="flex flex-col min-h-screen">
      {/* HUD Header */}
      <TacticalHeader activeTab="dashboard" />

      {/* Live Telemetry Ticker */}
      <TelemetryTicker />

      {/* Main HUD Viewport: Responsive 3-Column Command Center */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: HUNTER VITALITY & COMPANION (Cols 1-4)                          */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* CYBER MONSTER COMPANION CARD */}
          <div className="relative hud-card border rounded p-5 overflow-hidden group shadow-lg theme-transition">
            {/* Reticle Crosshairs corners */}
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

            {/* Hunger & Energy Telemetry Gauges */}
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
                  <span className="hud-beam-text font-bold">1,420 / 1,950 FEED UNITS</span>
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
              <span className="font-mono text-xs hud-text-muted">BATAS HARIAN: 1,950 KCAL</span>
            </div>

            {/* Circular Arc Gauge / Tactical Readout */}
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
                  <span className="font-display text-2xl hud-hero-text font-bold leading-none">1,420</span>
                  <span className="font-mono text-xs text-outline">KCAL</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="p-3 hud-card-inner rounded border hud-border">
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="hud-text-muted uppercase">Target Tersisa</span>
                    <span className="hud-beam-text font-bold">530 KCAL</span>
                  </div>
                  <div className="text-xs text-muted-foreground hud-text-muted">
                    Cadangan ransum malam untuk menjamin defisit metabolisme yang aman dan terkontrol.
                  </div>
                </div>
                <div className="flex items-center justify-between font-mono text-xs px-1">
                  <span className="hud-text-muted">TARGET PEMBAKARAN:</span>
                  <span className="hud-text font-bold">2,450 KCAL TDEE</span>
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
              {/* Protein */}
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

              {/* Carbs */}
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

              {/* Fat */}
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
          
          {/* KALORI HARIAN VS TARGET RADAR */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 hud-hero-text" />
                  <h2 className="font-display text-base hud-text font-bold">KALORI HARIAN VS TARGET</h2>
                </div>
                <p className="font-mono text-[11px] hud-text-muted mt-0.5 uppercase">RADAR DEFISIT HISTORIS 7 HARI</p>
              </div>
              <span className="font-mono text-xs hud-beam-text px-2 py-1 rounded hud-card-inner border hud-border">
                BATAS: 1,950 kcal
              </span>
            </div>

            {/* 7-Day Bar Chart Tactical Simulation */}
            <div className="relative h-60 w-full pt-4 pb-2 flex flex-col justify-between">
              {/* Target threshold line */}
              <div className="absolute left-0 right-0 top-[28%] border-b border-dashed z-10 flex justify-end" style={{ borderColor: "var(--hero-accent)" }}>
                <span className="font-mono text-[9px] hud-card px-1 hud-hero-text border hud-border mr-1 -mt-2.5">
                  BATAS: 1,950
                </span>
              </div>
              <div className="absolute left-0 right-0 top-[65%] border-b hud-border opacity-40"></div>

              {/* Chart Bars */}
              <div className="h-44 w-full grid grid-cols-7 gap-1 sm:gap-2 items-end z-0">
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] hud-text-muted">1,890</span>
                  <div className="w-full hud-card-high rounded-t hover:opacity-80 transition-colors h-[72%]"></div>
                  <span className="font-mono text-[10px] hud-text-muted">SEN</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] hud-text-muted">1,940</span>
                  <div className="w-full hud-card-high rounded-t hover:opacity-80 transition-colors h-[75%]"></div>
                  <span className="font-mono text-[10px] hud-text-muted">SEL</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] hud-text-muted">1,780</span>
                  <div className="w-full hud-card-high rounded-t hover:opacity-80 transition-colors h-[68%]"></div>
                  <span className="font-mono text-[10px] hud-text-muted">RAB</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] hud-text-muted">1,960</span>
                  <div className="w-full hud-card-high rounded-t hover:opacity-80 transition-colors h-[77%]"></div>
                  <span className="font-mono text-[10px] hud-text-muted">KAM</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] hud-text-muted">1,820</span>
                  <div className="w-full hud-card-high rounded-t hover:opacity-80 transition-colors h-[70%]"></div>
                  <span className="font-mono text-[10px] hud-text-muted">JUM</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] text-red-500 font-bold">2,050</span>
                  <div className="w-full bg-red-600/70 border border-red-500 rounded-t h-[82%]"></div>
                  <span className="font-mono text-[10px] text-red-500 font-bold">SAB</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="font-mono text-[9px] hud-hero-text font-bold">1,420</span>
                  <div className="w-full hud-hero-bg rounded-t h-[58%]" style={{ boxShadow: "0 0 12px var(--hud-glow)" }}></div>
                  <span className="font-mono text-[10px] hud-hero-text font-bold">HARI INI</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t hud-border flex items-center justify-between font-mono text-xs">
              <span className="hud-text-muted uppercase">Tingkat Kepatuhan Mingguan:</span>
              <span className="hud-hero-text font-bold">85.7% TARGET TERCAPAI</span>
            </div>
          </div>

          {/* TREND BERAT BADAN LINE GRAPH */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 hud-beam-text" />
                  <h2 className="font-display text-base hud-text font-bold">TREND BERAT BADAN</h2>
                </div>
                <p className="font-mono text-[11px] hud-text-muted mt-0.5 uppercase">PROGRESS KAMPANYE 6 MINGGU</p>
              </div>
              <div className="text-right">
                <span className="font-display text-lg hud-hero-text font-bold">78.4 kg</span>
                <span className="font-mono text-xs hud-text-muted block">-3.6 kg TOTAL</span>
              </div>
            </div>

            {/* SVG Line Graph */}
            <div className="relative h-48 w-full">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="gradWeight" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--beam-accent)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--beam-accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line stroke="var(--card-border)" strokeDasharray="4" strokeWidth="0.75" x1="0" x2="400" y1="30" y2="30" />
                <line stroke="var(--card-border)" strokeDasharray="4" strokeWidth="0.75" x1="0" x2="400" y1="70" y2="70" />
                <line stroke="var(--card-border)" strokeDasharray="4" strokeWidth="0.75" x1="0" x2="400" y1="110" y2="110" />

                <polygon fill="url(#gradWeight)" points="0,30 70,48 140,65 210,85 280,105 350,118 400,125 400,160 0,160" />
                <polyline fill="none" points="0,30 70,48 140,65 210,85 280,105 350,118 400,125" stroke="var(--beam-accent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                <circle cx="0" cy="30" fill="var(--card-bg)" r="4" stroke="var(--beam-accent)" strokeWidth="2" />
                <circle cx="70" cy="48" fill="var(--card-bg)" r="4" stroke="var(--beam-accent)" strokeWidth="2" />
                <circle cx="140" cy="65" fill="var(--card-bg)" r="4" stroke="var(--beam-accent)" strokeWidth="2" />
                <circle cx="210" cy="85" fill="var(--card-bg)" r="4" stroke="var(--beam-accent)" strokeWidth="2" />
                <circle cx="280" cy="105" fill="var(--card-bg)" r="4" stroke="var(--beam-accent)" strokeWidth="2" />
                <circle cx="350" cy="118" fill="var(--card-bg)" r="4" stroke="var(--beam-accent)" strokeWidth="2" />
                <circle cx="400" cy="125" fill="var(--hero-accent)" r="5.5" stroke="#ffffff" strokeWidth="2" />
              </svg>

              <div className="flex justify-between font-mono text-xs hud-text-muted mt-2">
                <span>MG 1 (82kg)</span>
                <span>MG 2</span>
                <span>MG 3</span>
                <span>MG 4</span>
                <span>MG 5</span>
                <span className="hud-hero-text font-bold">MG 6 (78.4kg)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t hud-border flex justify-between items-center font-mono text-xs">
              <span className="hud-text-muted">SASARAN TARGET: 75.0 kg</span>
              <span className="hud-beam-text font-bold">RITME: 0.6 kg / MINGGU (OPTIMAL)</span>
            </div>
          </div>

          {/* BREAKDOWN MAKRO MINGGUAN */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 hud-sub-text" />
                <h2 className="font-display text-base hud-text font-bold">BREAKDOWN MAKRO MINGGUAN</h2>
              </div>
              <span className="font-mono text-xs hud-text-muted uppercase">AGREGAT 7 HARI</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 my-2">
              <div className="hud-card-inner p-3 rounded border hud-border text-center">
                <span className="font-mono text-xs hud-beam-text block mb-1 font-bold">TOTAL PROTEIN</span>
                <span className="font-display text-base font-bold hud-text">1,015g</span>
                <span className="font-mono text-[10px] hud-text-muted block mt-0.5">Rata-rata 145g / hr</span>
              </div>
              <div className="hud-card-inner p-3 rounded border hud-border text-center">
                <span className="font-mono text-xs hud-sub-text block mb-1 font-bold">TOTAL KARBO</span>
                <span className="font-display text-base font-bold hud-text">1,120g</span>
                <span className="font-mono text-[10px] hud-text-muted block mt-0.5">Rata-rata 160g / hr</span>
              </div>
              <div className="hud-card-inner p-3 rounded border hud-border text-center">
                <span className="font-mono text-xs hud-hero-text block mb-1 font-bold">TOTAL LEMAK</span>
                <span className="font-display text-base font-bold hud-text">294g</span>
                <span className="font-mono text-[10px] hud-text-muted block mt-0.5">Rata-rata 42g / hr</span>
              </div>
            </div>

            <div className="w-full mt-3">
              <div className="w-full h-3 rounded overflow-hidden flex border hud-border">
                <div className="h-full w-[38%]" style={{ backgroundColor: "var(--beam-accent)" }} title="Protein 38%"></div>
                <div className="h-full w-[42%]" style={{ backgroundColor: "var(--sub-accent)" }} title="Karbohidrat 42%"></div>
                <div className="hud-hero-bg h-full w-[20%]" title="Lemak 20%"></div>
              </div>
              <div className="flex justify-between items-center font-mono text-xs hud-text-muted mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--beam-accent)" }}></span> 38% P
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sub-accent)" }}></span> 42% K
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full hud-hero-bg"></span> 20% L
                </span>
              </div>
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
              <span className="font-mono text-xs hud-beam-text font-bold">3 TERCATAT // 1 TERTUNDA</span>
            </div>

            <div className="space-y-3">
              {/* Sarapan */}
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

              {/* Makan Siang */}
              <div className="hud-card-inner border hud-border rounded p-3 flex items-center justify-between hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text font-mono text-xs">
                    13:15
                  </div>
                  <div>
                    <span className="font-mono text-[11px] hud-text-muted block uppercase">Serbuan Siang</span>
                    <span className="font-display text-sm hud-text font-semibold">Cyber-Chicken Skewer Legion</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs hud-hero-text font-bold block">680 kcal</span>
                  <span className="font-mono text-[11px] hud-beam-text">54g P • 45g K</span>
                </div>
              </div>

              {/* Snack */}
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

              {/* Makan Malam Slot */}
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
                  <span className="font-mono text-xs hud-beam-text font-bold block">530 kcal</span>
                  <span className="font-mono text-[11px] hud-text-muted">Batas Tersisa</span>
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
                    <div className="w-4 h-4 mt-0.5 border hud-border flex items-center justify-center"></div>
                    <div>
                      <h3 className="font-display text-xs hud-text font-semibold">Jaga Kalori Dalam Rentang ±50 kcal</h3>
                      <p className="text-xs text-muted-foreground hud-text-muted mt-0.5">Sinkronisasi ransum akhir di 1,900-2,000 kcal.</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] hud-sub-text px-2 py-0.5 rounded border hud-border whitespace-nowrap">
                    +500 KOIN
                  </span>
                </div>
                <div className="w-full h-1.5 hud-card-high rounded mt-2.5 overflow-hidden">
                  <div className="h-full w-[72%]" style={{ backgroundColor: "var(--sub-accent)" }}></div>
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
              <button className="hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold transition-all flex items-center justify-between shadow-lg hover:opacity-90">
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  PINDAI CEPAT RANSUM
                </span>
                <span className="text-[10px] font-mono">[AI-KAMERA]</span>
              </button>

              <button className="hud-card-inner border hud-border hud-beam-text py-3 px-4 font-mono text-xs font-bold hover:bg-sky-500/10 transition-colors flex items-center justify-between" style={{ borderColor: "var(--beam-accent)" }}>
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  CATAT AIR MINUM (+250ML)
                </span>
                <span className="text-[10px] font-mono">[HIDRASI]</span>
              </button>

              <button className="hud-card-inner border hud-border hud-sub-text py-3 px-4 font-mono text-xs font-bold hover:opacity-80 transition-colors flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  LOG DUNGEON (LATIHAN)
                </span>
                <span className="text-[10px] font-mono">[BAKAR EXP]</span>
              </button>
            </div>
          </div>

        </section>
      </main>

      {/* HUD Footer */}
      <TacticalFooter />
    </div>
  );
}
