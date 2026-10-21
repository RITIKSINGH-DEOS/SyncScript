"use client";

import React from "react";
import { Loader2, Scissors, CheckCircle } from "lucide-react";

interface ChunkingProgressProps {
  progressPercent: number;
  statusText: string;
  isProcessing: boolean;
}

export function ChunkingProgress({ progressPercent, statusText, isProcessing }: ChunkingProgressProps) {
  if (!isProcessing && progressPercent === 0) return null;

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {progressPercent < 100 ? (
            <Scissors className="w-4 h-4 text-indigo-400 animate-pulse" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-semibold text-slate-200">Audio Pipeline Status</span>
        </div>
        <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div
          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate max-w-sm">{statusText}</span>
        {progressPercent < 100 && (
          <span className="flex items-center gap-1 text-slate-500 flex-shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        )}
      </div>
    </div>
  );
}
