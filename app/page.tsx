"use client";

import React, { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { IntervalTab } from "@/components/IntervalTab";
import { MarkerTab } from "@/components/MarkerTab";
import { ResultViewer } from "@/components/ResultViewer";
import { ChunkingProgress } from "@/components/ChunkingProgress";
import { FormattedTimestampBlock, ProcessingMode } from "@/types/transcription";
import { chunkAudioFile, AudioChunk } from "@/lib/audio-chunker";
import { Clock, Tag, Wand2, ShieldCheck, Layers } from "lucide-react";

export default function Home() {
  const [activeMode, setActiveMode] = useState<ProcessingMode>("interval");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(5);
  const [markerSymbol, setMarkerSymbol] = useState<string>("|");
  const [scriptText, setScriptText] = useState<string>("");
  
  // Pipeline & Chunking State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [chunkProgress, setChunkProgress] = useState<number>(0);
  const [chunkStatus, setChunkStatus] = useState<string>("");
  const [preparedChunks, setPreparedChunks] = useState<AudioChunk[]>([]);
  
  // Result State
  const [resultBlocks, setResultBlocks] = useState<FormattedTimestampBlock[]>([]);
  const [formattedOutput, setFormattedOutput] = useState<string>("");

  const handleGenerate = async () => {
    if (!selectedFile) {
      alert("Please upload an audio or video file first!");
      return;
    }

    setIsProcessing(true);
    setChunkProgress(5);
    setChunkStatus("Initiating Web Audio Pipeline...");

    try {
      // Phase 2: Execute Client-Side Audio Chunking Engine
      const chunks = await chunkAudioFile(selectedFile, 600, (percent, status) => {
        setChunkProgress(percent);
        setChunkStatus(status);
      });

      setPreparedChunks(chunks);

      // Simulate Phase 2 chunk readiness with offset mapping
      let mockBlocks: FormattedTimestampBlock[] = [];
      let totalIndex = 1;

      chunks.forEach((chunk) => {
        const offset = chunk.startSeconds;
        if (activeMode === "interval") {
          const sampleLines = [
            "Once upon a time in a misty ancient forest",
            "A lone white wolf stood at the edge of the cliff",
            "Watching the aurora borealis illuminate the arctic sky",
          ];

          sampleLines.forEach((line, i) => {
            const startSec = offset + i * intervalSeconds;
            const endSec = offset + (i + 1) * intervalSeconds;

            const formatTime = (s: number) => {
              const m = Math.floor(s / 60);
              const sec = Math.floor(s % 60);
              return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
            };

            mockBlocks.push({
              index: totalIndex++,
              startTime: formatTime(startSec),
              endTime: formatTime(endSec),
              startSeconds: startSec,
              endSeconds: endSec,
              text: line,
            });
          });
        } else {
          const segments = scriptText
            ? scriptText.split(markerSymbol).map((s) => s.trim()).filter(Boolean)
            : [
                "A brave knight approached the ancient citadel",
                "Dragons circled the stormy crimson sky above",
                "Drawing his enchanted blade, he stood ready for destiny",
              ];

          segments.forEach((seg, idx) => {
            const startSec = offset + idx * 6;
            const endSec = offset + (idx + 1) * 6;
            const formatTime = (s: number) => {
              const m = Math.floor(s / 60);
              const sec = Math.floor(s % 60);
              return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
            };

            mockBlocks.push({
              index: totalIndex++,
              startTime: formatTime(startSec),
              endTime: formatTime(endSec),
              startSeconds: startSec,
              endSeconds: endSec,
              text: seg,
            });
          });
        }
      });

      const outputText = mockBlocks
        .map((b) => `[${b.startTime} - ${b.endTime}] ${b.text}`)
        .join("\n");

      setResultBlocks(mockBlocks);
      setFormattedOutput(outputText);
    } catch (err) {
      console.error("Audio processing failed:", err);
      alert("Failed to decode audio. Please ensure the file is a valid media format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setResultBlocks([]);
    setFormattedOutput("");
    setPreparedChunks([]);
    setChunkProgress(0);
    setChunkStatus("");
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MNC Enterprise Architecture • Client Audio Chunking Engine Ready</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Sync<span className="text-indigo-400">Script</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Convert audio into custom interval and symbol-aligned timestamped transcripts for AI video & image creators.
          </p>
        </header>

        {/* Interactive Mode Switcher (2 Tabs) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <button
              onClick={() => setActiveMode("interval")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeMode === "interval"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>⏱️ Auto-Interval Mode</span>
            </button>
            <button
              onClick={() => setActiveMode("marker")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeMode === "marker"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>🏷️ Symbol Marker Mode</span>
            </button>
          </div>
        </div>

        {/* Main Work Area Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Step 1: Upload */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Step 1: Upload Media
              </span>
              <span className="text-xs text-slate-500">Audio / Video auto-extracted</span>
            </div>
            <FileDropzone
              selectedFile={selectedFile}
              onFileSelect={(file) => {
                setSelectedFile(file);
                setPreparedChunks([]);
                setChunkProgress(0);
                setChunkStatus("");
              }}
              disabled={isProcessing}
            />
          </div>

          {/* Step 2: Settings based on active tab */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Step 2: Configure Mode
              </span>
              <span className="text-xs text-slate-500">
                {activeMode === "interval" ? "Fixed second pacing" : "Symbol-matched pacing"}
              </span>
            </div>

            {activeMode === "interval" ? (
              <IntervalTab
                interval={intervalSeconds}
                onIntervalChange={setIntervalSeconds}
                disabled={isProcessing}
              />
            ) : (
              <MarkerTab
                marker={markerSymbol}
                onMarkerChange={setMarkerSymbol}
                scriptText={scriptText}
                onScriptChange={setScriptText}
                disabled={isProcessing}
              />
            )}
          </div>

          {/* Audio Chunking Progress Indicator */}
          <ChunkingProgress
            progressPercent={chunkProgress}
            statusText={chunkStatus}
            isProcessing={isProcessing}
          />

          {/* Prepared Chunks Status Badge */}
          {preparedChunks.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Layers className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Pipeline Ready:</strong> {preparedChunks.length}{" "}
                {preparedChunks.length === 1 ? "Audio stream" : "Audio chunks (10-min slices)"}{" "}
                prepared with continuous timeline offsets.
              </span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedFile || isProcessing}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl ${
                !selectedFile || isProcessing
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25 active:scale-[0.99]"
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing Audio Track...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>⚡ Process Audio & Generate Timestamps</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 3: Result Viewer */}
        <ResultViewer
          blocks={resultBlocks}
          formattedOutput={formattedOutput}
          onClear={handleClear}
        />

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 pt-6 border-t border-slate-900 space-y-1">
          <p>
            SyncScript • Built with Next.js 14, Web Audio API & OpenAI Whisper engine.
          </p>
          <p className="text-slate-600">
            Complies with MNC Enterprise Engineering Lifecycle & SOP Standards.
          </p>
        </footer>
      </div>
    </main>
  );
}
