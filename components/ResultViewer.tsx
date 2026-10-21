"use client";

import React, { useState } from "react";
import { Copy, Check, Download, FileText, Subtitles, ListChecks, Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { FormattedTimestampBlock } from "@/types/transcription";

interface ResultViewerProps {
  blocks: FormattedTimestampBlock[];
  formattedOutput: string;
  onClear: () => void;
  onBlocksChange?: (updatedBlocks: FormattedTimestampBlock[]) => void;
}

export function ResultViewer({ blocks, formattedOutput, onClear, onBlocksChange }: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "cards">("cards");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.trim().split(":").map(Number);
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
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  const handleAutoChain = () => {
    if (!onBlocksChange || blocks.length < 2) return;

    let prevEnd = blocks[0].endSeconds;
    const updated = blocks.map((b, i) => {
      if (i === 0) return b;
      const duration = Math.max(1, b.endSeconds - b.startSeconds);
      const newStart = prevEnd;
      const newEnd = newStart + duration;
      prevEnd = newEnd;

      return {
        ...b,
        startSeconds: newStart,
        endSeconds: newEnd,
        startTime: formatSecondsToTime(newStart),
        endTime: formatSecondsToTime(newEnd),
      };
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 animate-in fade-in duration-300">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-semibold text-white">Interactive Timeline & Timestamps</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {blocks.length} scenes generated. You can directly edit any timestamp or text below!
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onBlocksChange && blocks.length > 1 && (
            <button
              onClick={handleAutoChain}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Automatically connect end times to next start times"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Chain Times</span>
            </button>
          )}

          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "cards"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Interactive Editor</span>
            </button>
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
        <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {blocks.map((block, i) => (
            <div
              key={block.index}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700/80 transition-all group"
            >
              {/* Left: Badge & Editable Timestamps */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs font-semibold">
                  #{String(block.index).padStart(2, "0")}
                </span>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/70 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    value={block.startTime}
                    onChange={(e) => handleBlockChange(i, "startTime", e.target.value)}
                    placeholder="00:00"
                    className="w-12 bg-transparent text-center font-mono text-xs text-slate-200 font-semibold focus:outline-none focus:text-indigo-400"
                  />
                  <span className="text-slate-500 font-mono text-xs">-</span>
                  <input
                    type="text"
                    value={block.endTime}
                    onChange={(e) => handleBlockChange(i, "endTime", e.target.value)}
                    placeholder="00:05"
                    className="w-12 bg-transparent text-center font-mono text-xs text-indigo-400 font-semibold focus:outline-none focus:text-indigo-300"
                  />
                </div>
              </div>

              {/* Center: Editable Text */}
              <input
                type="text"
                value={block.text}
                onChange={(e) => handleBlockChange(i, "text", e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-200 font-sans focus:outline-none focus:bg-slate-900/60 rounded px-2 py-1 transition-colors"
              />

              {/* Right: Delete Scene */}
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

          {/* Add Scene Button */}
          {onBlocksChange && (
            <button
              type="button"
              onClick={handleAddScene}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-indigo-500/5 text-xs text-slate-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Scene Block</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500 border-t border-slate-800/60">
        <span>✏️ Timestamps and text are editable. All exports (.TXT & .SRT) update in real-time.</span>
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
