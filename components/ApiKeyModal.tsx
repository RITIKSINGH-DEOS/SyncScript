"use client";

import React, { useState, useEffect } from "react";
import { Key, ExternalLink, X, Shield, Check } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

export function ApiKeyModal({ isOpen, onClose, onSave, currentKey }: ApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState(currentKey);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setApiKeyInput(currentKey);
  }, [currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(apiKeyInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Groq API Settings</h3>
            <p className="text-xs text-slate-400">100% Free Whisper-large-v3 access</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Enter Your Free Groq API Key:
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private & Stored Locally</span>
          </div>
          <p>
            Your key stays in your browser&apos;s localStorage. It is never logged or stored on any server.
          </p>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 pt-1 font-medium"
          >
            <span>Get your free Groq API key here (No credit card needed)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Key</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
