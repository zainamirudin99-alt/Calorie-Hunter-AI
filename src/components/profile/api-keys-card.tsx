"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Globe,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Cpu,
} from "lucide-react";
import { ProviderType } from "@/lib/ai/registry";

interface KeySlotState {
  provider: ProviderType;
  name: string;
  hasKey: boolean;
  last4: string | null;
  baseUrl: string | null;
  status: "valid" | "invalid" | "unverified" | "unconfigured";
  lastCheckedAt: string | null;
  updatedAt: string | null;
}

export function ApiKeysCard() {
  const [slots, setSlots] = useState<KeySlotState[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputKeys, setInputKeys] = useState<Record<string, string>>({});
  const [inputBaseUrls, setInputBaseUrls] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<
    Record<string, { type: "success" | "error"; message: string; latencyMs?: number }>
  >({});

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-keys");
      if (res.ok) {
        const data = await res.json();
        setSlots(data.keys || []);
        // Seed base URLs if already set
        const baseUrlsMap: Record<string, string> = {};
        for (const k of data.keys || []) {
          if (k.baseUrl) {
            baseUrlsMap[k.provider] = k.baseUrl;
          }
        }
        setInputBaseUrls((prev) => ({ ...baseUrlsMap, ...prev }));
      }
    } catch (err) {
      console.error("Gagal memuat status AI keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const toggleShowKey = (provider: string) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSave = async (provider: ProviderType) => {
    const rawKey = inputKeys[provider]?.trim();
    if (!rawKey) {
      setFeedback((prev) => ({
        ...prev,
        [provider]: { type: "error", message: "Masukkan API key terlebih dahulu." },
      }));
      return;
    }

    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    setFeedback((prev) => ({ ...prev, [provider]: { type: "success", message: "Menguji dan menyimpan..." } }));

    try {
      const res = await fetch(`/api/ai-keys/${provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: rawKey,
          baseUrl: provider === "openai" ? inputBaseUrls[provider]?.trim() || null : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback((prev) => ({
          ...prev,
          [provider]: {
            type: data.status === "valid" ? "success" : "error",
            message: data.message || "Kunci berhasil diverifikasi & disimpan.",
            latencyMs: data.latencyMs,
          },
        }));
        // JANGAN simpan nilai API key di DOM/state: bersihkan form lokal segera
        setInputKeys((prev) => ({ ...prev, [provider]: "" }));
        await fetchKeys();
      } else {
        setFeedback((prev) => ({
          ...prev,
          [provider]: { type: "error", message: data.error || data.message || "Gagal menyimpan kunci." },
        }));
      }
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [provider]: { type: "error", message: "Gagal menghubungi server API." },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleTest = async (provider: ProviderType) => {
    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`/api/ai-keys/${provider}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: provider === "openai" ? inputBaseUrls[provider]?.trim() || null : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback((prev) => ({
          ...prev,
          [provider]: {
            type: data.status === "valid" ? "success" : "error",
            message: data.message || "Koneksi berhasil teruji dan aktif.",
            latencyMs: data.latencyMs,
          },
        }));
        await fetchKeys();
      } else {
        setFeedback((prev) => ({
          ...prev,
          [provider]: { type: "error", message: data.error || data.message || "Gagal tes koneksi." },
        }));
      }
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [provider]: { type: "error", message: "Gagal menghubungi server API." },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleDelete = async (provider: ProviderType) => {
    if (!confirm(`Hapus API key untuk provider ${provider.toUpperCase()}?`)) return;

    setActionLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`/api/ai-keys/${provider}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFeedback((prev) => ({
          ...prev,
          [provider]: { type: "success", message: "Kunci berhasil dihapus dari penyimpanan aman." },
        }));
        setInputKeys((prev) => ({ ...prev, [provider]: "" }));
        await fetchKeys();
      } else {
        const data = await res.json();
        setFeedback((prev) => ({
          ...prev,
          [provider]: { type: "error", message: data.error || "Gagal menghapus kunci." },
        }));
      }
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [provider]: { type: "error", message: "Gagal menghubungi server API." },
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const getStatusBadge = (status: KeySlotState["status"]) => {
    switch (status) {
      case "valid":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>TERUJI (VALID)</span>
          </span>
        );
      case "invalid":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>GAGAL (INVALID)</span>
          </span>
        );
      case "unverified":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>TERSIMPAN (BELUM DITES)</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
            BELUM DIATUR
          </span>
        );
    }
  };

  const getProviderIcon = (provider: ProviderType) => {
    switch (provider) {
      case "gemini":
        return <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />;
      case "openai":
        return <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "deepseek":
        return <Key className="w-4 h-4 text-blue-400 shrink-0" />;
      case "groq":
        return <Zap className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div className="hud-card border rounded-lg p-4 sm:p-6 relative shadow-xl theme-transition space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b hud-border pb-4 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 w-full max-w-full">
          <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center text-cyan-400 shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base font-bold hud-text uppercase truncate">
              MANAJEMEN KUNCI AI PRIBADI (BYOK)
            </h2>
            <p className="font-mono text-[10px] sm:text-[11px] text-outline truncate">
              Bring Your Own Key • Terenkripsi AES-256-GCM Sisi Server
            </p>
          </div>
        </div>
        <span className="font-mono text-[9px] sm:text-[10px] px-2.5 py-1 rounded hud-card-inner border hud-border text-cyan-400 font-bold uppercase shrink-0">
          AES-256-GCM ENCRYPTED
        </span>
      </div>

      <p className="font-mono text-xs text-outline leading-relaxed break-words">
        Gunakan API key AI milik akun Anda sendiri untuk performa maksimal tanpa batas kuota publik. Kunci disimpan terenkripsi di database dan tidak pernah diekspos ke peramban. Minimal 1 provider aktif untuk pemindaian ransum dan perancangan menu AI.
      </p>

      {loading ? (
        <div className="py-10 text-center font-mono text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Memuat konfigurasi 4 provider AI...</span>
        </div>
      ) : (
        /* 4 Kartu Provider: 1 kolom di mobile, 2 kolom di desktop */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {slots.map((slot) => {
            const isLoading = Boolean(actionLoading[slot.provider]);
            const fb = feedback[slot.provider];
            const isShowing = Boolean(showKey[slot.provider]);

            return (
              <div
                key={slot.provider}
                className="p-4 rounded hud-card-inner border hud-border space-y-3 transition-all flex flex-col justify-between shadow-sm hover:border-primary/40 min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  {/* Card Header: Icon + Name + Last4 + Status */}
                  <div className="flex items-center justify-between gap-2 border-b hud-border pb-2.5 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {getProviderIcon(slot.provider)}
                      <span className="hud-text font-bold text-xs uppercase tracking-wider truncate">
                        {slot.name}
                      </span>
                      {slot.last4 && (
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                          ••••••••{slot.last4}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">{getStatusBadge(slot.status)}</div>
                  </div>

                  {/* Input API Key with Show/Hide toggle */}
                  <div className="space-y-1">
                    <label className="text-[11px] hud-text-muted uppercase block">
                      {slot.hasKey ? "Perbarui Kunci API:" : "Masukkan Kunci API:"}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={isShowing ? "text" : "password"}
                        placeholder={
                          slot.hasKey
                            ? `Tersimpan (••••••••${slot.last4 || ""})`
                            : `Masukkan API Key ${slot.name}...`
                        }
                        value={inputKeys[slot.provider] || ""}
                        onChange={(e) =>
                          setInputKeys((prev) => ({
                            ...prev,
                            [slot.provider]: e.target.value,
                          }))
                        }
                        className="w-full pr-11 pl-3 py-2 rounded hud-card border hud-border font-mono text-base sm:text-xs hud-text focus:outline-none focus:border-cyan-400 placeholder:text-slate-500 min-h-[44px]"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(slot.provider)}
                        className="absolute right-0 top-0 bottom-0 px-3 min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                        title={isShowing ? "Sembunyikan Kunci" : "Lihat Kunci"}
                      >
                        {isShowing ? (
                          <EyeOff className="w-4 h-4 shrink-0" />
                        ) : (
                          <Eye className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Custom Base URL (OpenAI only) */}
                  {slot.provider === "openai" && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Base URL Kustom (Opsional / Proxy / OpenRouter):</span>
                      </div>
                      <input
                        type="text"
                        placeholder="https://api.openai.com/v1"
                        value={inputBaseUrls[slot.provider] || ""}
                        onChange={(e) =>
                          setInputBaseUrls((prev) => ({
                            ...prev,
                            [slot.provider]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded hud-card border hud-border font-mono text-base sm:text-xs hud-text focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 min-h-[44px]"
                      />
                    </div>
                  )}

                  {/* Feedback Message */}
                  {fb && (
                    <div
                      className={`text-xs p-2.5 rounded flex items-center justify-between gap-2 break-words ${
                        fb.type === "success"
                          ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300"
                          : "bg-red-500/10 border border-red-500/40 text-red-300"
                      }`}
                    >
                      <span className="flex-1 break-words">{fb.message}</span>
                      {fb.latencyMs !== undefined && (
                        <span className="opacity-80 font-mono text-[10px] shrink-0">
                          {fb.latencyMs}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons (Simpan, Tes, Hapus) */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t hud-border mt-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSave(slot.provider)}
                    className="flex-1 min-h-[44px] py-2 px-3 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 font-bold text-xs uppercase transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isLoading ? "Menyimpan..." : "Simpan Kunci"}</span>
                  </button>

                  {slot.hasKey && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleTest(slot.provider)}
                        title="Tes Koneksi Provider"
                        className="min-h-[44px] px-3.5 py-2 rounded hud-card border hud-border hover:border-cyan-400 text-slate-200 text-xs font-bold uppercase transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 shrink-0 ${isLoading ? "animate-spin" : ""}`}
                        />
                        <span className="hidden sm:inline">Tes</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDelete(slot.provider)}
                        title="Hapus Kunci dari Server"
                        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded hud-card border hud-border hover:border-red-500 text-red-400 text-xs font-bold uppercase transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
