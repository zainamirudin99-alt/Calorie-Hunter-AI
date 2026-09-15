"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTacticalTheme } from "@/components/theme-provider";
import { 
  LayoutDashboard, 
  ScanLine, 
  UtensilsCrossed, 
  Activity, 
  User, 
  Target, 
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldAlert
} from "lucide-react";

interface TacticalSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const GEMINI_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (Default)", badge: "RECOMMENDED" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", badge: "FAST" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", badge: "LEGACY" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", badge: "PREVIEW" },
];

export function TacticalSidebar({ isOpen: propIsOpen, onClose: propOnClose }: TacticalSidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isUltraman, isSidebarOpen, closeSidebar } = useTacticalTheme();

  // Support both controlled props and global theme context
  const isOpen = propIsOpen !== undefined ? propIsOpen : isSidebarOpen;
  const onClose = propOnClose || closeSidebar;

  // AI Model & Health State
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");
  const [aiHealth, setAiHealth] = useState<{
    checking: boolean;
    status: "online" | "rate_limited" | "error" | "no_key" | null;
    latency_ms?: number;
    message?: string;
  }>({
    checking: false,
    status: null,
  });

  // Admin state (zainamrdn99)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [targetUsername, setTargetUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("hunter123");
  const [adminFeedback, setAdminFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  // Initialize selected model & auth info on mount
  useEffect(() => {
    // Read model preference from cookie or localStorage
    const savedModel = localStorage.getItem("chai_ai_model");
    if (savedModel && GEMINI_MODELS.some(m => m.id === savedModel)) {
      setSelectedModel(savedModel);
    }

    // Check if user is admin
    const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
    fetch("/api/auth/status", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => {
        if (data.isAdmin || data.username === "zainamrdn99") {
          setIsAdmin(true);
        }
        if (data.preferred_gemini_model) {
          setSelectedModel(data.preferred_gemini_model);
        }
      })
      .catch(() => {});
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Model change handler
  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    localStorage.setItem("chai_ai_model", newModel);
    document.cookie = `chai_ai_model=${encodeURIComponent(newModel)}; path=/; max-age=31536000; SameSite=Lax`;
    checkAiHealth(newModel);
  };

  // AI Health Check trigger
  const checkAiHealth = async (modelToCheck?: string) => {
    const model = modelToCheck || selectedModel;
    setAiHealth({ checking: true, status: null });

    try {
      const res = await fetch(`/api/ai/health?model=${encodeURIComponent(model)}`);
      const data = await res.json();
      setAiHealth({
        checking: false,
        status: data.status,
        latency_ms: data.latency_ms,
        message: data.message,
      });
    } catch {
      setAiHealth({
        checking: false,
        status: "error",
        message: "Tidak dapat terhubung ke server AI Health Check.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("chai_auth_token");
    localStorage.removeItem("chai_username");
    document.cookie = "chai_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    onClose();
    window.location.href = "/auth";
  };

  // Admin password reset handler
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminFeedback(null);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_username: targetUsername.trim(),
          new_password: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mereset password");
      }

      setAdminFeedback({
        type: "success",
        msg: data.message || `Password user ${targetUsername} berhasil diperbarui!`,
      });
      setTargetUsername("");
    } catch (err: any) {
      setAdminFeedback({
        type: "error",
        msg: err.message || "Gagal mereset password user",
      });
    } finally {
      setAdminLoading(false);
    }
  };

  const navigationItems = [
    {
      name: "Dashboard HUD",
      href: "/",
      icon: LayoutDashboard,
      code: "SECTOR-01",
    },
    {
      name: "Tracking Makanan",
      href: "/scanner",
      icon: ScanLine,
      code: "SECTOR-02",
    },
    {
      name: "Pilih Program",
      href: "/program",
      icon: Target,
      code: "SECTOR-03",
    },
    {
      name: "Rencana Makan AI",
      href: "/meal-plan",
      icon: UtensilsCrossed,
      code: "SECTOR-04",
    },
    {
      name: "Data Diri Biometrik",
      href: "/profile",
      icon: User,
      code: "SECTOR-05",
    },
    {
      name: "Aktivitas & Hobi",
      href: "/activities",
      icon: Activity,
      code: "SECTOR-06",
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Tactical Drawer */}
      <aside 
        aria-label="Tactical Command Deck"
        className="fixed top-0 left-0 bottom-0 w-88 max-w-[90vw] hud-card border-r hud-border z-[100] flex flex-col p-5 shadow-2xl theme-transition animate-in slide-in-from-left duration-200 overflow-y-auto"
      >
        {/* Sidebar Header with custom sidebar icon */}
        <div className="flex items-center justify-between pb-4 border-b hud-border shrink-0">
          <div className="flex items-center gap-3">
            {/* Prominent Sidebar Crest using sidebar icon.png */}
            <div className="relative w-12 h-12 rounded-xl hud-card-high border-2 border-primary/40 flex items-center justify-center p-1 shadow-lg group shrink-0 overflow-hidden">
              <Image
                src="/sidebar-icon.png"
                alt="Tactical Command Emblem"
                width={48}
                height={48}
                className="object-contain drop-shadow-md hover:scale-105 transition-transform"
                priority
              />
              <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            </div>
            <div>
              <span className="font-display text-sm font-bold hud-hero-text uppercase tracking-wider block leading-tight">
                COMMAND DECK
              </span>
              <span className="font-mono text-[10px] text-outline uppercase block mt-0.5">
                {isUltraman ? "SCIENCE PATROL NET" : "TITAN PROTOCOL"}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded hud-card-inner border hud-border text-emerald-400 font-bold inline-block mt-0.5">
                ACTIVE // V.4.2
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded hud-card-inner border hud-border flex items-center justify-center hud-text-muted hover:hud-hero-text transition-colors cursor-pointer"
            title="Tutup Navigasi Taktis"
            aria-label="Tutup Navigasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="py-4 space-y-1.5 shrink-0">
          <div className="text-[10px] font-mono text-outline uppercase tracking-wider px-2 mb-2">
            SEKTOR KONTROL // NAVIGATION
          </div>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all border ${
                  isActive
                    ? "hud-hero-bg border-transparent font-bold shadow-md"
                    : "hud-card-inner border-transparent hud-text-muted hover:border-primary/40 hover:hud-text"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">{item.code}</span>
              </Link>
            );
          })}
        </nav>

        {/* ===================================================================== */}
        {/* AI MODEL SELECTOR & CEK STATUS AI (REQUIREMENT 7)                     */}
        {/* ===================================================================== */}
        <div className="p-3 rounded-lg hud-card-inner border hud-border space-y-2.5 my-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-outline uppercase font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              MODEL ENGINE AI
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded hud-card border hud-border hud-beam-text font-bold">
              GEMINI 3
            </span>
          </div>

          {/* Model Selector Dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded hud-card-high border hud-border font-mono text-xs hud-text focus:outline-none focus:border-primary cursor-pointer"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                {m.label}
              </option>
            ))}
          </select>

          {/* Cek AI Button & Status */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => checkAiHealth()}
              disabled={aiHealth.checking}
              className="flex-1 py-1.5 px-2.5 rounded hud-card-high border border-primary/40 hover:border-primary font-mono text-[11px] hud-hero-text font-bold uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${aiHealth.checking ? "animate-spin" : ""}`} />
              <span>{aiHealth.checking ? "MENGECEK..." : "CEK STATUS AI"}</span>
            </button>
          </div>

          {/* Health Status Result Badge */}
          {aiHealth.status && (
            <div className={`p-2 rounded font-mono text-[10px] space-y-1 transition-all ${
              aiHealth.status === "online"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : aiHealth.status === "rate_limited"
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}>
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  {aiHealth.status === "online" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {aiHealth.status === "rate_limited" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  {aiHealth.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  {aiHealth.status === "no_key" && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                  <span>
                    {aiHealth.status === "online" && "AI ONLINE // SIAP"}
                    {aiHealth.status === "rate_limited" && "BATAS KUOTA TERCAPAI"}
                    {aiHealth.status === "error" && "AI OFFLINE / GAGAL"}
                    {aiHealth.status === "no_key" && "KUNCI API BELUM ADA"}
                  </span>
                </div>
                {aiHealth.latency_ms !== undefined && (
                  <span className="text-[9px] opacity-80 font-mono">{aiHealth.latency_ms}ms</span>
                )}
              </div>
              {aiHealth.message && (
                <p className="text-[9px] opacity-85 leading-tight">{aiHealth.message}</p>
              )}
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* ADMIN SPECIAL SECTION: ZAINAMRDN99 ONLY (REQUIREMENT 2)               */}
        {/* ===================================================================== */}
        {isAdmin && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 font-mono text-xs space-y-2 my-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[10px] text-red-400 uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-400" />
                ADMIN PANEL (ZAINAMRDN99)
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold">
                SUPERADMIN
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              Anda memiliki wewenang untuk mereset password akun user yang meminta bantuan manual.
            </p>
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="w-full py-1.5 px-2.5 rounded bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 text-red-300 font-bold text-[11px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              <span>RESET PASSWORD USER MANUAL</span>
            </button>
          </div>
        )}

        {/* System telemetry footer in sidebar */}
        <div className="pt-4 border-t hud-border font-mono text-[11px] hud-text-muted space-y-2.5 mt-auto shrink-0">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              KEAMANAN RLS:
            </span>
            <span className="hud-beam-text font-bold">AKTIF</span>
          </div>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="w-full mt-2 py-2 px-3 rounded hud-card-inner border border-red-500/30 text-red-400 hover:bg-red-500/10 font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOGOUT / GANTI AKUN</span>
          </button>
        </div>
      </aside>

      {/* Admin Reset Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-md hud-card border-2 border-red-500 rounded p-6 shadow-2xl relative space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-red-400" />
                <span className="font-bold text-sm text-red-400 uppercase">
                  ADMIN: RESET PASSWORD USER
                </span>
              </div>
              <button
                onClick={() => { setShowAdminModal(false); setAdminFeedback(null); }}
                className="text-outline hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ketik username akun pengguna yang meminta reset password (melalui DM Instagram @Jenbonjovi).
            </p>

            {adminFeedback && (
              <div className={`p-2.5 rounded text-[11px] flex items-center gap-2 ${
                adminFeedback.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border border-red-500/30 text-red-300"
              }`}>
                {adminFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{adminFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleAdminResetPassword} className="space-y-3">
              <div>
                <label className="block text-outline uppercase mb-1">Username Target User:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hunter_user99"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-red-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-outline uppercase mb-1">Password Sementara Baru:</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-red-500 text-xs font-bold"
                />
                <span className="text-[10px] text-outline block mt-0.5">
                  Berikan password ini kepada user agar dapat login kembali.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t hud-border">
                <button
                  type="button"
                  onClick={() => { setShowAdminModal(false); setAdminFeedback(null); }}
                  className="px-3 py-1.5 rounded hud-card border hud-border text-slate-300"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  {adminLoading ? "MEMPROSES..." : "RESET PASSWORD SEKARANG"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
