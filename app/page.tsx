"use client";

import React, { useState, useEffect } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { IntervalTab } from "@/components/IntervalTab";
import { MarkerTab } from "@/components/MarkerTab";
import { ResultViewer } from "@/components/ResultViewer";
import { ChunkingProgress } from "@/components/ChunkingProgress";
import { FormattedTimestampBlock, ProcessingMode, WhisperWord } from "@/types/transcription";
import { chunkAudioFile, AudioChunk } from "@/lib/audio-chunker";
import { groupWordsByInterval, formatTimeCode } from "@/lib/interval-grouper";
import { Clock, Tag, Wand2, Sparkles, Layers, AlertCircle, Sparkle } from "lucide-react";

export default function Home() {
  const [activeMode, setActiveMode] = useState<ProcessingMode>("interval");
  
  // Mode 1: Audio state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(5);
  
  // Mode 2: Script state (No audio needed!)
  const [markerSymbol, setMarkerSymbol] = useState<string>("|");
  const [scriptText, setScriptText] = useState<string>("");
  const [defaultDuration, setDefaultDuration] = useState<number>(5);
  
  // Pipeline & Processing State
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
          `Notice: Your script does not contain "${markerSymbol}". Insert "${markerSymbol}" between scenes to define timeline cuts.`
        );
      } else {
        setWarningMessage(null);
      }
    } else {
      setWarningMessage(null);
    }
  }, [activeMode, scriptText, markerSymbol]);

  // Synchronize formatted text output whenever resultBlocks change
  const handleBlocksChange = (updatedBlocks: FormattedTimestampBlock[]) => {
    setResultBlocks(updatedBlocks);
    const outputText = updatedBlocks
      .map((b) => `[${b.startTime} - ${b.endTime}] ${b.text}`)
      .join("\n");
    setFormattedOutput(outputText);
  };

  const handleGenerate = async () => {
    setErrorMessage(null);

    // MODE 2: Script Timeline Mode (NO AUDIO NEEDED!)
    if (activeMode === "marker") {
      if (!scriptText.trim()) {
        alert("Please paste your script with delimiter symbols (e.g. |) first!");
        return;
      }

      setIsProcessing(true);
      setChunkProgress(20);
      setChunkStatus("Parsing script scenes...");

      setTimeout(() => {
        const rawSegments = scriptText
          .split(markerSymbol)
          .map((s) => s.trim())
          .filter(Boolean);

        if (rawSegments.length === 0) {
          setIsProcessing(false);
          setErrorMessage("No valid scenes found. Please insert delimiter symbol between text.");
          return;
        }

        const generatedBlocks: FormattedTimestampBlock[] = rawSegments.map((seg, idx) => {
          const startSec = idx * defaultDuration;
          const endSec = (idx + 1) * defaultDuration;

          return {
            index: idx + 1,
            startTime: formatTimeCode(startSec),
            endTime: formatTimeCode(endSec),
            startSeconds: startSec,
            endSeconds: endSec,
            text: seg,
          };
        });

        handleBlocksChange(generatedBlocks);
        setChunkProgress(100);
        setChunkStatus("Timeline generated! You can directly edit any timestamp below.");
        setIsProcessing(false);
      }, 300);
      return;
    }

    // MODE 1: Audio Mode (Requires Media File)
    if (!selectedFile) {
      alert("Please upload an audio or video file first!");
      return;
    }

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

      const allIntervalBlocks: FormattedTimestampBlock[] = [];
      let nextIndex = 1;

      // Step 2: Sequential Cloud Processing through Groq Whisper API
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

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

        // Group into fixed interval blocks
        const chunkBlocks = groupWordsByInterval(
          words,
          intervalSeconds,
          chunk.startSeconds,
          nextIndex
        );
        allIntervalBlocks.push(...chunkBlocks);
        nextIndex += chunkBlocks.length;
      }

      // Edge Case: No words detected
      if (allIntervalBlocks.length === 0) {
        throw new Error(
          "No spoken words detected in the audio file. Please check audio volume and ensure clear speech."
        );
      }

      handleBlocksChange(allIntervalBlocks);
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
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Speech & Timeline Alignment • 100% Free</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Sync<span className="text-indigo-400">Script</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Generate custom interval transcripts and editable scene timelines for AI video & image creators.
          </p>
        </header>

        {/* Interactive Mode Switcher (2 Tabs) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <button
              onClick={() => {
                setActiveMode("interval");
                handleClear();
              }}
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
              onClick={() => {
                setActiveMode("marker");
                handleClear();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeMode === "marker"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>🏷️ Script Timeline Mode</span>
            </button>
          </div>
        </div>

        {/* Main Work Area Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* TAB 1: Auto-Interval Mode with Audio Upload */}
          {activeMode === "interval" ? (
            <>
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

              {/* Step 2: Settings */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Step 2: Configure Time Interval
                  </span>
                  <span className="text-xs text-slate-500">Fixed second pacing</span>
                </div>

                <IntervalTab
                  interval={intervalSeconds}
                  onIntervalChange={setIntervalSeconds}
                  disabled={isProcessing}
                />
              </div>
            </>
          ) : (
            /* TAB 2: Script Timeline Mode (NO AUDIO UPLOAD NEEDED!) */
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Step 1: Paste Marked Script & Set Defaults
                </span>
                <span className="text-xs text-emerald-400 font-medium">No audio required • Fully editable</span>
              </div>

              <MarkerTab
                marker={markerSymbol}
                onMarkerChange={setMarkerSymbol}
                scriptText={scriptText}
                onScriptChange={setScriptText}
                defaultDuration={defaultDuration}
                onDefaultDurationChange={setDefaultDuration}
                disabled={isProcessing}
              />
            </div>
          )}

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

          {/* Audio Chunking Progress Indicator (Only in Audio Mode) */}
          {activeMode === "interval" && (
            <ChunkingProgress
              progressPercent={chunkProgress}
              statusText={chunkStatus}
              isProcessing={isProcessing}
            />
          )}

          {/* Prepared Chunks Status Badge (Only in Audio Mode) */}
          {activeMode === "interval" && preparedChunks.length > 0 && !isProcessing && (
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
              disabled={isProcessing || (activeMode === "interval" && !selectedFile)}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl ${
                isProcessing || (activeMode === "interval" && !selectedFile)
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25 active:scale-[0.99]"
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>
                    {activeMode === "interval"
                      ? "Processing & Transcribing Audio..."
                      : "Generating Editable Timeline..."}
                  </span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>
                    {activeMode === "interval"
                      ? "⚡ Transcribe & Generate Timestamps"
                      : "🎯 Generate Editable Timeline & Scenes"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 3: Result Viewer & Interactive Timeline Editor */}
        <ResultViewer
          blocks={resultBlocks}
          formattedOutput={formattedOutput}
          onClear={handleClear}
          onBlocksChange={handleBlocksChange}
        />

        {/* Mode Quick Guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Auto-Interval Mode (Audio)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload voiceover audio. Whisper AI transcribes and slices it into fixed blocks (e.g. 5s) for reels and shorts.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-4 h-4" />
              <span>Script Timeline Mode (No Audio)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              No audio needed. Paste script with &ldquo;|&rdquo; delimiters to generate scenes, then freely edit timestamps and durations manually!
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 pt-6 border-t border-slate-900">
          <p>SyncScript • Fast Audio Timestamps for Video Creators</p>
        </footer>
      </div>
    </main>
  );
}
