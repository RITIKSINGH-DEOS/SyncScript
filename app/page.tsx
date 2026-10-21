"use client";

import React, { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { ResultViewer } from "@/components/ResultViewer";
import { ChunkingProgress } from "@/components/ChunkingProgress";
import { FormattedTimestampBlock, WhisperWord, WhisperSegment } from "@/types/transcription";
import { chunkAudioFile, AudioChunk } from "@/lib/audio-chunker";
import { groupWordsByNaturalSpeech } from "@/lib/interval-grouper";
import { reconstructInlineScriptFromBlocks } from "@/lib/inline-script-formatter";
import { Wand2, Sparkles, Layers, AlertCircle, Headphones } from "lucide-react";

export default function Home() {
  // Audio state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Pipeline & Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [chunkProgress, setChunkProgress] = useState<number>(0);
  const [chunkStatus, setChunkStatus] = useState<string>("");
  const [preparedChunks, setPreparedChunks] = useState<AudioChunk[]>([]);

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
      alert("Please upload an audio or video file first!");
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
        const segments: WhisperSegment[] = data.segments || [];

        // Group into natural speech scene blocks (speech pauses + complete sentences)
        const chunkBlocks = groupWordsByNaturalSpeech(
          words,
          segments,
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
      setChunkStatus("Natural scene cuts & timestamps generated successfully!");
    } catch (err: unknown) {
      console.error("Transcription pipeline failed:", err);
      const msg = err instanceof Error ? err.message : "Transcription failed.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResultBlocks([]);
    setFormattedOutput("");
    setInlineScriptOutput("");
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
            Upload your voiceover to generate natural scene timestamps and formatted scripts for AI video creators.
          </p>
        </header>

        {/* Main Work Area Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Step 1: Upload */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Step 1: Upload Audio or Video
                </span>
                <span className="text-xs text-emerald-400 font-medium">Automatic Natural Scene Detection</span>
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

            {/* AI Smart Scene Pacing Card */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs shadow-sm">
              <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">AI Natural Sentence & Pause Detection</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Whisper AI automatically cuts scenes at natural speech pauses and complete sentences. Words and sentences are never cut midway.
                </p>
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

          {/* Prepared Chunks Status Badge */}
          {preparedChunks.length > 0 && !isProcessing && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Layers className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Pipeline Ready:</strong> {preparedChunks.length}{" "}
                {preparedChunks.length === 1 ? "Audio stream" : "Audio chunks (4-min slices)"}{" "}
                prepared with continuous timeline offsets.
              </span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !selectedFile}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300 shadow-xl ${
                isProcessing || !selectedFile
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25 active:scale-[0.99]"
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Transcribing & Detecting Natural Scenes...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>⚡ Transcribe & Generate Natural Scenes</span>
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
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4 flex items-start gap-3">
          <Headphones className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Natural Speech AI Segmentation
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload any voiceover audio or video. Groq Whisper Large-v3 transcribes speech and naturally segments it into 3.5s - 7s video scene cuts based on breath pauses and full sentences.
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
