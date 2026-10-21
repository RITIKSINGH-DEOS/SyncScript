"use client";

import React from "react";
import { Tag, HelpCircle, AlignLeft } from "lucide-react";

interface MarkerTabProps {
  marker: string;
  onMarkerChange: (val: string) => void;
  scriptText: string;
  onScriptChange: (val: string) => void;
  disabled?: boolean;
}

export function MarkerTab({
  marker,
  onMarkerChange,
  scriptText,
  onScriptChange,
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
        {/* Symbol Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-400" />
              <label htmlFor="marker-input" className="text-sm font-semibold text-white">
                Split Delimiter Symbol
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Wherever this symbol appears in your script, a cut will be aligned with the audio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Active Symbol:</span>
            <input
              id="marker-input"
              type="text"
              value={marker}
              onChange={(e) => onMarkerChange(e.target.value)}
              disabled={disabled}
              maxLength={5}
              className="w-14 text-center font-mono font-bold text-indigo-400 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Script Textarea */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <AlignLeft className="w-4 h-4 text-slate-400" />
              <span>Paste Your Marked Script:</span>
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
            rows={5}
            placeholder={`Enter your voiceover script here separated by "${marker}". Example:\nScene 1 description ${marker} Scene 2 description ${marker} Scene 3 description`}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-y"
          />
        </div>

        {/* Informational Tip */}
        <div className="flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-xs text-slate-400">
          <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>How it works:</strong> Whisper will transcribe your audio track, find the exact spoken timing of the words immediately preceding your &ldquo;{marker}&rdquo; delimiter, and assign start/end timestamps to each section.
          </span>
        </div>
      </div>
    </div>
  );
}
