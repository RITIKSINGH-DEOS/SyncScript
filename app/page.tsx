"use client";

import React, { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { ResultViewer } from "@/components/ResultViewer";
import { ChunkingProgress } from "@/components/ChunkingProgress";
import { FormattedTimestampBlock, WhisperWord, WhisperSegment } from "@/types/transcription";
import { chunkAudioFile, AudioChunk } from "@/lib/audio-chunker";
import { groupWordsByNaturalSpeech } from "@/lib/interval-grouper";
import { alignScriptWithWords } from "@/lib/marker-aligner";
import { reconstructInlineScriptFromBlocks } from "@/lib/inline-script-formatter";
import { Wand2, Sparkles, AlertCircle, Tag, AlignLeft, Sparkle } from "lucide-react";

export default function Home() {
  // Audio state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Script & Delimiter state (AI Forced Speech-to-Script Alignment)
  const [scriptText, setScriptText] = useState<string>("");
  const [markerSymbol, setMarkerSymbol] = useState<string>("|");

  // Pipeline & Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [chunkProgress, setChunkProgress] = useState<number>(0);
  const [chunkStatus, setChunkStatus] = useState<string>("");

  // Result & Error State
  const [resultBlocks, setResultBlocks] = useState<FormattedTimestampBlock[]>([]);
  const [formattedOutput, setFormattedOutput] = useState<string>("");
  const [inlineScriptOutput, setInlineScriptOutput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize formatted text output whenever resultBlocks change
  const handleBlocksChange = (updatedBlocks: FormattedTimestampBlock[]) => {
    setResultBlocks(updatedBlocks);
    const outputText = updatedBlocks
      .map((b) => `[${b.startTime} - ${b.endTime}] ${b.text}`)
      .join("\n");
    setFormattedOutput(outputText);
    setInlineScriptOutput(reconstructInlineScriptFromBlocks(updatedBlocks));
  };

  const handleGenerate = async () => {
    setErrorMessage(null);

    if (!selectedFile) {
      alert("Please upload an audio or video voiceover file first!");
      return;
    }

    setIsProcessing(true);
    setChunkProgress(5);
    setChunkStatus("Initiating Web Audio Pipeline...");

    try {
      // Step 1: Client-Side Audio Extraction & 4-Minute Chunking (16kHz Whisper Encoding)
      const chunks = await chunkAudioFile(selectedFile, 240, (percent, status) => {
        setChunkProgress(Math.min(percent, 40));
        setChunkStatus(status);
      });

      const allWords: WhisperWord[] = [];
      const allSegments: WhisperSegment[] = [];
      let totalAudioDuration = 0;

      // Step 2: Sequential Cloud Processing through Groq Whisper API
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        const stepProgress = 40 + Math.round(((i + 1) / chunks.length) * 45);
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

        // Offset word and segment timestamps to global audio timeline
        const chunkWords: WhisperWord[] = (data.words || []).map((w: WhisperWord) => ({
          ...w,
          start: chunk.startSeconds + w.start,
          end: chunk.startSeconds + w.end,
        }));
        allWords.push(...chunkWords);

        const chunkSegments: WhisperSegment[] = (data.segments || []).map((s: WhisperSegment) => ({
          ...s,
          start: chunk.startSeconds + s.start,
          end: chunk.startSeconds + s.end,
        }));
        allSegments.push(...chunkSegments);

        totalAudioDuration = Math.max(totalAudioDuration, chunk.endSeconds);
      }

      // Edge Case: No words detected in speech
      if (allWords.length === 0) {
        throw new Error(
          "No spoken words detected in the audio file. Please check audio volume and ensure clear speech."
        );
      }

      setChunkProgress(90);
      setChunkStatus("Aligning timestamps with your script...");

      let finalBlocks: FormattedTimestampBlock[] = [];

      // Step 3: Speech-to-Script Alignment vs Natural Speech Detection
      const hasScriptWithMarkers = scriptText.trim().length > 0 && scriptText.includes(markerSymbol);

      if (hasScriptWithMarkers) {
        // Mode A: Forced Alignment - Match delimiter positions against real spoken audio
        finalBlocks = alignScriptWithWords(
          scriptText,
          markerSymbol,
          allWords,
          totalAudioDuration
        );
      } else {
        // Mode B: Automatic Natural Scene & Pause Detection
        finalBlocks = groupWordsByNaturalSpeech(
          allWords,
          allSegments,
          0,
          1
        );
      }

      handleBlocksChange(finalBlocks);
      setChunkProgress(100);
      setChunkStatus("Timestamps successfully calculated and embedded!");
    } catch (err: unknown) {
      console.error("Transcription pipeline failed:", err);
      const msg = err instanceof Error ? err.message : "Transcription failed.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const insertDemoScript = () => {
    const demo =
      "Imagine living thousands of years ago | There's no supermarket, no food labels | No scientific laboratory to tell you what's safe to eat | You're hungry, wandering through a misty ancient forest | when you discover a mysterious mushroom growing beneath a tree.";
    setScriptText(demo);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setScriptText("");
    setResultBlocks([]);
    setFormattedOutput("");
    setInlineScriptOutput("");
    setChunkProgress(0);
    setChunkStatus("");
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8">
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
            Upload voiceover audio + paste your marked script. AI automatically calculates the exact spoken timestamps for every scene marker!
          </p>
        </header>

        {/* Main Work Area Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-6">
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* Step 1: Upload Audio */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Step 1: Upload Audio or Video
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">MP3, WAV, M4A, MP4</span>
              </div>
              <FileDropzone
                selectedFile={selectedFile}
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  setChunkProgress(0);
                  setChunkStatus("");
                  setErrorMessage(null);
                }}
                disabled={isProcessing}
                onError={(err) => setErrorMessage(err)}
              />
            </div>

            {/* Step 2: Paste Script with Specific Delimiter */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400">
                    <AlignLeft className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Step 2: Script with Cut Markers</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-snug mt-0.5">
                    Insert &ldquo;{markerSymbol}&rdquo; wherever you want a scene cut.
                  </p>
                </div>

                {/* Marker Symbol & Demo loader */}
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 shadow-inner">
                    <Tag className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-400">Marker:</span>
                    <input
                      type="text"
                      value={markerSymbol}
                      onChange={(e) => setMarkerSymbol(e.target.value || "|")}
                      disabled={isProcessing}
                      maxLength={3}
                      className="w-5 text-center font-mono font-bold text-indigo-300 bg-transparent focus:outline-none text-[11px]"
                      title="Symbol used in script to split scenes (e.g. |)"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={insertDemoScript}
                    disabled={isProcessing}
                    className="text-[11px] sm:text-xs text-indigo-300 hover:text-white font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all whitespace-nowrap active:scale-95"
                  >
                    Load Sample
                  </button>
                </div>
              </div>

              {/* Generous, comfortable, large Textarea */}
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                disabled={isProcessing}
                rows={5}
                placeholder="Example: Imagine living thousands of years ago | There's no supermarket | No food labels | No scientific laboratory to tell you what's safe to eat..."
                className="w-full min-h-[140px] sm:min-h-[220px] bg-slate-900/90 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 transition-all resize-y leading-relaxed font-sans shadow-inner outline-none"
              />

              {/* Informational Guidance */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
                <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                <span>
                  AI automatically detects speech timestamps for each &ldquo;{markerSymbol}&rdquo; cut.
                </span>
              </div>
            </div>
          </div>

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

          {/* Action Trigger */}
          <div className="pt-1">
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !selectedFile}
              className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                isProcessing || !selectedFile
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25 active:scale-[0.99]"
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                  <span className="truncate">Processing Audio & Timestamps...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {scriptText.trim().includes(markerSymbol)
                      ? "Calculate Script Timestamps"
                      : "Generate Natural Timestamps"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Viewer & Interactive Timeline Editor */}
        <ResultViewer
          blocks={resultBlocks}
          formattedOutput={formattedOutput}
          inlineScriptOutput={inlineScriptOutput}
          onClear={handleClear}
          onBlocksChange={handleBlocksChange}
        />

        {/* Feature Explainer Card */}
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center sm:items-start gap-2.5 sm:gap-3">
          <Sparkle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400 truncate">
              Speech-to-Script Forced Alignment
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-400 leading-snug line-clamp-2">
              AI automatically matches script cut markers with spoken words in the voiceover — zero manual timeline scrubbing.
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
