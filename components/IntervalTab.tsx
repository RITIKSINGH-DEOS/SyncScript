"use client";

import React from "react";
import { Clock, Sparkles } from "lucide-react";

interface IntervalTabProps {
  interval: number;
  onIntervalChange: (val: number) => void;
  disabled?: boolean;
}

export function IntervalTab({ interval, onIntervalChange, disabled = false }: IntervalTabProps) {
  const presets = [3, 4, 5, 8, 10, 15];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <label htmlFor="interval-slider" className="text-sm font-semibold text-white">
                Timestamp Interval Duration
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Groups spoken words into exact fixed time windows for image/video pacing.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
            <span className="text-xl font-bold text-indigo-400">{interval}</span>
            <span className="text-xs font-medium text-slate-300">seconds / block</span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-3">
          <input
            id="interval-slider"
            type="range"
            min="2"
            max="30"
            step="1"
            value={interval}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>2s (Fast Reels)</span>
            <span>15s (Narrative)</span>
            <span>30s (Longform)</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-slate-400">Quick Presets:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onIntervalChange(preset)}
                disabled={disabled}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  interval === preset
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
                }`}
              >
                {preset}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
