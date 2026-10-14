"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useTacticalTheme } from "@/components/theme-provider";

interface DailyCalorieChartProps {
  data: Array<{ day: string; calories: number; target: number }>;
  targetKcal: number;
}

export function DailyCalorieChart({ data, targetKcal }: DailyCalorieChartProps) {
  const { isUltraman } = useTacticalTheme();
  const heroColor = isUltraman ? "#ef4444" : "#4be277";

  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
          <XAxis 
            dataKey="day" 
            tick={{ fill: "#869585", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: "#869585", fontSize: 9, fontFamily: "monospace" }}
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
            domain={[0, 2500]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#0a0e18", 
              borderColor: "var(--card-border)", 
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#dfe2f1"
            }}
            formatter={(val: any) => [`${val} kcal`, "Asupan"]}
          />
          <ReferenceLine 
            y={targetKcal} 
            stroke={heroColor} 
            strokeDasharray="3 3" 
            label={{ value: `BATAS: ${targetKcal}`, fill: heroColor, fontSize: 9, position: "top" }} 
          />
          <Bar 
            dataKey="calories" 
            fill={heroColor} 
            radius={[3, 3, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface WeightTrendChartProps {
  data: Array<{ week: string; weight: number }>;
}

export function WeightTrendChart({ data }: WeightTrendChartProps) {
  const { isUltraman } = useTacticalTheme();
  const beamColor = isUltraman ? "#0284c7" : "#00f0ff";

  return (
    <div className="h-44 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={beamColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={beamColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="week" 
            tick={{ fill: "#869585", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
          />
          <YAxis 
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fill: "#869585", fontSize: 9, fontFamily: "monospace" }}
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#0a0e18", 
              borderColor: "var(--card-border)", 
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#dfe2f1"
            }}
            formatter={(val: any) => [`${val} kg`, "Berat Badan"]}
          />
          <Area 
            type="monotone" 
            dataKey="weight" 
            stroke={beamColor} 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#weightGrad)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MacroPieChartProps {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export function MacroDistributionChart({ proteinPct, carbsPct, fatPct }: MacroPieChartProps) {
  const { isUltraman } = useTacticalTheme();
  const proteinColor = isUltraman ? "#0284c7" : "#00f0ff";
  const carbsColor = isUltraman ? "#ddb7ff" : "#ddb7ff";
  const fatColor = isUltraman ? "#ef4444" : "#4be277";

  const data = [
    { name: "Protein", value: proteinPct, color: proteinColor },
    { name: "Karbohidrat", value: carbsPct, color: carbsColor },
    { name: "Lemak", value: fatPct, color: fatColor },
  ];

  return (
    <div className="h-32 w-full min-w-0 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={30}
            outerRadius={48}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#0a0e18", 
              borderColor: "var(--card-border)", 
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#dfe2f1"
            }}
            formatter={(val: any) => [`${val}%`, "Proporsi"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface WorkoutChartItem {
  label: string;
  fullLabel?: string;
  calories: number;
  duration_minutes: number;
  sessions?: number;
}

export interface WorkoutBurnChartProps {
  data: WorkoutChartItem[];
  period: "daily" | "weekly" | "monthly";
}

export function WorkoutBurnChart({ data, period }: WorkoutBurnChartProps) {
  const { isUltraman } = useTacticalTheme();
  const fireColor = isUltraman ? "#ef4444" : "#f97316";
  const glowColor = isUltraman ? "#fbbf24" : "#fb923c";

  // Calculate max for dynamic Y-axis scaling
  const maxCalories = Math.max(500, ...data.map((d) => d.calories || 0));
  const yDomainMax = Math.ceil((maxCalories * 1.15) / 100) * 100;

  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="workoutBurnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fireColor} stopOpacity={1} />
              <stop offset="100%" stopColor={glowColor} stopOpacity={0.65} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="label" 
            tick={{ fill: "#869585", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: "#869585", fontSize: 9, fontFamily: "monospace" }}
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
            domain={[0, yDomainMax]}
          />
          <Tooltip 
            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as WorkoutChartItem;
                return (
                  <div className="hud-card-high border hud-border p-2.5 rounded shadow-xl font-mono text-[11px] space-y-1">
                    <span className="text-white font-bold block border-b hud-border pb-1">
                      {item.fullLabel || item.label}
                    </span>
                    <div className="flex items-center justify-between gap-3 text-orange-400 font-bold">
                      <span>TERBAKAR:</span>
                      <span>{item.calories} KCAL</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-cyan-400">
                      <span>DURASI:</span>
                      <span>{item.duration_minutes} MNT</span>
                    </div>
                    {typeof item.sessions === "number" && (
                      <div className="flex items-center justify-between gap-3 text-slate-400">
                        <span>SESI LATIHAN:</span>
                        <span>{item.sessions} SESI</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="calories" 
            fill="url(#workoutBurnGrad)" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
