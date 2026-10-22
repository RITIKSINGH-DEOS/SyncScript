"use client";

import React, { useState } from "react";
import { Copy, Check, Download, Subtitles, ListChecks, Plus, Trash2, AlignLeft } from "lucide-react";
import { FormattedTimestampBlock } from "@/types/transcription";

interface ResultViewerProps {
  blocks: FormattedTimestampBlock[];
  formattedOutput: string;
  inlineScriptOutput?: string;
  onClear: () => void;
  onBlocksChange?: (updatedBlocks: FormattedTimestampBlock[]) => void;
}

export function ResultViewer({
  blocks,
  formattedOutput,
  inlineScriptOutput,
  onClear,
  onBlocksChange,
}: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  // Default view is "inline" (continuous story narrative with timestamps)
  const [viewMode, setViewMode] = useState<"inline" | "cards">("inline");

  // Choose the best text to copy based on active view mode
  const textToCopy = viewMode === "inline" && inlineScriptOutput ? inlineScriptOutput : formattedOutput;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    const content = viewMode === "inline" && inlineScriptOutput ? inlineScriptOutput : formattedOutput;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syncscript-story-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    const cleaned = timeStr.replace(/[()\[\]]/g, "").trim();
    const parts = cleaned.split(":").map(Number);
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    } else if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    return 0;
  };

  const formatSecondsToTime = (secs: number): string => {
    const total = Math.max(0, Math.floor(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleBlockChange = (index: number, field: "startTime" | "endTime" | "text", value: string) => {
    if (!onBlocksChange) return;

    const updated = blocks.map((b, i) => {
      if (i === index) {
        const newBlock = { ...b, [field]: value };
        if (field === "startTime") {
          newBlock.startSeconds = parseTimeToSeconds(value);
        } else if (field === "endTime") {
          newBlock.endSeconds = parseTimeToSeconds(value);
        }
        return newBlock;
      }
      return b;
    });

    onBlocksChange(updated);
  };

  const handleAddScene = () => {
    if (!onBlocksChange) return;

    const lastBlock = blocks[blocks.length - 1];
    const newStartSec = lastBlock ? lastBlock.endSeconds : 0;
    const newEndSec = newStartSec + 5;

    const newBlock: FormattedTimestampBlock = {
      index: blocks.length + 1,
      startTime: formatSecondsToTime(newStartSec),
      endTime: formatSecondsToTime(newEndSec),
      startSeconds: newStartSec,
      endSeconds: newEndSec,
      text: "New visual scene description...",
    };

    onBlocksChange([...blocks, newBlock]);
  };

  const handleDeleteScene = (index: number) => {
    if (!onBlocksChange || blocks.length <= 1) return;
    const filtered = blocks.filter((_, i) => i !== index);
    const reindexed = filtered.map((b, i) => ({ ...b, index: i + 1 }));
    onBlocksChange(reindexed);
  };

  const handleDownloadSrt = () => {
    let srtContent = "";
    blocks.forEach((block, index) => {
      const formatTimeSrt = (secs: number) => {
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs % 1) * 1000);
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };

      srtContent += `${index + 1}\n`;
      srtContent += `${formatTimeSrt(block.startSeconds)} --> ${formatTimeSrt(block.endSeconds)}\n`;
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Generated Script with Timestamps</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {blocks.length} timestamp points generated. Copy the whole script in 1 click!
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full sm:w-auto">
          {/* View Mode Selector: Ultra-Smooth Animated Sliding Pill */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 grid grid-cols-2 relative shadow-inner w-full max-w-[260px] sm:w-56 select-none overflow-hidden mx-auto sm:mx-0">
            {/* The Silky Sliding Pill Indicator */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                viewMode === "inline" ? "left-1" : "left-[calc(50%+2px)]"
              }`}
            />

            {/* Button 1: Full Script */}
            <button
              type="button"
              onClick={() => setViewMode("inline")}
              className={`relative z-10 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                viewMode === "inline" ? "text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Continuous narrative with (0:00) timestamps inline"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Full Script</span>
            </button>

            {/* Button 2: Edit Times */}
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`relative z-10 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                viewMode === "cards" ? "text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Edit individual timestamps manually"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Edit Times</span>
            </button>
          </div>

          {/* Export Action buttons */}
          <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
            {/* Big Copy Button */}
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-200 shadow-lg shadow-indigo-600/30 active:scale-95"
            title="Copy entire script with timestamps"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied All!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadTxt}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all duration-200 hover:border-slate-600"
            title="Download TXT file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </button>

          <button
            onClick={handleDownloadSrt}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-all duration-200 hover:border-indigo-400/50"
            title="Download Subtitles (.SRT)"
          >
            <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
            <span>.SRT</span>
          </button>
          </div>
        </div>
      </div>

      {/* Output Content with Silky Smooth Animated Crossfade */}
      <div className="relative min-h-[14rem] transition-all duration-300 ease-in-out">
        {viewMode === "inline" ? (
          /* The Exact Inline Story Paragraph Format requested by user */
          <div
            key="inline-story-view"
            className="animate-in fade-in duration-300 ease-out bg-slate-950 border border-slate-800 rounded-xl p-5 sm:p-6 max-h-[30rem] overflow-y-auto font-sans text-sm sm:text-base text-slate-200 leading-relaxed tracking-normal select-all whitespace-pre-wrap selection:bg-indigo-500/40 shadow-inner"
          >
            {inlineScriptOutput || formattedOutput}
          </div>
        ) : (
          /* Interactive Card Editor with Smooth Animation */
          <div
            key="cards-editor-view"
            className="animate-in fade-in duration-300 ease-out space-y-3 max-h-[28rem] overflow-y-auto pr-1"
          >
            {blocks.map((block, i) => (
              <div
                key={block.index}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700/80 transition-all duration-200 group shadow-sm"
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs font-semibold">
                    #{String(block.index).padStart(2, "0")}
                  </span>

                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/70 rounded-lg px-2 py-1">
                    <input
                      type="text"
                      value={block.startTime}
                      onChange={(e) => handleBlockChange(i, "startTime", e.target.value)}
                      placeholder="0:00"
                      className="w-12 bg-transparent text-center font-mono text-xs text-indigo-400 font-semibold focus:outline-none focus:text-indigo-300"
                    />
                    <span className="text-slate-500 font-mono text-xs">-</span>
                    <input
                      type="text"
                      value={block.endTime}
                      onChange={(e) => handleBlockChange(i, "endTime", e.target.value)}
                      placeholder="0:05"
                      className="w-12 bg-transparent text-center font-mono text-xs text-indigo-400 font-semibold focus:outline-none focus:text-indigo-300"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={block.text}
                  onChange={(e) => handleBlockChange(i, "text", e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-200 font-sans focus:outline-none focus:bg-slate-900/60 rounded px-2 py-1 transition-colors"
                />

                {onBlocksChange && blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteScene(i)}
                    className="opacity-60 group-hover:opacity-100 hover:text-rose-400 text-slate-500 p-1 rounded-lg transition-colors flex-shrink-0"
                    title="Delete this scene"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {onBlocksChange && (
              <button
                type="button"
                onClick={handleAddScene}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-indigo-500/5 text-xs text-slate-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Scene Block</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500 border-t border-slate-800/60">
        <span>
          💡 <strong>Tip:</strong> In &ldquo;Full Script&rdquo; view, timestamps (0:00), (0:05)... are embedded inline so you can copy the entire story in one click!
        </span>
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
