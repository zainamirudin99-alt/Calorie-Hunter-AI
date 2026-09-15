"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  Camera, 
  Type, 
  Upload, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Flame, 
  Shield, 
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  Utensils,
  ScanLine
} from "lucide-react";

interface LoggedFoodItem {
  id: string;
  food_name: string;
  estimated_weight_g: number;
  calories_kcal: number;
  time_logged: string;
  meal_slot: string;
  macros: {
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  micros?: {
    sodium_mg?: number;
    potassium_mg?: number;
    vitamin_c_mg?: number;
  };
}

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const dayName = days[dateObj.getDay()];
  const dateNum = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  const yearNum = dateObj.getFullYear();

  const todayStr = getTodayString();
  let badge = "";
  if (dateStr === todayStr) badge = " (Hari Ini)";
  else {
    const today = new Date();
    const target = new Date(y, m - 1, d);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) badge = " (Besok)";
    else if (diffDays === -1) badge = " (Kemarin)";
  }

  return `${dayName}, ${dateNum} ${monthName} ${yearNum}${badge}`;
}

function shiftDateBy(dateStr: string, offset: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + offset);
  const nextY = dateObj.getFullYear();
  const nextM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const nextD = String(dateObj.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

export default function TrackingMakananPage() {
  const { isUltraman } = useTacticalTheme();

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Input & Camera State
  const [inputMode, setInputMode] = useState<"photo" | "manual_text">("photo");
  const [manualText, setManualText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Analysis & Loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [editablePreviewItems, setEditablePreviewItems] = useState<any[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Program & Targets (TDEE from chosen program)
  const [activeProgramName, setActiveProgramName] = useState<string>("Cutting Protocol (-20%)");
  const [dailyTargetKcal, setDailyTargetKcal] = useState<number>(1950);
  const [targetProteinG, setTargetProteinG] = useState<number>(150);
  const [targetCarbsG, setTargetCarbsG] = useState<number>(195);
  const [targetFatG, setTargetFatG] = useState<number>(54);

  // Logs stored by date
  const [logsByDate, setLogsByDate] = useState<Record<string, LoggedFoodItem[]>>({});

  // Item currently being edited
  const [editingItem, setEditingItem] = useState<LoggedFoodItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load active program & stored logs on mount
  useEffect(() => {
    // 1. Program loading
    const savedProg = localStorage.getItem("chai_active_program");
    if (savedProg) {
      try {
        const prog = JSON.parse(savedProg);
        if (prog.target_daily_kcal) {
          const target = Number(prog.target_daily_kcal);
          setDailyTargetKcal(target);
          const pType = (prog.program_type || "cutting").toLowerCase();
          if (pType === "bulking") {
            setActiveProgramName("Bulking Power Surge (+15%)");
            setTargetProteinG(Math.round((target * 0.25) / 4));
            setTargetCarbsG(Math.round((target * 0.55) / 4));
            setTargetFatG(Math.round((target * 0.20) / 9));
          } else if (pType === "maintenance") {
            setActiveProgramName("Maintenance Defense (0%)");
            setTargetProteinG(Math.round((target * 0.30) / 4));
            setTargetCarbsG(Math.round((target * 0.45) / 4));
            setTargetFatG(Math.round((target * 0.25) / 9));
          } else {
            setActiveProgramName("Cutting Protocol (-20%)");
            setTargetProteinG(Math.round((target * 0.35) / 4));
            setTargetCarbsG(Math.round((target * 0.40) / 4));
            setTargetFatG(Math.round((target * 0.25) / 9));
          }
        }
      } catch {}
    }

    // 2. Food logs loading
    const savedLogs = localStorage.getItem("chai_food_logs_by_date");
    const today = getTodayString();
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        // If today has no logs yet, seed default tactical meals
        if (!parsed[today] || parsed[today].length === 0) {
          parsed[today] = [
            {
              id: "seed-1",
              food_name: "Proto-Oat Beast (Oatmeal + Telur Rebus)",
              estimated_weight_g: 180,
              calories_kcal: 420,
              time_logged: "08:30 WIB",
              meal_slot: "Sarapan",
              macros: { carbs_g: 52, protein_g: 28, fat_g: 10, fiber_g: 4 },
              micros: { sodium_mg: 120, potassium_mg: 230, vitamin_c_mg: 2 },
            },
            {
              id: "seed-2",
              food_name: "Cyber-Chicken Skewer (Dada Ayam + Nasi Merah)",
              estimated_weight_g: 300,
              calories_kcal: 680,
              time_logged: "13:15 WIB",
              meal_slot: "Makan Siang",
              macros: { carbs_g: 65, protein_g: 54, fat_g: 18, fiber_g: 5 },
              micros: { sodium_mg: 450, potassium_mg: 380, vitamin_c_mg: 15 },
            },
            {
              id: "seed-3",
              food_name: "Whey Elixir of Power",
              estimated_weight_g: 250,
              calories_kcal: 180,
              time_logged: "16:48 WIB",
              meal_slot: "Katalis Sore",
              macros: { carbs_g: 4, protein_g: 30, fat_g: 2, fiber_g: 0 },
              micros: { sodium_mg: 110, potassium_mg: 140, vitamin_c_mg: 0 },
            }
          ];
        }
        setLogsByDate(parsed);
      } catch {
        // Fallback default
        setLogsByDate({
          [today]: [
            {
              id: "seed-1",
              food_name: "Proto-Oat Beast (Oatmeal + Telur Rebus)",
              estimated_weight_g: 180,
              calories_kcal: 420,
              time_logged: "08:30 WIB",
              meal_slot: "Sarapan",
              macros: { carbs_g: 52, protein_g: 28, fat_g: 10, fiber_g: 4 },
              micros: { sodium_mg: 120, potassium_mg: 230, vitamin_c_mg: 2 },
            }
          ]
        });
      }
    } else {
      const initialMap = {
        [today]: [
          {
            id: "seed-1",
            food_name: "Proto-Oat Beast (Oatmeal + Telur Rebus)",
            estimated_weight_g: 180,
            calories_kcal: 420,
            time_logged: "08:30 WIB",
            meal_slot: "Sarapan",
            macros: { carbs_g: 52, protein_g: 28, fat_g: 10, fiber_g: 4 },
            micros: { sodium_mg: 120, potassium_mg: 230, vitamin_c_mg: 2 },
          },
          {
            id: "seed-2",
            food_name: "Cyber-Chicken Skewer (Dada Ayam + Nasi Merah)",
            estimated_weight_g: 300,
            calories_kcal: 680,
            time_logged: "13:15 WIB",
            meal_slot: "Makan Siang",
            macros: { carbs_g: 65, protein_g: 54, fat_g: 18, fiber_g: 5 },
            micros: { sodium_mg: 450, potassium_mg: 380, vitamin_c_mg: 15 },
          },
          {
            id: "seed-3",
            food_name: "Whey Elixir of Power",
            estimated_weight_g: 250,
            calories_kcal: 180,
            time_logged: "16:48 WIB",
            meal_slot: "Katalis Sore",
            macros: { carbs_g: 4, protein_g: 30, fat_g: 2, fiber_g: 0 },
            micros: { sodium_mg: 110, potassium_mg: 140, vitamin_c_mg: 0 },
          }
        ]
      };
      setLogsByDate(initialMap);
      localStorage.setItem("chai_food_logs_by_date", JSON.stringify(initialMap));
    }

    // 3. Check quick mobile camera capture
    const quickCapture = sessionStorage.getItem("chai_quick_capture");
    if (quickCapture) {
      setPreviewUrl(quickCapture);
      setInputMode("photo");
      fetch(quickCapture)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "mobile-camera-capture.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
        })
        .catch(() => {});
      sessionStorage.removeItem("chai_quick_capture");
    }
  }, []);

  // Save logs to localStorage helper
  const persistLogs = (updated: Record<string, LoggedFoodItem[]>) => {
    setLogsByDate(updated);
    localStorage.setItem("chai_food_logs_by_date", JSON.stringify(updated));
  };

  // Compute stats for currently selectedDate
  const currentDayLogs = logsByDate[selectedDate] || [];
  const dayConsumedKcal = currentDayLogs.reduce((sum, item) => sum + (item.calories_kcal || 0), 0);
  const dayConsumedProtein = currentDayLogs.reduce((sum, item) => sum + (item.macros?.protein_g || 0), 0);
  const dayConsumedCarbs = currentDayLogs.reduce((sum, item) => sum + (item.macros?.carbs_g || 0), 0);
  const dayConsumedFat = currentDayLogs.reduce((sum, item) => sum + (item.macros?.fat_g || 0), 0);
  const dayConsumedSodium = currentDayLogs.reduce((sum, item) => sum + (item.micros?.sodium_mg || 0), 0);
  const dayConsumedPotassium = currentDayLogs.reduce((sum, item) => sum + (item.micros?.potassium_mg || 0), 0);
  const dayConsumedVitC = currentDayLogs.reduce((sum, item) => sum + (item.micros?.vitamin_c_mg || 0), 0);

  const remainingKcal = Math.max(0, dailyTargetKcal - dayConsumedKcal);
  const pctConsumed = Math.min(100, Math.round((dayConsumedKcal / (dailyTargetKcal || 1)) * 100));

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setManualText("");
    }
  };

  const handleTextChange = (text: string) => {
    setManualText(text);
    if (text.trim().length > 0) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const canProcess = (inputMode === "photo" && selectedFile) || (inputMode === "manual_text" && manualText.trim().length > 0);

  // Send to AI for Nutrition analysis (action: "analyze" only, no DB commit yet)
  const handleProcessAI = async () => {
    if (!canProcess) return;
    setLoading(true);
    setErrorMsg(null);
    setActionFeedback(null);

    const formData = new FormData();
    formData.append("action", "analyze");
    if (inputMode === "photo" && selectedFile) {
      formData.append("photo", selectedFile);
    } else if (inputMode === "manual_text" && manualText.trim()) {
      formData.append("raw_text_input", manualText.trim());
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menganalisis makanan");
      }

      const rawItems = data.preview?.items || data.data?.items || [];
      const formattedItems = rawItems.map((item: any) => ({
        food_name: item.food_name || "Makanan",
        estimated_weight_g: Number(item.estimated_weight_g) || 150,
        calories_kcal: Number(item.calories_kcal) || 200,
        macros: {
          carbs_g: Number(item.macros?.carbs_g) || 0,
          protein_g: Number(item.macros?.protein_g) || 0,
          fat_g: Number(item.macros?.fat_g) || 0,
          fiber_g: Number(item.macros?.fiber_g) || 0,
          sugar_g: Number(item.macros?.sugar_g) || 0,
        },
        micros: item.micros || {},
      }));

      setAnalysisResult(data);
      setEditablePreviewItems(formattedItems);

      if (data.is_fallback) {
        setActionFeedback({
          type: "error",
          msg: "AI mengalami kendala/kuota terlampaui. Menampilkan estimasi awal yang dapat Anda edit sebelum disimpan.",
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses analisis sensor AI");
    } finally {
      setLoading(false);
    }
  };

  // Helper to update a preview item field (name, grams, etc.)
  const handleUpdatePreviewItem = (index: number, field: string, val: any) => {
    setEditablePreviewItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };

      if (field === "estimated_weight_g") {
        const newWeight = Math.max(1, Number(val) || 1);
        const oldWeight = target.estimated_weight_g || 1;
        const ratio = newWeight / oldWeight;
        target.estimated_weight_g = newWeight;
        target.calories_kcal = Math.round(target.calories_kcal * ratio);
        target.macros = {
          carbs_g: Math.round(target.macros.carbs_g * ratio),
          protein_g: Math.round(target.macros.protein_g * ratio),
          fat_g: Math.round(target.macros.fat_g * ratio),
          fiber_g: Math.round((target.macros.fiber_g || 0) * ratio),
          sugar_g: Math.round((target.macros.sugar_g || 0) * ratio),
        };
      } else if (field === "food_name") {
        target.food_name = val;
      } else if (field === "calories_kcal") {
        target.calories_kcal = Number(val) || 0;
      }

      copy[index] = target;
      return copy;
    });
  };

  const handleRemovePreviewItem = (index: number) => {
    setEditablePreviewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPreviewItem = () => {
    setEditablePreviewItems((prev) => [
      ...prev,
      {
        food_name: "Item Tambahan",
        estimated_weight_g: 100,
        calories_kcal: 150,
        macros: { carbs_g: 15, protein_g: 10, fat_g: 5, fiber_g: 1, sugar_g: 1 },
        micros: {},
      },
    ]);
  };

  // Save analyzed and verified result into selectedDate + commit to DB
  const handleSaveAnalyzedFood = async () => {
    if (editablePreviewItems.length === 0) return;

    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      // Commit to Database
      await fetch("/api/food-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "save",
          items: editablePreviewItems,
          photo_url: analysisResult?.photo_url || null,
          input_type: inputMode,
          raw_text_input: manualText || null,
          log_date: selectedDate,
        }),
      });

      const currentTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
      const newItems: LoggedFoodItem[] = editablePreviewItems.map((item: any, idx: number) => ({
        id: "log-" + Date.now() + "-" + idx,
        food_name: item.food_name,
        estimated_weight_g: item.estimated_weight_g || 150,
        calories_kcal: item.calories_kcal || 200,
        time_logged: currentTime,
        meal_slot: "Ransum Tempur",
        macros: {
          carbs_g: item.macros?.carbs_g || 0,
          protein_g: item.macros?.protein_g || 0,
          fat_g: item.macros?.fat_g || 0,
          fiber_g: item.macros?.fiber_g || 0,
          sugar_g: item.macros?.sugar_g || 0,
        },
        micros: item.micros || {},
      }));

      const updated = {
        ...logsByDate,
        [selectedDate]: [...(logsByDate[selectedDate] || []), ...newItems],
      };

      persistLogs(updated);
      setAnalysisResult(null);
      setEditablePreviewItems([]);
      setSelectedFile(null);
      setPreviewUrl(null);
      setManualText("");
      setActionFeedback({
        type: "success",
        msg: `Berhasil menyimpan ${newItems.length} item ke catatan ${formatIndonesianDate(selectedDate)}!`,
      });
    } catch {
      // Still persist locally even if network fails
      const currentTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
      const newItems: LoggedFoodItem[] = editablePreviewItems.map((item: any, idx: number) => ({
        id: "log-" + Date.now() + "-" + idx,
        food_name: item.food_name,
        estimated_weight_g: item.estimated_weight_g || 150,
        calories_kcal: item.calories_kcal || 200,
        time_logged: currentTime,
        meal_slot: "Ransum Tempur",
        macros: {
          carbs_g: item.macros?.carbs_g || 0,
          protein_g: item.macros?.protein_g || 0,
          fat_g: item.macros?.fat_g || 0,
          fiber_g: item.macros?.fiber_g || 0,
          sugar_g: item.macros?.sugar_g || 0,
        },
        micros: item.micros || {},
      }));

      const updated = {
        ...logsByDate,
        [selectedDate]: [...(logsByDate[selectedDate] || []), ...newItems],
      };
      persistLogs(updated);
      setAnalysisResult(null);
      setEditablePreviewItems([]);
      setSelectedFile(null);
      setPreviewUrl(null);
      setManualText("");
      setActionFeedback({
        type: "success",
        msg: `Disimpan ke memori lokal: ${newItems.length} item pada ${formatIndonesianDate(selectedDate)}!`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Edit item handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const dayItems = logsByDate[selectedDate] || [];
    const updatedItems = dayItems.map(item => item.id === editingItem.id ? editingItem : item);
    const updated = { ...logsByDate, [selectedDate]: updatedItems };

    persistLogs(updated);
    setEditingItem(null);
    setActionFeedback({
      type: "success",
      msg: "Perubahan item makanan berhasil diperbarui!",
    });
  };

  // Delete item handler
  const handleDeleteItem = (id: string) => {
    const dayItems = logsByDate[selectedDate] || [];
    const updatedItems = dayItems.filter(item => item.id !== id);
    const updated = { ...logsByDate, [selectedDate]: updatedItems };

    persistLogs(updated);
    setActionFeedback({
      type: "success",
      msg: "Item makanan berhasil dihapus dari tanggal ini.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="scanner" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-8 space-y-5 sm:space-y-6">
        
        {/* ========================================================================= */}
        {/* HEADER: DATE NAVIGATION (TANGGAL, BULAN, TAHUN - BISA BESOK / KEMARIN)    */}
        {/* ========================================================================= */}
        <div className="hud-card border rounded p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-primary/40 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 hud-hero-text" />
              <span className="font-display text-xs sm:text-sm font-bold hud-hero-text uppercase tracking-wider">
                LOG HARIAN NUTRISI & MAKANAN
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded hud-card-inner border hud-border hud-beam-text font-bold">
                {activeProgramName}
              </span>
            </div>
            <h2 className="font-mono text-base sm:text-lg font-bold hud-text">
              {formatIndonesianDate(selectedDate)}
            </h2>
            <p className="font-mono text-[11px] text-outline">
              Anda bisa mencatat makanan untuk hari ini, merencanakan hari besok, atau mengoreksi hari sebelumnya.
            </p>
          </div>

          {/* Date Switcher Controls */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            <button
              onClick={() => setSelectedDate(shiftDateBy(selectedDate, -1))}
              className="px-3 py-1.5 rounded hud-card-inner border hud-border hover:border-primary flex items-center gap-1 transition-all"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kemarin</span>
            </button>

            {/* Native Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded hud-card-high border hud-border font-mono text-xs hud-text focus:outline-none focus:border-primary cursor-pointer"
            />

            <button
              onClick={() => setSelectedDate(shiftDateBy(selectedDate, 1))}
              className="px-3 py-1.5 rounded hud-card-inner border hud-border hover:border-primary flex items-center gap-1 transition-all"
              title="Hari Berikutnya"
            >
              <span>Besok</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDate !== getTodayString() && (
              <button
                onClick={() => setSelectedDate(getTodayString())}
                className="px-2.5 py-1.5 rounded hud-hero-bg text-black dark:text-black font-bold text-[10px] uppercase shadow"
              >
                Hari Ini
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DAILY CALORIE BUDGET & MACRO/MICRO TELEMETRY BAR                          */}
        {/* ========================================================================= */}
        <div className="hud-card border rounded p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b hud-border pb-3 font-mono">
            <div className="flex items-center gap-2.5">
              <Flame className="w-6 h-6 hud-hero-text animate-pulse" />
              <div>
                <span className="text-xs font-bold hud-text uppercase block">
                  BATAS KALORI HARIAN: {dailyTargetKcal} KCAL
                </span>
                <span className="text-[11px] text-outline block">
                  Target ({dailyTargetKcal} kcal) - Kalori Masuk ({dayConsumedKcal} kcal) = Sisa ({remainingKcal} kcal)
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-base font-bold font-display hud-hero-text">
                {remainingKcal} KCAL TERSISA
              </span>
              <span className="text-[10px] text-outline block">
                {dayConsumedKcal} / {dailyTargetKcal} kcal ({pctConsumed}% terpakai)
              </span>
            </div>
          </div>

          {/* Calorie Progress Bar */}
          <div className="w-full h-3.5 rounded-full hud-card-inner border hud-border overflow-hidden p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                dayConsumedKcal > dailyTargetKcal ? "bg-red-500" : "hud-hero-bg"
              }`}
              style={{ width: `${Math.min(100, pctConsumed)}%` }}
            />
          </div>

          {/* Macro Breakdown Progress Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
            {/* Protein */}
            <div className="p-3 rounded hud-card-inner border hud-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-outline uppercase font-bold">Protein</span>
                <span className="font-bold hud-beam-text">{dayConsumedProtein}g / {targetProteinG}g</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 rounded-full" 
                  style={{ width: `${Math.min(100, Math.round((dayConsumedProtein / (targetProteinG || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Karbohidrat */}
            <div className="p-3 rounded hud-card-inner border hud-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-outline uppercase font-bold">Karbohidrat</span>
                <span className="font-bold hud-sub-text">{dayConsumedCarbs}g / {targetCarbsG}g</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full" 
                  style={{ width: `${Math.min(100, Math.round((dayConsumedCarbs / (targetCarbsG || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Lemak */}
            <div className="p-3 rounded hud-card-inner border hud-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-outline uppercase font-bold">Lemak Sehat</span>
                <span className="font-bold hud-hero-text">{dayConsumedFat}g / {targetFatG}g</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full" 
                  style={{ width: `${Math.min(100, Math.round((dayConsumedFat / (targetFatG || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Mikronutrisi Summary */}
            <div className="p-3 rounded hud-card-inner border hud-border space-y-1">
              <span className="text-[10px] text-outline uppercase font-bold block">Mikronutrisi</span>
              <div className="text-[10px] space-y-0.5 text-slate-300">
                <div>Natrium: <strong>{dayConsumedSodium}mg</strong> / 2300mg</div>
                <div>Kalium: <strong>{dayConsumedPotassium}mg</strong> / 3400mg</div>
                <div>Vit C: <strong>{dayConsumedVitC}mg</strong> / 90mg</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className={`p-3 rounded font-mono text-xs flex items-center justify-between gap-2 ${
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
              : "bg-red-500/10 border border-red-500/40 text-red-400"
          }`}>
            <div className="flex items-center gap-2">
              {actionFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{actionFeedback.msg}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="text-outline hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2-COLUMN MAIN INTERACTION: INPUT SENSOR AI (LEFT) vs LOGGED MEALS (RIGHT) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: AI TRACKING INPUT SENSOR (Cols 1-6) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="hud-card border rounded p-5 relative shadow-xl theme-transition">
              <div className="flex items-center justify-between border-b hud-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 hud-hero-text" />
                  <h3 className="font-display text-sm font-bold hud-text uppercase">
                    INPUT RANSUM KE TANGGAL: {selectedDate}
                  </h3>
                </div>
                <span className="font-mono text-[10px] hud-beam-text border hud-border px-2 py-0.5 rounded hud-card-inner font-bold">
                  GEMINI 3.8 FLASH
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded hud-card-inner border hud-border mb-4">
                <button
                  type="button"
                  onClick={() => { setInputMode("photo"); setManualText(""); }}
                  className={`py-2 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 rounded ${
                    inputMode === "photo" ? "hud-hero-bg shadow" : "hud-text-muted hover:hud-text"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>PINDAI FOTO</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode("manual_text"); setSelectedFile(null); setPreviewUrl(null); }}
                  className={`py-2 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 rounded ${
                    inputMode === "manual_text" ? "hud-hero-bg shadow" : "hud-text-muted hover:hud-text"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>TEKS MANUAL</span>
                </button>
              </div>

              {/* Photo Upload Area */}
              {inputMode === "photo" && (
                <div className="space-y-4">
                  <div 
                    onClick={() => !previewUrl && cameraInputRef.current?.click()}
                    className={`border-2 border-dashed hud-border rounded p-6 text-center hover:border-primary/60 transition-colors relative crt-scanlines overflow-hidden ${
                      !previewUrl ? "cursor-pointer active:scale-[0.99]" : ""
                    }`}
                  >
                    {previewUrl ? (
                      <div className="relative h-60 w-full rounded overflow-hidden">
                        <img
                          src={previewUrl}
                          alt="Foto Makanan"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}
                          className="absolute top-2 right-2 px-2.5 py-1 rounded bg-black/85 font-mono text-[10px] text-white border hud-border hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          GANTI FOTO
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full hud-card-inner border hud-border flex items-center justify-center hud-hero-text">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="font-mono text-xs">
                          <span className="hud-text font-bold block">BIDIK ATAU UNGGAH RANSUM</span>
                          <span className="text-[10px] text-outline block mt-0.5">
                            Ketuk untuk langsung buka Kamera HP atau pilih foto
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File Input for Gallery */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Native Mobile Camera Input with capture="environment" */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 rounded hud-card-high border hud-border font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 hover:border-primary transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>PILIH GALERI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2.5 px-3 rounded hud-card-high border border-emerald-500/50 bg-emerald-500/10 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 hover:border-emerald-400 transition-all text-emerald-400 cursor-pointer shadow-md active:scale-98"
                    >
                      <Camera className="w-4 h-4" />
                      <span>KAMERA HP</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Text Input Area */}
              {inputMode === "manual_text" && (
                <div className="space-y-3">
                  <label className="block font-mono text-xs hud-text-muted uppercase">
                    Deskripsikan Menu Makanan:
                  </label>
                  <textarea
                    rows={4}
                    value={manualText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Contoh: 1 piring nasi putih (200g) + dada ayam bakar kecap (150g) + tahu goreng 2 buah"
                    className="w-full p-3 rounded hud-card-inner border hud-border font-mono text-xs hud-text focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {/* Submit Process Button */}
              <button
                type="button"
                onClick={handleProcessAI}
                disabled={!canProcess || loading}
                className="w-full hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-40 mt-4 cursor-pointer"
              >
                {loading ? (
                  <span>MEMPROSES SENSOR AI GIZI...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>ANALISIS RANSUM DENGAN AI</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("manual_text");
                      setErrorMsg(null);
                    }}
                    className="w-full py-1.5 px-3 rounded hud-card-high border border-primary/40 font-mono text-[11px] hud-hero-text font-bold uppercase hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>BERALIH KE INPUT TEKS MANUAL</span>
                  </button>
                </div>
              )}

              {/* AI Analysis Preview (EDITABLE) Before Confirming Save */}
              {editablePreviewItems.length > 0 && (
                <div className="mt-5 p-4 rounded hud-card-inner border-2 border-primary/50 space-y-3 bg-primary/5">
                  <div className="flex items-center justify-between border-b hud-border pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold hud-hero-text block">
                        PREVIEW ANALISIS SENSOR (BISA DIEDIT):
                      </span>
                      <span className="text-[10px] text-outline block">
                        Koreksi nama atau porsi gram jika estimasi AI sedikit meleset.
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold hud-text">
                      TOTAL {editablePreviewItems.reduce((acc, it) => acc + (Number(it.calories_kcal) || 0), 0)} KCAL
                    </span>
                  </div>

                  {/* Editable Items List */}
                  <div className="space-y-2.5">
                    {editablePreviewItems.map((item: any, i: number) => (
                      <div key={i} className="p-2.5 rounded hud-card border hud-border font-mono text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.food_name}
                            onChange={(e) => handleUpdatePreviewItem(i, "food_name", e.target.value)}
                            placeholder="Nama Makanan"
                            className="flex-1 px-2 py-1 rounded hud-card-inner border hud-border font-bold hud-text text-xs focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewItem(i)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20"
                            title="Hapus Item Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-outline text-[10px] uppercase">Berat:</span>
                            <input
                              type="number"
                              min={1}
                              value={item.estimated_weight_g}
                              onChange={(e) => handleUpdatePreviewItem(i, "estimated_weight_g", e.target.value)}
                              className="w-16 px-1.5 py-0.5 rounded hud-card-inner border hud-border text-center font-bold hud-text focus:outline-none focus:border-primary"
                            />
                            <span className="text-[10px] text-outline">gram</span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-outline text-[10px] uppercase">Kalori:</span>
                            <input
                              type="number"
                              min={0}
                              value={item.calories_kcal}
                              onChange={(e) => handleUpdatePreviewItem(i, "calories_kcal", e.target.value)}
                              className="w-16 px-1.5 py-0.5 rounded hud-card-inner border hud-border text-center font-bold hud-hero-text focus:outline-none focus:border-primary"
                            />
                            <span className="text-[10px] hud-hero-text">kcal</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-outline flex items-center gap-3 pt-1 border-t hud-border">
                          <span>P: <strong className="hud-beam-text">{item.macros?.protein_g || 0}g</strong></span>
                          <span>C: <strong className="hud-sub-text">{item.macros?.carbs_g || 0}g</strong></span>
                          <span>F: <strong className="hud-hero-text">{item.macros?.fat_g || 0}g</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add extra item button */}
                  <button
                    type="button"
                    onClick={handleAddPreviewItem}
                    className="w-full py-1.5 rounded hud-card border hud-border text-outline hover:hud-text font-mono text-[11px] flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>TAMBAH ITEM MAKANAN LAIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAnalyzedFood}
                    disabled={loading || editablePreviewItems.length === 0}
                    className="w-full hud-clip-chamfer hud-hero-bg py-2.5 px-4 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 text-black dark:text-black shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>SIMPAN KE CATATAN TANGGAL {selectedDate}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: RECORDED FOOD LOGS FOR SELECTED DATE (Cols 7-12) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="hud-card border rounded p-5 relative shadow-xl theme-transition space-y-4">
              <div className="flex items-center justify-between border-b hud-border pb-3">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 hud-beam-text" />
                  <h3 className="font-display text-sm font-bold hud-text uppercase">
                    DAFTAR MAKANAN TERCATAT ({currentDayLogs.length})
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-outline">
                  {selectedDate}
                </span>
              </div>

              {currentDayLogs.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs hud-text-muted space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-outline" />
                  <span className="block font-bold">Belum ada makanan tercatat di tanggal ini.</span>
                  <p className="text-[11px] text-outline max-w-xs mx-auto">
                    Gunakan panel di sebelah kiri untuk memindai foto makanan atau mengetik menu secara manual.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDayLogs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded hud-card-inner border hud-border font-mono text-xs relative group transition-all hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm hud-text">{item.food_name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded hud-card border hud-border text-outline">
                              {item.time_logged}
                            </span>
                          </div>
                          <span className="text-[11px] text-outline block mt-0.5">
                            Berat: <strong>{item.estimated_weight_g}g</strong> • {item.meal_slot || "Ransum"}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-display text-base font-bold hud-hero-text block">
                            {item.calories_kcal} kcal
                          </span>
                        </div>
                      </div>

                      {/* Macros row */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 rounded hud-card border hud-border mt-2.5 text-center text-[10px]">
                        <div>
                          <span className="text-outline block">Karbo</span>
                          <span className="hud-sub-text font-bold">{item.macros?.carbs_g || 0}g</span>
                        </div>
                        <div>
                          <span className="text-outline block">Protein</span>
                          <span className="hud-beam-text font-bold">{item.macros?.protein_g || 0}g</span>
                        </div>
                        <div>
                          <span className="text-outline block">Lemak</span>
                          <span className="hud-hero-text font-bold">{item.macros?.fat_g || 0}g</span>
                        </div>
                        <div>
                          <span className="text-outline block">Serat</span>
                          <span className="hud-text font-bold">{item.macros?.fiber_g || 0}g</span>
                        </div>
                      </div>

                      {/* Action buttons (Edit & Delete) */}
                      <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t hud-border text-[11px]">
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...item })}
                          className="px-2 py-1 rounded hud-card border hud-border hover:border-primary flex items-center gap-1 text-slate-300 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2 py-1 rounded hud-card border border-red-500/30 hover:bg-red-500/20 text-red-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Link to Dashboard progress */}
              <div className="pt-2 border-t hud-border flex justify-end">
                <Link
                  href="/"
                  className="hud-card-high border hud-border py-2 px-4 rounded font-mono text-xs font-bold uppercase flex items-center gap-1.5 hud-hero-text hover:bg-primary/20 transition-all text-center"
                >
                  <span>BUKA MENU DASHBOARD PROGRESS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* MODAL EDIT ITEM MAKANAN DI HARI SEBELUMNYA / HARI INI                     */}
        {/* ========================================================================= */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md hud-card border-2 border-primary rounded p-6 shadow-2xl space-y-4 font-mono text-xs relative">
              <div className="flex items-center justify-between border-b hud-border pb-2">
                <span className="font-bold text-sm hud-hero-text">EDIT CATATAN MAKANAN</span>
                <button onClick={() => setEditingItem(null)} className="text-outline hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <span className="text-outline block mb-1">Nama Makanan:</span>
                  <input
                    type="text"
                    required
                    value={editingItem.food_name}
                    onChange={(e) => setEditingItem({ ...editingItem, food_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-outline block mb-1">Berat (Gram):</span>
                    <input
                      type="number"
                      min={1}
                      value={editingItem.estimated_weight_g}
                      onChange={(e) => setEditingItem({ ...editingItem, estimated_weight_g: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <span className="text-outline block mb-1">Total Kalori (kcal):</span>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.calories_kcal}
                      onChange={(e) => setEditingItem({ ...editingItem, calories_kcal: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-outline block mb-1">Protein (g):</span>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.macros.protein_g}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        macros: { ...editingItem.macros, protein_g: Number(e.target.value) } 
                      })}
                      className="w-full px-2 py-1.5 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <span className="text-outline block mb-1">Karbo (g):</span>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.macros.carbs_g}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        macros: { ...editingItem.macros, carbs_g: Number(e.target.value) } 
                      })}
                      className="w-full px-2 py-1.5 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <span className="text-outline block mb-1">Lemak (g):</span>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.macros.fat_g}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        macros: { ...editingItem.macros, fat_g: Number(e.target.value) } 
                      })}
                      className="w-full px-2 py-1.5 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t hud-border">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded hud-card border hud-border"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded hud-hero-bg font-bold text-black dark:text-black flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      <TacticalFooter />
    </div>
  );
}
