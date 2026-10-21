"use client";

import React, { useState, useEffect } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { IntervalTab } from "@/components/IntervalTab";
import { MarkerTab } from "@/components/MarkerTab";
import { ResultViewer } from "@/components/ResultViewer";
import { ChunkingProgress } from "@/components/ChunkingProgress";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { FormattedTimestampBlock, ProcessingMode, WhisperWord } from "@/types/transcription";
import { chunkAudioFile, AudioChunk } from "@/lib/audio-chunker";
import { groupWordsByInterval } from "@/lib/interval-grouper";
import { Clock, Tag, Wand2, ShieldCheck, Layers, Key, AlertCircle } from "lucide-react";

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
  
  // API Key State (LocalStorage BYOK)
  const [apiKey, setApiKey] = useState<string>("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  // Result State
  const [resultBlocks, setResultBlocks] = useState<FormattedTimestampBlock[]>([]);
  const [formattedOutput, setFormattedOutput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("syncscript_groq_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("syncscript_groq_api_key", key);
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      alert("Please upload an audio or video file first!");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setChunkProgress(5);
    setChunkStatus("Initiating Web Audio Pipeline...");

    try {
      // Step 1: Client-Side Audio Extraction & 10-Minute Chunking
      const chunks = await chunkAudioFile(selectedFile, 600, (percent, status) => {
        setChunkProgress(Math.min(percent, 45));
        setChunkStatus(status);
      });

      setPreparedChunks(chunks);

      const allBlocks: FormattedTimestampBlock[] = [];
      let nextIndex = 1;

      // Step 2: Sequential Cloud Processing through Groq Whisper API
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const stepProgress = 45 + Math.round(((i + 1) / chunks.length) * 50);
        setChunkProgress(stepProgress);
        setChunkStatus(`Transcribing chunk ${i + 1} of ${chunks.length} with Whisper Large-v3...`);

        const formData = new FormData();
        formData.append("file", chunk.file);
        if (apiKey) {
          formData.append("apiKey", apiKey);
        }

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (res.status === 401 || data.error?.includes("Groq API key")) {
            setIsKeyModalOpen(true);
          }
          throw new Error(data.error || "Failed to transcribe audio.");
        }

        const words: WhisperWord[] = data.words || [];

        // Step 3: Phase 3 Real Interval Bucketing Logic
        if (activeMode === "interval") {
          const chunkBlocks = groupWordsByInterval(
            words,
            intervalSeconds,
            chunk.startSeconds,
            nextIndex
          );
          allBlocks.push(...chunkBlocks);
          nextIndex += chunkBlocks.length;
        } else {
          // Placeholder for Phase 4 Marker logic (simulated until Phase 4)
          const segments = scriptText
            ? scriptText.split(markerSymbol).map((s) => s.trim()).filter(Boolean)
            : ["Sample line one", "Sample line two"];

          segments.forEach((seg, idx) => {
            const startSec = chunk.startSeconds + idx * 5;
            const endSec = chunk.startSeconds + (idx + 1) * 5;
            allBlocks.push({
              index: nextIndex++,
              startTime: `00:${String(startSec).padStart(2, "0")}`,
              endTime: `00:${String(endSec).padStart(2, "0")}`,
              startSeconds: startSec,
              endSeconds: endSec,
              text: seg,
            });
          });
        }
      }

      const outputText = allBlocks
        .map((b) => `[${b.startTime} - ${b.endTime}] ${b.text}`)
        .join("\n");

      setResultBlocks(allBlocks);
      setFormattedOutput(outputText);
      setChunkProgress(100);
      setChunkStatus("Transcription & timestamp generation complete!");
    } catch (err: unknown) {
      console.error("Transcription pipeline failed:", err);
      const msg = err instanceof Error ? err.message : "Transcription failed.";
      setErrorMessage(msg);
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
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>MNC Enterprise Architecture • Whisper Large-v3 Powered</span>
            </div>

            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{apiKey ? "API Key Configured" : "Add Groq Key (Free)"}</span>
            </button>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Sync<span className="text-indigo-400">Script</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Convert audio into custom interval and symbol-aligned timestamped transcripts for AI video & image creators.
            </p>
          </div>
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
                setErrorMessage(null);
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

          {/* Error Message Toast */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{errorMessage}</p>
                {errorMessage.includes("Groq API key") && (
                  <button
                    onClick={() => setIsKeyModalOpen(true)}
                    className="underline text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Click here to enter your free Groq API key
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Audio Chunking Progress Indicator */}
          <ChunkingProgress
            progressPercent={chunkProgress}
            statusText={chunkStatus}
            isProcessing={isProcessing}
          />

          {/* Prepared Chunks Status Badge */}
          {preparedChunks.length > 0 && !isProcessing && (
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
                  <span>Processing & Transcribing Audio...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>⚡ Transcribe & Generate Timestamps</span>
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

      {/* Groq API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        currentKey={apiKey}
      />
    </main>
  );
}
