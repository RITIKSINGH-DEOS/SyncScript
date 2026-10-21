"use client";

import React from "react";
import { Tag, AlignLeft, Clock } from "lucide-react";

interface MarkerTabProps {
  marker: string;
  onMarkerChange: (val: string) => void;
  scriptText: string;
  onScriptChange: (val: string) => void;
  defaultDuration: number;
  onDefaultDurationChange: (val: number) => void;
  disabled?: boolean;
}

export function MarkerTab({
  marker,
  onMarkerChange,
  scriptText,
  onScriptChange,
  defaultDuration,
  onDefaultDurationChange,
  disabled = false,
}: MarkerTabProps) {
  const insertDemo = () => {
    const demo =
      "Once upon a time in a misty ancient forest | a lone white wolf stood at the edge of the cliff | watching the aurora borealis illuminate the arctic sky | with breathtaking shades of violet and emerald green.";
    onScriptChange(demo);
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        {/* Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-slate-800/80">
          {/* Symbol Delimiter */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>Split Delimiter:</span>
              </div>
              <p className="text-[11px] text-slate-400">Separates each scene</p>
            </div>
            <input
              type="text"
              value={marker}
              onChange={(e) => onMarkerChange(e.target.value)}
              disabled={disabled}
              maxLength={5}
              className="w-14 text-center font-mono font-bold text-indigo-400 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Default Duration per Scene */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Default Duration:</span>
              </div>
              <p className="text-[11px] text-slate-400">Initial seconds per block</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
              <input
                type="number"
                min="1"
                max="60"
                value={defaultDuration}
                onChange={(e) => onDefaultDurationChange(Math.max(1, Number(e.target.value)))}
                disabled={disabled}
                className="w-10 text-center font-bold text-indigo-400 bg-transparent focus:outline-none text-sm"
              />
              <span className="text-xs text-slate-400">s</span>
            </div>
          </div>
        </div>

        {/* Script Textarea */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <AlignLeft className="w-4 h-4 text-slate-400" />
              <span>Paste Your Script (Separated by &ldquo;{marker}&rdquo;):</span>
            </div>
            <button
              type="button"
              onClick={insertDemo}
              disabled={disabled}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
            >
              Load Example Script
            </button>
          </div>

          <textarea
            value={scriptText}
            onChange={(e) => onScriptChange(e.target.value)}
            disabled={disabled}
            rows={6}
            placeholder={`Enter your voiceover script here separated by "${marker}". Example:\nScene 1 description ${marker} Scene 2 description ${marker} Scene 3 description`}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-y"
          />
        </div>

        {/* Informational Tip */}
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-xs text-slate-400">
          💡 <strong>100% Manual Control:</strong> No audio upload required! Clicking &ldquo;Generate Timeline&rdquo; will split your script into scenes, and you can freely edit each timestamp directly in the editor below.
        </div>
      </div>
    </div>
  );
}
