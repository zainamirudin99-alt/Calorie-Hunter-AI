"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { CampaignStepper } from "@/components/hud/campaign-stepper";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  ScanLine, 
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
  Sparkles
} from "lucide-react";

export default function ScannerPage() {
  const { isUltraman } = useTacticalTheme();

  const [inputMode, setInputMode] = useState<"photo" | "manual_text">("photo");
  const [manualText, setManualText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Daily calorie budget state (Requirement: Target Kalori - Kalori Masuk = Sisa Kalori)
  const [dailyTarget, setDailyTarget] = useState<number>(1950);
  const [dailyConsumed, setDailyConsumed] = useState<number>(1420);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedProg = localStorage.getItem("chai_active_program");
    if (savedProg) {
      try {
        const p = JSON.parse(savedProg);
        if (p.target_daily_kcal) setDailyTarget(Number(p.target_daily_kcal));
      } catch {}
    }
    const savedConsumed = localStorage.getItem("chai_daily_consumed");
    if (savedConsumed) {
      setDailyConsumed(Number(savedConsumed));
    }
  }, []);

  const remainingKcal = Math.max(0, dailyTarget - dailyConsumed);
  const pctConsumed = Math.min(100, Math.round((dailyConsumed / (dailyTarget || 1)) * 100));

  const handleSaveMealLog = () => {
    if (!analysisResult?.data) return;
    const addedKcal = analysisResult.data.total_calories_kcal || 0;
    const updated = dailyConsumed + addedKcal;
    setDailyConsumed(updated);
    localStorage.setItem("chai_daily_consumed", String(updated));
    setSavedSuccess(`Berhasil menyimpan ransum (${addedKcal} kcal)! Sisa kuota kalori Anda telah diperbarui.`);
  };

  // Auto-pick up mobile quick camera capture from dock
  useEffect(() => {
    const quickCapture = sessionStorage.getItem("chai_quick_capture");
    if (quickCapture) {
      setPreviewUrl(quickCapture);
      setInputMode("photo");
      // Convert data URL to file
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setManualText(""); // Ensure XOR
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

  const handleProcess = async () => {
    if (!canProcess) return;
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    if (inputMode === "photo" && selectedFile) {
      formData.append("photo", selectedFile);
    } else if (inputMode === "manual_text" && manualText.trim()) {
      formData.append("raw_text_input", manualText.trim());
    }

    try {
      const token = localStorage.getItem("chai_auth_token");
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menganalisis makanan");
      }

      setAnalysisResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses data makanan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="scanner" />
      <CampaignStepper />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b hud-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold hud-text uppercase">
                AI MONSTER SCANNER & TRACKING
              </h1>
              <span className="font-mono text-[10px] text-outline uppercase block">
                {isUltraman ? "SCIENCE PATROL BIO-SPECTROMETER" : "TITAN SENSOR MULTIMODAL"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded hud-card-inner border hud-border hud-beam-text font-bold">
              GEMINI 3.8 FLASH ENGINE
            </span>
          </div>
        </div>

        {/* Status Kalori: Bar progres (Target Kalori - Kalori Masuk = Sisa Kalori) */}
        <div className="hud-card border rounded p-4 mb-6 shadow-xl relative overflow-hidden theme-transition border-primary/40 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 font-mono">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 hud-hero-text animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-bold hud-text uppercase block">
                  STATUS KALORI HARIAN (MENU UTAMA)
                </span>
                <span className="text-[10px] text-outline uppercase block">
                  TARGET ({dailyTarget} kcal) - KALORI MASUK ({dailyConsumed} kcal) = SISA ({remainingKcal} kcal)
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-sm font-bold font-display hud-hero-text">
                {remainingKcal} KCAL SISA
              </span>
              <span className="text-[10px] text-outline block">
                {dailyConsumed} / {dailyTarget} kcal ({pctConsumed}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full hud-card-inner border hud-border overflow-hidden p-0.5">
            <div 
              className="h-full rounded-full hud-hero-bg transition-all duration-500"
              style={{ width: `${Math.min(100, pctConsumed)}%` }}
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-6 p-3 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedSuccess}</span>
            </div>
            <Link 
              href="/"
              className="px-2.5 py-1 rounded hud-card-high border hud-border hud-hero-text font-bold text-[10px] uppercase hover:bg-primary/20 shrink-0"
            >
              Lihat Dashboard ➔
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Input Selection (Cols 1-6) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="hud-card border rounded p-5 relative shadow-xl theme-transition">
              
              {/* Input Mode Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded hud-card-inner border hud-border mb-5">
                <button
                  type="button"
                  onClick={() => { setInputMode("photo"); setManualText(""); }}
                  className={`py-2 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 rounded ${
                    inputMode === "photo"
                      ? "hud-hero-bg shadow"
                      : "hud-text-muted hover:hud-text"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>PINDAI FOTO</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode("manual_text"); setSelectedFile(null); setPreviewUrl(null); }}
                  className={`py-2 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 rounded ${
                    inputMode === "manual_text"
                      ? "hud-hero-bg shadow"
                      : "hud-text-muted hover:hud-text"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>TEKS MANUAL</span>
                </button>
              </div>

              {/* Photo Upload Mode */}
              {inputMode === "photo" && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed hud-border rounded p-6 text-center hover:border-primary/60 transition-colors relative crt-scanlines overflow-hidden">
                    {previewUrl ? (
                      <div className="relative h-64 w-full rounded overflow-hidden">
                        <img
                          src={previewUrl}
                          alt="Foto Makanan"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                          className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 font-mono text-[10px] text-white border hud-border hover:bg-red-600"
                        >
                          GANTI FOTO
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full hud-card-inner border hud-border flex items-center justify-center hud-hero-text">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="font-mono text-xs">
                          <span className="hud-text font-bold block">BIDIK ATAU UNGGAH RANSUM</span>
                          <span className="text-[10px] text-outline block mt-0.5">
                            Format JPG, PNG, WEBP (Maksimal 10MB)
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="hud-hero-bg px-4 py-2 rounded font-mono text-xs font-bold uppercase flex items-center gap-1.5 shadow hover:opacity-90"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>KAMERA MOBILE</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="hud-card-inner border hud-border px-4 py-2 rounded font-mono text-xs font-bold uppercase hud-text-muted hover:hud-text flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>PILIH FILE</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hidden inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Manual Text Mode */}
              {inputMode === "manual_text" && (
                <div className="space-y-3 font-mono text-xs">
                  <label className="block hud-text-muted uppercase">
                    Deskripsikan Ransum Makanan Anda
                  </label>
                  <textarea
                    rows={6}
                    value={manualText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Contoh: 1 porsi nasi merah 150g dengan dada ayam bakar tanpa kulit 150g, tumis kangkung terasi, dan 1 butir telur rebus."
                    className="w-full p-3 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary leading-relaxed resize-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-outline">
                    <span>XOR Invariant: Hanya teks yang akan diproses</span>
                    <span>{manualText.length} Karakter</span>
                  </div>
                </div>
              )}

              {/* Process Button */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={!canProcess || loading}
                className="w-full mt-5 hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-xl hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    AI GEMINI MENGANALISIS GIZI...
                  </span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>PROSES SENSOR AI GIZI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Tactical Nutrition Breakdown (Cols 7-12) */}
          <div className="lg:col-span-6 space-y-6">
            {analysisResult ? (
              <div className="hud-card border rounded p-5 relative shadow-xl animate-in fade-in-50 duration-300">
                <div className="flex items-center justify-between border-b hud-border pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 hud-hero-text" />
                    <h2 className="font-display text-sm font-bold hud-text uppercase">
                      HASIL ANALISIS SPEKTROMETER AI
                    </h2>
                  </div>
                  <span className="font-mono text-xs hud-hero-text font-bold">
                    TOTAL: {analysisResult.total_kcal} KCAL
                  </span>
                </div>

                {/* Remaining Daily Calorie Counter */}
                <div className="p-4 rounded hud-card-inner border hud-border mb-4 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="text-outline uppercase block text-[10px]">Sisa Budget Harian</span>
                    <span className="font-display text-xl font-bold hud-beam-text">
                      {analysisResult.remaining_daily_kcal} kcal
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-outline uppercase block text-[10px]">Target Harian</span>
                    <span className="font-bold hud-text">{analysisResult.target_daily_kcal} kcal</span>
                  </div>
                </div>

                {/* Itemized Breakdown List */}
                <div className="space-y-3 font-mono text-xs mb-4">
                  <span className="text-[10px] text-outline uppercase block font-bold">
                    ITEM MAKANAN TERIDENTIFIKASI:
                  </span>
                  {analysisResult.data.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded hud-card-high border hud-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-display text-sm font-bold hud-text">{item.food_name}</span>
                          <span className="text-[10px] text-outline block">
                            Estimasi: {item.estimated_weight_g}g • Akurasi: {Math.round((item.confidence || 0.9) * 100)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-sm font-bold hud-hero-text">
                            {item.calories_kcal} kcal
                          </span>
                        </div>
                      </div>

                      {/* Macros row */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 rounded hud-card-inner text-center text-[10px]">
                        <div>
                          <span className="text-outline block">Karbo</span>
                          <span className="hud-sub-text font-bold">{item.macros.carbs_g}g</span>
                        </div>
                        <div>
                          <span className="text-outline block">Protein</span>
                          <span className="hud-beam-text font-bold">{item.macros.protein_g}g</span>
                        </div>
                        <div>
                          <span className="text-outline block">Lemak</span>
                          <span className="hud-hero-text font-bold">{item.macros.fat_g}g</span>
                        </div>
                        <div>
                          <span className="text-outline block">Serat</span>
                          <span className="hud-text font-bold">{item.macros.fiber_g}g</span>
                        </div>
                      </div>

                      {/* Micros badges */}
                      {item.micros && (
                        <div className="flex items-center gap-2 text-[10px] text-outline pt-1">
                          <span>Natrium: {item.micros.sodium_mg || 0}mg</span>
                          <span>•</span>
                          <span>Kalium: {item.micros.potassium_mg || 0}mg</span>
                          <span>•</span>
                          <span>Vit C: {item.micros.vitamin_c_mg || 0}mg</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {analysisResult.data.notes && (
                  <div className="p-3 rounded hud-card-inner border hud-border font-mono text-[11px] hud-text-muted italic">
                    Catatan Sensor: {analysisResult.data.notes}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t hud-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSaveMealLog}
                    className="hud-clip-chamfer hud-hero-bg py-2.5 px-5 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all text-black dark:text-black cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SIMPAN CATATAN MAKANAN</span>
                  </button>

                  <Link
                    href="/"
                    className="hud-card-high border hud-border py-2.5 px-4 rounded font-mono text-xs font-bold uppercase flex items-center justify-center gap-1.5 hud-hero-text hover:bg-primary/20 transition-all text-center"
                  >
                    <span>LIHAT DASHBOARD & PROGRESS GRAFIK</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="hud-card border rounded p-8 text-center font-mono text-xs hud-text-muted space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full hud-card-inner border hud-border flex items-center justify-center hud-beam-text">
                  <Layers className="w-6 h-6" />
                </div>
                <span className="hud-text font-bold block">STANDBY MENUNGGU INPUT SENSOR</span>
                <p className="text-[11px] text-outline max-w-sm mx-auto leading-relaxed">
                  Bidik foto piring makanan atau ketikkan bahan makanan Anda di panel kiri, lalu klik &quot;PROSES SENSOR AI GIZI&quot; untuk melihat telemetri kalori terperinci.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}
