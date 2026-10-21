"use client";

import React, { useState, useEffect } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { IntervalTab } from "@/components/IntervalTab";
import { MarkerTab } from "@/components/MarkerTab";
import { ResultViewer } from "@/components/ResultViewer";
import { ChunkingProgress } from "@/components/ChunkingProgress";
import { FormattedTimestampBlock, ProcessingMode, WhisperWord } from "@/types/transcription";
import { chunkAudioFile, AudioChunk } from "@/lib/audio-chunker";
import { groupWordsByInterval } from "@/lib/interval-grouper";
import { alignScriptWithWords } from "@/lib/marker-aligner";
import { Clock, Tag, Wand2, ShieldCheck, Layers, AlertCircle } from "lucide-react";

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

  // Result & Error State
  const [resultBlocks, setResultBlocks] = useState<FormattedTimestampBlock[]>([]);
  const [formattedOutput, setFormattedOutput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Real-time symbol check for Marker mode
  useEffect(() => {
    if (activeMode === "marker" && scriptText.trim() && markerSymbol) {
      if (!scriptText.includes(markerSymbol)) {
        setWarningMessage(
          `Notice: Your script currently does not contain the delimiter "${markerSymbol}". Please insert "${markerSymbol}" between scenes to define timestamps.`
        );
      } else {
        setWarningMessage(null);
      }
    } else {
      setWarningMessage(null);
    }
  }, [activeMode, scriptText, markerSymbol]);

  const handleGenerate = async () => {
    if (!selectedFile) {
      alert("Please upload an audio or video file first!");
      return;
    }

    if (activeMode === "marker" && !scriptText.trim()) {
      alert("Please paste your marked voiceover script in the text box before generating!");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setChunkProgress(5);
    setChunkStatus("Initiating Web Audio Pipeline...");

    try {
      // Step 1: Client-Side Audio Extraction & 10-Minute Chunking
      const chunks = await chunkAudioFile(selectedFile, 600, (percent, status) => {
        setChunkProgress(Math.min(percent, 40));
        setChunkStatus(status);
      });

      setPreparedChunks(chunks);

      const allTranscribedWords: WhisperWord[] = [];
      const allIntervalBlocks: FormattedTimestampBlock[] = [];
      let totalAudioDuration = 0;
      let nextIndex = 1;

      // Step 2: Sequential Cloud Processing through Groq Whisper API
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        totalAudioDuration = Math.max(totalAudioDuration, chunk.endSeconds);

        const stepProgress = 40 + Math.round(((i + 1) / chunks.length) * 50);
        setChunkProgress(stepProgress);
        setChunkStatus(`Transcribing chunk ${i + 1} of ${chunks.length} with Whisper Large-v3...`);

        const formData = new FormData();
        formData.append("file", chunk.file);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to transcribe audio.");
        }

        const words: WhisperWord[] = data.words || [];

        // Adjust word timestamps by chunk offset
        const offsetWords = words.map((w) => ({
          word: w.word,
          start: chunk.startSeconds + w.start,
          end: chunk.startSeconds + w.end,
        }));

        allTranscribedWords.push(...offsetWords);

        // For Interval Mode: Group on the fly per chunk
        if (activeMode === "interval") {
          const chunkBlocks = groupWordsByInterval(
            words,
            intervalSeconds,
            chunk.startSeconds,
            nextIndex
          );
          allIntervalBlocks.push(...chunkBlocks);
          nextIndex += chunkBlocks.length;
        }
      }

      // Edge Case: No words detected
      if (allTranscribedWords.length === 0) {
        throw new Error(
          "No spoken words detected in the audio file. Please check audio volume and ensure clear speech."
        );
      }

      // Step 3: Format Output based on active mode
      let finalBlocks: FormattedTimestampBlock[] = [];

      if (activeMode === "interval") {
        finalBlocks = allIntervalBlocks;
      } else {
        // Phase 4: Forced Alignment on Symbol Marker
        setChunkStatus("Aligning marked script with spoken word timestamps...");
        finalBlocks = alignScriptWithWords(
          scriptText,
          markerSymbol,
          allTranscribedWords,
          totalAudioDuration
        );
      }

      const outputText = finalBlocks
        .map((b) => `[${b.startTime} - ${b.endTime}] ${b.text}`)
        .join("\n");

      setResultBlocks(finalBlocks);
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
        {/* Clean Central Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MNC Enterprise Architecture • 100% Free & Unlimited</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Sync<span className="text-indigo-400">Script</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
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

          {/* Warning Message Toast */}
          {warningMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>{warningMessage}</p>
            </div>
          )}

          {/* Error Message Toast */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{errorMessage}</p>
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
                  <span>Processing & Aligning Audio...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>
                    {activeMode === "interval"
                      ? "⚡ Transcribe & Generate Timestamps"
                      : "🎯 Align Script & Generate Timestamps"}
                  </span>
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

        {/* How It Works Explainer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>When to use Auto-Interval Mode</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ideal when you have raw voiceover audio and need new images/visuals at fixed rhythms (e.g. every 5 seconds for YouTube Shorts, Reels, or TikTok faceless channels).
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-4 h-4" />
              <span>When to use Symbol Marker Mode</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ideal when you already have a scripted story separated by visual scenes (&ldquo;|&rdquo;). Whisper aligns the spoken dialogue and stamps each scene with exact start/end seconds.
            </p>
          </div>
        </div>

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
