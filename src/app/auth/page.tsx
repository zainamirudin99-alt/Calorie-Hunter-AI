"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTacticalTheme } from "@/components/theme-provider";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { Shield, Swords, Lock, User, CheckCircle2, AlertCircle, ArrowRight, HelpCircle, Send, Instagram } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();
  const [mode, setMode] = useState<"register" | "login">("login");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password minimal 6 karakter!");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan proses autentikasi");
      }

      // Step 1: Session stored exclusively in HttpOnly cookie by server.
      // Store display username only for HUD header badge.
      const authUser = data.user?.username || username;
      localStorage.setItem("chai_username", authUser);

      setSuccessMsg(
        mode === "register"
          ? "Akun berhasil dibuat! Memeriksa status onboarding..."
          : "Login berhasil! Memeriksa status misi..."
      );

      // Step 3: Smart redirect based on onboarding completion status
      try {
        const statusRes = await fetch("/api/auth/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setTimeout(() => {
            if (!statusData.has_profile) {
              router.push("/profile");
            } else if (!statusData.has_program) {
              router.push("/program");
            } else {
              router.push("/");
            }
          }, 600);
          return;
        }
      } catch {}

      setTimeout(() => {
        router.push("/profile");
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetToAdmin = () => {
    const target = (forgotUsername || username).trim().toLowerCase();
    if (!target) {
      setForgotStatus("Masukkan username Anda terlebih dahulu.");
      return;
    }

    try {
      const existing = JSON.parse(localStorage.getItem("chai_pending_reset_requests") || "[]");
      if (!existing.includes(target)) {
        existing.push(target);
        localStorage.setItem("chai_pending_reset_requests", JSON.stringify(existing));
      }
      setForgotStatus(`Notifikasi reset untuk '${target}' telah dikirimkan ke antrian admin (@zainamrdn99). Admin dapat mereset akun Anda segera.`);
    } catch {
      setForgotStatus("Permintaan reset tercatat.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md hud-card border rounded p-6 sm:p-8 relative shadow-2xl theme-transition overflow-hidden">
          {/* Reticle corner markers */}
          <div className="absolute top-2 left-2 text-outline font-mono text-[9px]">[+]</div>
          <div className="absolute top-2 right-2 text-outline font-mono text-[9px]">[+]</div>
          <div className="absolute bottom-2 left-2 text-outline font-mono text-[9px]">[+]</div>
          <div className="absolute bottom-2 right-2 text-outline font-mono text-[9px]">[+]</div>

          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="relative w-16 h-16 mx-auto mb-3 rounded-full hud-card-high border hud-border flex items-center justify-center p-2 shadow-lg">
              <Image
                src="/logo.png"
                alt="Calorie Hunter AI Logo"
                width={52}
                height={52}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="font-display text-xl font-bold hud-hero-text tracking-wider uppercase">
              CALORIE HUNTER AI
            </h1>
            <p className="font-mono text-xs text-outline mt-1 uppercase">
              {isUltraman ? "SCIENCE PATROL TERMINAL // AUTH" : "TITAN PROTOCOL GATE // AUTH"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded hud-card-inner border hud-border mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setErrorMsg(null); setShowForgotModal(false); }}
              className={`py-2 text-xs font-mono font-bold uppercase transition-all rounded cursor-pointer ${
                mode === "login"
                  ? "hud-hero-bg shadow"
                  : "hud-text-muted hover:hud-text"
              }`}
            >
              LOGIN HUNTER
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setErrorMsg(null); setShowForgotModal(false); }}
              className={`py-2 text-xs font-mono font-bold uppercase transition-all rounded cursor-pointer ${
                mode === "register"
                  ? "hud-hero-bg shadow"
                  : "hud-text-muted hover:hud-text"
              }`}
            >
              REGISTRASI
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs hud-text-muted uppercase mb-1.5">
                Username Hunter
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-outline">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="masukkan username..."
                  className="w-full pl-9 pr-3 py-2.5 rounded hud-card-inner border hud-border text-xs font-mono hud-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 font-mono text-xs">
                <label className="hud-text-muted uppercase">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotUsername(username);
                      setShowForgotModal(true);
                      setForgotStatus(null);
                    }}
                    className="text-outline hover:hud-hero-text transition-colors text-[11px] underline cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-outline">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded hud-card-inner border hud-border text-xs font-mono hud-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 mt-4 cursor-pointer"
            >
              {loading ? (
                <span>MEMPROSES PROTOKOL...</span>
              ) : (
                <>
                  <span>{mode === "login" ? "MASUK KE COMMAND DECK" : "DAFTAR SEKARANG"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Static Forgot Password Notice Modal / Component (Step 2) */}
          {showForgotModal && (
            <div className="mt-5 p-4 rounded hud-card-inner border border-amber-500/40 space-y-3 bg-amber-500/5 animate-in fade-in-50 duration-150">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>INFORMASI RESET PASSWORD MANUAL</span>
              </div>
              
              <div className="p-3 rounded hud-card border hud-border font-mono text-xs space-y-2 text-slate-300">
                <p className="leading-relaxed">
                  Hubungi Instagram <strong className="text-white">@Jenbonjovi</strong> untuk reset password secara manual.
                </p>
                <div className="flex items-center gap-2 text-outline text-[11px] pt-1 border-t hud-border">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  <span>Instagram: @Jenbonjovi</span>
                </div>
              </div>

              <div className="space-y-2 pt-1 font-mono text-xs">
                <label className="block text-outline text-[10px] uppercase">
                  Atau Kirimkan Notifikasi Langsung ke Admin (@zainamrdn99):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Username yang ingin di-reset..."
                    className="flex-1 px-2.5 py-1.5 rounded hud-card border hud-border text-xs hud-text focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleSendResetToAdmin}
                    className="px-3 py-1.5 rounded hud-hero-bg text-black font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Kirim</span>
                  </button>
                </div>
                {forgotStatus && (
                  <p className="text-[11px] text-emerald-400 font-mono mt-1">
                    {forgotStatus}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-1.5 text-center font-mono text-[11px] text-outline hover:text-white uppercase mt-2"
              >
                [Tutup Informasi]
              </button>
            </div>
          )}

          {/* ADR-1 Note */}
          <div className="mt-6 pt-4 border-t hud-border text-center">
            <span className="font-mono text-[10px] text-outline block">
              AUTENTIKASI DETERMINISTIK DENGAN SESI COOKIE HTTPONLY (ADR-1)
            </span>
          </div>
        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}
