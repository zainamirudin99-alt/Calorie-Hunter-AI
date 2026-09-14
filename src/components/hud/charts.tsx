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
    <div className="h-48 w-full">
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
    <div className="h-44 w-full">
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
    <div className="h-32 w-full flex items-center justify-center">
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
