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
  ChevronDown,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  Utensils,
  ScanLine,
  RefreshCw
} from "lucide-react";

import { ProgramType } from "@/types/database";
import { getProgramNutrientRules, calculateMacroTargets, calculateRemainingCalories } from "@/lib/tdee/calculator";
import { useSelectedAiModel } from "@/lib/gemini/models";

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

const QUICK_MEAL_PRESETS = [
  { label: "🍚 Nasi Padang Rendang", hint: "Nasi padang rendang sapi, daun singkong, sambal ijo", text: "1 porsi nasi padang (200g) + rendang sapi (80g) + daun singkong rebus (50g) + sambal hijau (15g)" },
  { label: "🍗 Dada Ayam Bakar + Nasi", hint: "Nasi putih, dada ayam bakar tanpa kulit, lalapan timun", text: "Nasi putih (200g) + dada ayam bakar (150g) + tahu tempe bacem (75g) + lalapan timun sambal" },
  { label: "🍳 Nasi Goreng Telur", hint: "Nasi goreng kampung telur ceplok dan acar", text: "1 piring nasi goreng kampung (250g) + telur ceplok goreng (55g) + kerupuk (15g) + irisan timun tomat" },
  { label: "🥗 Gado-Gado Lontong Telur", hint: "Gado-gado sayur bumbu kacang telur rebus", text: "Gado-gado sayuran rebus (150g) + lontong (100g) + telur rebus 1 butir (55g) + bumbu kacang (50g)" },
  { label: "🍲 Soto Ayam Lamongan", hint: "Soto ayam kuah bening koya soun telur", text: "1 mangkuk soto ayam lamongan (300g kuah & ayam 80g) + soun (50g) + telur rebus 1 butir + koya" },
  { label: "🥣 Bubur Ayam Komplit", hint: "Bubur ayam cakwe suwiran ayam kerupuk", text: "1 mangkuk bubur ayam (250g) + suwiran ayam (50g) + cakwe (20g) + kedelai goreng (15g) + kerupuk" },
  { label: "🐟 Ikan Bakar + Sayur Asem", hint: "Ikan nila bakar, sayur asem, nasi putih", text: "Nasi putih (200g) + ikan nila bakar bumbu kecap (150g) + sayur asem (200g) + sambal terasi" },
  { label: "🥣 Oatmeal + Pisang Madu", hint: "Oatmeal matang susu dengan pisang dan madu", text: "Oatmeal matang (150g) + pisang ambon iris 1 buah (100g) + madu murni (15g) + susu low fat (100ml)" },
];

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
  const { activeModel, modelId, changeModel, availableModels } = useSelectedAiModel();

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Input & Camera State
  const [inputMode, setInputMode] = useState<"photo" | "manual_text">("photo");
  const [manualText, setManualText] = useState("");
  const [photoHint, setPhotoHint] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Analysis & Loading
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [editablePreviewItems, setEditablePreviewItems] = useState<any[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Program & Targets (TDEE from chosen program)
  const [activeProgramType, setActiveProgramType] = useState<ProgramType>("loss_fat_build_muscle");
  const [activeProgramName, setActiveProgramName] = useState<string>("Loss Fat & Build Muscle (-18%)");
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

  // Helper to apply program data to state
  const applyProgramData = (prog: any) => {
    if (!prog) return;
    const target = Number(prog.target_daily_kcal);
    if (!target || isNaN(target)) return;

    setDailyTargetKcal(target);
    const pType = (prog.program_type || "loss_fat_build_muscle").toLowerCase() as ProgramType;
    setActiveProgramType(pType);

    const macros = calculateMacroTargets(target, pType);
    setTargetProteinG(macros.protein_g);
    setTargetCarbsG(macros.carbs_g);
    setTargetFatG(macros.fat_g);

    const programLabels: Record<ProgramType, string> = {
      weight_loss: "Weight Loss (-25% • Bebas Makro/Mikro)",
      loss_fat: "Loss Fat (-20% • Fleksibel Protein)",
      loss_fat_build_muscle: "Loss Fat & Build Muscle (-18% • Wajib Protein Tinggi)",
      gain_mass: "Gain Mass (+18% • Bebas Makro/Mikro)",
      gain_mass_build_muscle: "Gain Mass & Build Muscle (+12% • Wajib Protein Tinggi)",
      lean_mass: "Lean Mass (+6% • Kontrol Ketat Makro & Mikro)",
      bulking: "Bulking Power Surge (+15%)",
      maintenance: "Maintenance Defense (0%)",
      cutting: "Cutting Protocol (-20%)",
    };
    setActiveProgramName(programLabels[pType] || "Protokol Kalori");
  };

  // Load active program & stored logs on mount
  useEffect(() => {
    // 1. Immediate program loading from local storage
    const savedProg = localStorage.getItem("chai_active_program");
    if (savedProg) {
      try {
        applyProgramData(JSON.parse(savedProg));
      } catch {}
    }

    // 2. Fetch server active program to ensure 100% sync with database
    const syncServerProgram = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
        const res = await fetch("/api/auth/status", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.program && data.program.target_daily_kcal) {
            applyProgramData(data.program);
            localStorage.setItem("chai_active_program", JSON.stringify(data.program));
          }
        }
      } catch {}
    };
    syncServerProgram();

    // 3. Food logs loading:
    // IMPORTANT: Empty by default. Clean up any previous dummy/mock seed meals so user gets a clean slate.
    const savedLogs = localStorage.getItem("chai_food_logs_by_date");
    const cleanedLogs: Record<string, LoggedFoodItem[]> = {};
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        for (const [dateKey, items] of Object.entries(parsed)) {
          if (Array.isArray(items)) {
            const realItems = items.filter(
              (it: any) =>
                it &&
                !String(it.id).startsWith("seed-") &&
                !String(it.food_name).includes("Proto-Oat Beast") &&
                !String(it.food_name).includes("Cyber-Chicken Skewer") &&
                !String(it.food_name).includes("Whey Elixir")
            );
            if (realItems.length > 0) {
              cleanedLogs[dateKey] = realItems;
            }
          }
        }
      } catch {}
    }
    setLogsByDate(cleanedLogs);
    localStorage.setItem("chai_food_logs_by_date", JSON.stringify(cleanedLogs));

    // 4. Check quick mobile camera capture
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

  const [isSyncing, setIsSyncing] = useState(false);

  // Robust cross-device sync with cloud database
  const syncDateLogs = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/food-log?date=${selectedDate}`, {
        headers,
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setLogsByDate(prev => {
            const localItems = prev[selectedDate] || [];

            // If server returned records, merge them with local items
            if (data.items.length > 0) {
              const serverItemNames = new Set(data.items.map((it: any) => String(it.food_name).toLowerCase().trim()));
              const unsyncedLocal = localItems.filter(
                (local: any) => !serverItemNames.has(String(local.food_name).toLowerCase().trim())
              );
              const merged = [...data.items, ...unsyncedLocal];
              const updated = { ...prev, [selectedDate]: merged };
              localStorage.setItem("chai_food_logs_by_date", JSON.stringify(updated));
              return updated;
            }

            // If server returned 0 items but local has items, preserve local
            if (localItems.length > 0) {
              return prev;
            }

            return prev;
          });

          if (!silent && data.items.length > 0) {
            setActionFeedback({
              type: "success",
              msg: `Sinkronisasi cloud berhasil: ${data.items.length} menu makanan berhasil dimuat!`,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn("[scanner] Sync cloud logs failed:", err.message);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Fetch logged foods from database whenever selectedDate changes or window gains focus
  useEffect(() => {
    syncDateLogs(true);

    const handleSyncOnActive = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncDateLogs(true);
      }
    };

    window.addEventListener("focus", handleSyncOnActive);
    window.addEventListener("visibilitychange", handleSyncOnActive);
    return () => {
      window.removeEventListener("focus", handleSyncOnActive);
      window.removeEventListener("visibilitychange", handleSyncOnActive);
    };
  }, [selectedDate]);

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

  const remainingKcal = calculateRemainingCalories(dailyTargetKcal, dayConsumedKcal);
  const pctConsumed = Math.min(100, Math.round((dayConsumedKcal / (dailyTargetKcal || 1)) * 100));

  // Quick Presets if user wants to fast-pick or adapt AI recommendations
  const QUICK_HEALTHY_PRESETS = [
    {
      name: "Ayam Bakar & Nasi",
      items: [
        { food_name: "Nasi Putih", estimated_weight_g: 150, calories_kcal: 195, macros: { carbs_g: 42, protein_g: 4, fat_g: 0, fiber_g: 1, sugar_g: 0 }, micros: { sodium_mg: 5, potassium_mg: 50, vitamin_c_mg: 0 } },
        { food_name: "Dada Ayam Bakar Madu", estimated_weight_g: 140, calories_kcal: 260, macros: { carbs_g: 6, protein_g: 38, fat_g: 8, fiber_g: 0, sugar_g: 5 }, micros: { sodium_mg: 380, potassium_mg: 320, vitamin_c_mg: 2 } },
        { food_name: "Lalapan & Sambal", estimated_weight_g: 60, calories_kcal: 45, macros: { carbs_g: 5, protein_g: 1, fat_g: 2, fiber_g: 2, sugar_g: 2 }, micros: { sodium_mg: 120, potassium_mg: 110, vitamin_c_mg: 12 } }
      ]
    },
    {
      name: "Nasi Padang Rendang",
      items: [
        { food_name: "Nasi Putih", estimated_weight_g: 160, calories_kcal: 210, macros: { carbs_g: 45, protein_g: 4, fat_g: 0, fiber_g: 1, sugar_g: 0 }, micros: { sodium_mg: 5, potassium_mg: 60, vitamin_c_mg: 0 } },
        { food_name: "Rendang Daging Sapi", estimated_weight_g: 100, calories_kcal: 280, macros: { carbs_g: 4, protein_g: 24, fat_g: 19, fiber_g: 1, sugar_g: 2 }, micros: { sodium_mg: 480, potassium_mg: 340, vitamin_c_mg: 2 } },
        { food_name: "Telur Balado", estimated_weight_g: 60, calories_kcal: 115, macros: { carbs_g: 2, protein_g: 7, fat_g: 9, fiber_g: 0, sugar_g: 1 }, micros: { sodium_mg: 190, potassium_mg: 90, vitamin_c_mg: 3 } }
      ]
    },
    {
      name: "Gado-Gado Telur Rebus",
      items: [
        { food_name: "Sayuran Rebus & Tahu Tempe", estimated_weight_g: 180, calories_kcal: 160, macros: { carbs_g: 18, protein_g: 12, fat_g: 6, fiber_g: 6, sugar_g: 3 }, micros: { sodium_mg: 180, potassium_mg: 320, vitamin_c_mg: 25 } },
        { food_name: "Saus Bumbu Kacang", estimated_weight_g: 60, calories_kcal: 180, macros: { carbs_g: 12, protein_g: 6, fat_g: 13, fiber_g: 2, sugar_g: 6 }, micros: { sodium_mg: 290, potassium_mg: 140, vitamin_c_mg: 0 } },
        { food_name: "Telur Rebus 1 Butir", estimated_weight_g: 55, calories_kcal: 75, macros: { carbs_g: 0, protein_g: 6, fat_g: 5, fiber_g: 0, sugar_g: 0 }, micros: { sodium_mg: 65, potassium_mg: 65, vitamin_c_mg: 0 } }
      ]
    },
    {
      name: "Dada Ayam Fillet & Brokoli",
      items: [
        { food_name: "Dada Ayam Panggang Herb", estimated_weight_g: 160, calories_kcal: 260, macros: { carbs_g: 0, protein_g: 46, fat_g: 6, fiber_g: 0, sugar_g: 0 }, micros: { sodium_mg: 220, potassium_mg: 390, vitamin_c_mg: 0 } },
        { food_name: "Brokoli & Jagung Manis Kukus", estimated_weight_g: 120, calories_kcal: 85, macros: { carbs_g: 15, protein_g: 4, fat_g: 1, fiber_g: 4, sugar_g: 4 }, micros: { sodium_mg: 30, potassium_mg: 290, vitamin_c_mg: 60 } }
      ]
    }
  ];

  // File selection with automatic client-side canvas compression & format sanitization
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressingPhoto(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultStr = event.target?.result as string;
        if (!resultStr) {
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setIsCompressingPhoto(false);
          return;
        }

        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1024;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const optimizedFile = new File([blob], "food-capture.jpg", { type: "image/jpeg" });
                  setSelectedFile(optimizedFile);
                  setPreviewUrl(URL.createObjectURL(blob));
                } else {
                  setSelectedFile(file);
                  setPreviewUrl(URL.createObjectURL(file));
                }
                setIsCompressingPhoto(false);
              },
              "image/jpeg",
              0.80
            );
          } else {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setIsCompressingPhoto(false);
          }
        };
        img.onerror = () => {
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setIsCompressingPhoto(false);
        };
        img.src = resultStr;
      };
      reader.onerror = () => {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setIsCompressingPhoto(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextChange = (text: string) => {
    setManualText(text);
    if (text.trim().length > 0) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const canProcess = (inputMode === "photo" && selectedFile && !isCompressingPhoto) || (inputMode === "manual_text" && manualText.trim().length > 0);

  // Send to AI for Nutrition analysis (action: "analyze" only, no DB commit yet)
  const handleProcessAI = async () => {
    if (!canProcess) return;
    setLoading(true);
    setErrorMsg(null);
    setActionFeedback(null);

    const formData = new FormData();
    formData.append("action", "analyze");
    formData.append("model", modelId);
    if (inputMode === "photo" && selectedFile) {
      formData.append("photo", selectedFile);
      if (photoHint.trim()) {
        formData.append("raw_text_input", photoHint.trim());
      }
    } else if (inputMode === "manual_text" && manualText.trim()) {
      formData.append("raw_text_input", manualText.trim());
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-ai-model": modelId,
        },
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
      const res = await fetch("/api/food-log", {
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
          raw_text_input: (photoHint || manualText || "").trim() || null,
          log_date: selectedDate,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("[scanner] Server save error response:", errData.error);
      }

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
      setPhotoHint("");
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
  const handleDeleteItem = async (id: string) => {
    const dayItems = logsByDate[selectedDate] || [];
    const updatedItems = dayItems.filter(item => item.id !== id);
    const updated = { ...logsByDate, [selectedDate]: updatedItems };

    persistLogs(updated);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      if (token) {
        await fetch(`/api/food-log?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}

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
        {(() => {
          const progRules = getProgramNutrientRules(activeProgramType);
          return (
            <div className="hud-card border rounded p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b hud-border pb-3 font-mono">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-6 h-6 hud-hero-text animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold hud-text uppercase">
                        BATAS KALORI: {dailyTargetKcal} KCAL
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded border hud-border hud-card-inner hud-hero-text font-bold">
                        {activeProgramName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded border hud-border text-slate-300">
                        {progRules.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-outline block mt-1">
                      {progRules.ruleDescription}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
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
                <div className={`p-3 rounded hud-card-inner border space-y-1 ${
                  progRules.tracksProteinStrictly ? "border-cyan-500/60 shadow-sm shadow-cyan-500/20" : "hud-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-outline uppercase font-bold">Protein</span>
                      {progRules.tracksProteinStrictly && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                          WAJIB TINGGI
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-outline uppercase font-bold">Karbohidrat</span>
                      {!progRules.tracksMacros && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-slate-700/50 text-slate-400 font-mono">
                          Opsional
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-outline uppercase font-bold">Lemak Sehat</span>
                      {!progRules.tracksMacros && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-slate-700/50 text-slate-400 font-mono">
                          Opsional
                        </span>
                      )}
                    </div>
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
                <div className={`p-3 rounded hud-card-inner border space-y-1 ${
                  progRules.tracksMicros ? "border-emerald-500/60 shadow-sm shadow-emerald-500/20" : "hud-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-outline uppercase font-bold block">Mikronutrisi</span>
                    <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${
                      progRules.tracksMicros ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                    }`}>
                      {progRules.tracksMicros ? "MONITORING KETAT" : "BEBAS MIKRO"}
                    </span>
                  </div>
                  <div className="text-[10px] space-y-0.5 text-slate-300">
                    <div>Natrium: <strong>{dayConsumedSodium}mg</strong> / 2300mg</div>
                    <div>Kalium: <strong>{dayConsumedPotassium}mg</strong> / 3400mg</div>
                    <div>Vit C: <strong>{dayConsumedVitC}mg</strong> / 90mg</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
                {/* Dynamic AI Model Selector Badge (Synchronized with Profile & Program) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="font-mono text-[10px] hud-beam-text border hud-border px-2.5 py-1 rounded hud-card-inner font-bold flex items-center gap-1.5 hover:border-primary transition-all cursor-pointer shadow-sm"
                    title="Model AI yang aktif — klik untuk mengganti secara global"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>{activeModel.shortName}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isModelDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 hud-card border border-primary/50 rounded shadow-2xl p-1 z-30 font-mono text-[11px] space-y-0.5 backdrop-blur-md">
                      <div className="px-2 py-1 text-[9px] text-outline uppercase font-bold border-b hud-border">
                        PILIH ENGINE SENSOR AI (GLOBAL)
                      </div>
                      {availableModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            changeModel(m.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                            m.id === modelId ? "hud-hero-bg text-black font-bold" : "hud-card-inner hover:bg-primary/20 text-slate-200"
                          }`}
                        >
                          <span>{m.shortName}</span>
                          <span className="text-[8px] opacity-75">{m.badge}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                      disabled={isCompressingPhoto}
                      className="py-2.5 px-3 rounded hud-card-high border hud-border font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 hover:border-primary transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>PILIH GALERI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isCompressingPhoto}
                      className="py-2.5 px-3 rounded hud-card-high border border-emerald-500/50 bg-emerald-500/10 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 hover:border-emerald-400 transition-all text-emerald-400 cursor-pointer shadow-md active:scale-98 disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>KAMERA HP</span>
                    </button>
                  </div>

                  {isCompressingPhoto && (
                    <div className="p-2.5 rounded hud-card-inner border hud-border font-mono text-[11px] text-cyan-400 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      <span>Mengompresi foto & mengonversi ke format standar sensor AI...</span>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="space-y-2 p-3 rounded hud-card-inner border hud-border text-left">
                      <label className="text-[11px] font-mono hud-hero-text font-bold uppercase flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5" />
                        <span>Petunjuk / Catatan Menu (Opsional):</span>
                      </label>
                      <input
                        type="text"
                        value={photoHint}
                        onChange={(e) => setPhotoHint(e.target.value)}
                        placeholder="Contoh: Nasi padang ayam bakar dada, tahu goreng..."
                        className="w-full px-3 py-2 rounded hud-card border hud-border font-mono text-xs hud-text focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-outline block">
                        Opsional: Tuliskan catatan menu untuk membantu sensor AI mendeteksi dengan presisi tinggi.
                      </span>

                      {/* Quick Presets for Photo Hint */}
                      <div className="pt-2 border-t hud-border space-y-1.5">
                        <span className="text-[10px] text-outline font-mono uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Pilihan Cepat Menu (Klik untuk isi petunjuk):</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_MEAL_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPhotoHint(preset.hint)}
                              className="px-2 py-1 rounded hud-card border hud-border text-[10px] font-mono hover:border-primary hover:text-cyan-400 transition-colors text-left cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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

                  {/* Quick Presets for Manual Text */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-outline font-mono uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Pilihan Cepat Menu Ransum (Klik untuk isi otomatis):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_MEAL_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleTextChange(preset.text)}
                          className="px-2.5 py-1 rounded hud-card border hud-border text-[10px] font-mono hover:border-primary hover:text-cyan-400 transition-colors text-left cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
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

              {/* Optimistic Non-blocking Processing Indicator */}
              {loading && (
                <div className="mt-3 p-3.5 rounded hud-card-inner border border-primary/40 font-mono text-xs text-cyan-300 flex items-center gap-3 animate-pulse bg-cyan-950/20">
                  <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0"></div>
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[11px] text-cyan-400">
                      [SENSOR AI AKTIF: MENGANALISIS...]
                    </span>
                    <span className="text-[10px] text-slate-300 block">
                      Memindai porsi ransum, gramatur, makronutrisi & mikronutrisi...
                    </span>
                  </div>
                </div>
              )}

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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => syncDateLogs(false)}
                    disabled={isSyncing}
                    title="Sinkronkan catatan makanan dengan database cloud"
                    className="px-2.5 py-1 rounded hud-card border hud-border hover:border-primary/60 text-slate-300 hover:text-white flex items-center gap-1.5 text-[10px] font-mono transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-primary" : ""}`} />
                    <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Cloud"}</span>
                  </button>
                  <span className="font-mono text-[10px] text-outline bg-black/30 px-2 py-0.5 rounded border hud-border">
                    {selectedDate}
                  </span>
                </div>
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
