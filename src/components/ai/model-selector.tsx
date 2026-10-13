"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  GEMINI_MODELS, 
  GeminiModelInfo, 
  useSelectedAiModel, 
  useAiKeyStatus, 
  AiProvider 
} from "@/lib/gemini/models";
import { 
  Cpu, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ExternalLink,
  Eye,
  Sparkles
} from "lucide-react";

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  visionOnly?: boolean;
  compact?: boolean;
  className?: string;
  label?: string;
  showBadge?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  visionOnly = false,
  compact = false,
  className = "",
  label = "Model AI Aktif",
  showBadge = true,
}: ModelSelectorProps) {
  const { modelId: globalModelId, changeModel: setGlobalModel } = useSelectedAiModel();
  const { isProviderAvailable, isModelAvailable, loading } = useAiKeyStatus();
  const [warningMsg, setWarningMsg] = useState<{ provider: string; text: string } | null>(null);

  const currentModelId = value || globalModelId;
  const handleSelect = (newId: string) => {
    const selectedModel = GEMINI_MODELS.find((m) => m.id === newId);
    if (!selectedModel) return;

    if (!isProviderAvailable(selectedModel.provider)) {
      setWarningMsg({
        provider: selectedModel.provider.toUpperCase(),
        text: `Kunci API ${selectedModel.provider.toUpperCase()} belum diatur. Atur di Profil.`,
      });
    } else {
      setWarningMsg(null);
    }

    if (onChange) {
      onChange(newId);
    } else {
      setGlobalModel(newId);
    }
  };

  // Filter models based on vision capability if requested
  const models = visionOnly 
    ? GEMINI_MODELS.filter((m) => m.visionCapable)
    : GEMINI_MODELS;

  const activeModel = GEMINI_MODELS.find((m) => m.id === currentModelId) || GEMINI_MODELS[0];
  const isCurrentAvailable = isModelAvailable(activeModel.id);

  const getProviderColor = (provider: AiProvider) => {
    switch (provider) {
      case "google": return "text-cyan-400 border-cyan-500/30";
      case "openai": return "text-emerald-400 border-emerald-500/30";
      case "deepseek": return "text-blue-400 border-blue-500/30";
      case "groq": return "text-orange-400 border-orange-500/30";
      default: return "text-primary border-primary/30";
    }
  };

  // Compact Mode (for headers / compact toolbars)
  if (compact) {
    return (
      <div className={`relative flex flex-col w-full min-w-0 max-w-full ${className}`}>
        <div className="flex items-center gap-2 w-full min-w-0">
          <div className="relative w-full min-w-0 max-w-full">
            <select
              value={currentModelId}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full max-w-full min-w-0 min-h-[44px] appearance-none pl-3 pr-8 py-2 rounded hud-card-inner border hud-border font-mono text-base sm:text-xs hud-text focus:outline-none focus:border-primary cursor-pointer transition-all shadow-sm truncate"
              title="Pilih Model AI"
            >
              <optgroup label="GOOGLE GEMINI (MULTIMODAL)" className="bg-slate-900 text-cyan-400 font-bold">
                {models.filter(m => m.provider === "google").map((m) => {
                  const available = isProviderAvailable("google");
                  return (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                      {m.shortName || m.label} {!available ? "🔒 (Belum Diatur)" : ""}
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="OPENAI" className="bg-slate-900 text-emerald-400 font-bold">
                {models.filter(m => m.provider === "openai").map((m) => {
                  const available = isProviderAvailable("openai");
                  return (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                      {m.shortName || m.label} {!available ? "🔒 (Belum Diatur)" : ""}
                    </option>
                  );
                })}
              </optgroup>
              {!visionOnly && (
                <>
                  <optgroup label="DEEPSEEK (TEXT ONLY)" className="bg-slate-900 text-blue-400 font-bold">
                    {models.filter(m => m.provider === "deepseek").map((m) => {
                      const available = isProviderAvailable("deepseek");
                      return (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                          {m.shortName || m.label} {!available ? "🔒 (Belum Diatur)" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="GROQ LPU (TEXT ONLY)" className="bg-slate-900 text-orange-400 font-bold">
                    {models.filter(m => m.provider === "groq").map((m) => {
                      const available = isProviderAvailable("groq");
                      return (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                          {m.shortName || m.label} {!available ? "🔒 (Belum Diatur)" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                </>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {warningMsg && (
          <div className="mt-1.5 p-2 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] flex items-center justify-between gap-2 shadow-lg z-20">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{warningMsg.text}</span>
            </div>
            <Link
              href="/profile"
              className="underline text-amber-200 hover:text-white font-bold shrink-0 min-h-[44px] flex items-center"
            >
              Atur Profil →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Full Mode (with label, badge, description, and key status check)
  return (
    <div className={`space-y-2 font-mono w-full min-w-0 max-w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-outline uppercase text-[10px] block font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 hud-hero-text" />
            <span>{label}</span>
          </label>
          {showBadge && (
            <span className={`text-[9px] px-2 py-0.5 rounded border hud-card-inner font-bold uppercase ${getProviderColor(activeModel.provider)}`}>
              {activeModel.badge} • {activeModel.provider.toUpperCase()}
            </span>
          )}
        </div>
      )}

      <div className="relative w-full min-w-0 max-w-full">
        <select
          value={currentModelId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full max-w-full min-w-0 min-h-[44px] appearance-none pl-3 pr-10 py-2.5 rounded hud-card-inner border hud-border font-mono text-base sm:text-xs hud-text focus:outline-none focus:border-primary cursor-pointer transition-all shadow-sm truncate"
        >
          <optgroup label="GOOGLE GEMINI (MULTIMODAL)" className="bg-slate-900 text-cyan-400 font-bold">
            {models.filter(m => m.provider === "google").map((m) => {
              const available = isProviderAvailable("google");
              return (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                  {m.label} {!available ? "🔒 (Kunci Belum Ada)" : "✓ Siap"}
                </option>
              );
            })}
          </optgroup>
          <optgroup label="OPENAI SERIES" className="bg-slate-900 text-emerald-400 font-bold">
            {models.filter(m => m.provider === "openai").map((m) => {
              const available = isProviderAvailable("openai");
              return (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                  {m.label} {!available ? "🔒 (Kunci Belum Ada)" : "✓ Siap"}
                </option>
              );
            })}
          </optgroup>
          {!visionOnly && (
            <>
              <optgroup label="DEEPSEEK SERIES (TEXT ONLY)" className="bg-slate-900 text-blue-400 font-bold">
                {models.filter(m => m.provider === "deepseek").map((m) => {
                  const available = isProviderAvailable("deepseek");
                  return (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                      {m.label} {!available ? "🔒 (Kunci Belum Ada)" : "✓ Siap"}
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="GROQ LPU SERIES (TEXT ONLY)" className="bg-slate-900 text-orange-400 font-bold">
                {models.filter(m => m.provider === "groq").map((m) => {
                  const available = isProviderAvailable("groq");
                  return (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white font-normal">
                      {m.label} {!available ? "🔒 (Kunci Belum Ada)" : "✓ Siap"}
                    </option>
                  );
                })}
              </optgroup>
            </>
          )}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Description & Key status banner */}
      <div className="p-2.5 rounded hud-card-inner border hud-border text-[11px] space-y-1.5">
        <span className="text-slate-300 block leading-relaxed">{activeModel.description}</span>
        
        {isCurrentAvailable ? (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-1 border-t hud-border">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Kunci API {activeModel.provider.toUpperCase()} tersedia & siap digunakan</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-amber-400 pt-1 border-t hud-border">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Kunci API {activeModel.provider.toUpperCase()} belum diatur.</span>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 underline text-cyan-300 hover:text-white font-bold min-h-[30px]"
            >
              <span>Atur di Profil</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {warningMsg && (
        <div className="p-3 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{warningMsg.text}</span>
          </div>
          <Link
            href="/profile"
            className="underline text-amber-200 hover:text-white font-bold shrink-0 min-h-[44px] flex items-center px-2"
          >
            Buka Profil →
          </Link>
        </div>
      )}
    </div>
  );
}
