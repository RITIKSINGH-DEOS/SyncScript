"use client";

import React, { useState } from "react";
import { Copy, Check, Download, FileText, Subtitles, ListChecks } from "lucide-react";
import { FormattedTimestampBlock } from "@/types/transcription";

interface ResultViewerProps {
  blocks: FormattedTimestampBlock[];
  formattedOutput: string;
  onClear: () => void;
}

export function ResultViewer({ blocks, formattedOutput, onClear }: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "cards">("formatted");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = formattedOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([formattedOutput], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syncscript-transcript-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    let srtContent = "";
    blocks.forEach((block, index) => {
      const formatTime = (secs: number) => {
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 1000);
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };

      srtContent += `${index + 1}\n`;
      srtContent += `${formatTime(block.startSeconds)} --> ${formatTime(block.endSeconds)}\n`;
      srtContent += `${block.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syncscript-subtitles-${Date.now()}.srt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-300">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Generated Transcripts & Timestamps</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {blocks.length} timestamped scene blocks generated successfully.
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode("formatted")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "formatted"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text View</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "cards"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Scene Cards</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadTxt}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download TXT file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </button>

          <button
            onClick={handleDownloadSrt}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download Subtitles (.SRT)"
          >
            <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
            <span>.SRT</span>
          </button>
        </div>
      </div>

      {/* Output Content */}
      {viewMode === "formatted" ? (
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/40">
          {formattedOutput}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {blocks.map((block) => (
            <div
              key={block.index}
              className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs font-semibold">
                  Scene #{String(block.index).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs text-slate-400 font-medium">
                  [{block.startTime} - {block.endTime}]
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 flex-1 font-sans sm:text-right">
                {block.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom info */}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
        <span>Click .TXT to save locally or .SRT for video editors (Premiere, CapCut).</span>
        <button
          onClick={onClear}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Clear output
        </button>
      </div>
    </div>
  );
}
