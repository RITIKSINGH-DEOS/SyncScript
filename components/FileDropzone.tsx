"use client";

import React, { useRef, useState, useEffect } from "react";
import { UploadCloud, Music, FileVideo, X, CheckCircle2, Play, Pause, Volume2, VolumeX, AlertTriangle } from "lucide-react";

interface FileDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  onError?: (errorMessage: string | null) => void;
}

export function FileDropzone({ selectedFile, onFileSelect, disabled = false, onError }: FileDropzoneProps) {
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationStr, setDurationStr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Custom Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      setFormatWarning(null);
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);

      const audio = document.createElement("audio");
      audio.src = url;
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        setDuration(d);
        if (d && !isNaN(d)) {
          const m = Math.floor(d / 60);
          const s = Math.floor(d % 60);
          setDurationStr(`${m}m ${s}s`);
        }
      };

      return () => {
        URL.revokeObjectURL(url);
        setAudioUrl(null);
        setDurationStr(null);
      };
    } else {
      setAudioUrl(null);
      setDurationStr(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [selectedFile]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (d && !isNaN(d)) {
      setDuration(d);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatAudioTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const isValidMedia = (file: File) => {
    const validExtensions = [
      ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".flac",
      ".mp4", ".mpeg", ".mpg", ".mpga", ".mov", ".mkv", ".webm"
    ];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    return validExtensions.includes(ext) || file.type.startsWith("audio/") || file.type.startsWith("video/");
  };

  const handleIncomingFile = (file: File) => {
    if (!isValidMedia(file)) {
      const ext = file.name.includes(".")
        ? file.name.substring(file.name.lastIndexOf(".")).toUpperCase()
        : "UNKNOWN";
      const warning = `Format "${ext}" is not supported. Please upload an audio or video file (MP3, WAV, M4A, MP4, MPEG).`;
      setFormatWarning(warning);
      onError?.(warning);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFormatWarning(null);
    onError?.(null);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleIncomingFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleIncomingFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/quicktime,video/webm,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.mp4,.mpeg,.mpg,.mpga,.mov,.mkv,.webm"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      {!selectedFile ? (
        <div>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-7 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
                : "border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-white mb-1">
              <span className="sm:hidden">Tap to choose audio or video</span>
              <span className="hidden sm:inline">Drag &amp; drop audio or video file</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-2.5">
              Supports MP3, WAV, M4A, MP4 (Auto-chunked)
            </p>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Browse Files
            </span>
          </div>

          {/* Unsupported Format Warning Alert */}
          {formatWarning && (
            <div className="mt-3 flex items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in slide-in-from-top-1 duration-200 shadow-md">
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="leading-snug">{formatWarning}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormatWarning(null);
                  onError?.(null);
                }}
                className="text-amber-400/80 hover:text-amber-200 p-0.5 rounded transition-colors flex-shrink-0"
                title="Dismiss warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                {selectedFile.type.startsWith("video/") || selectedFile.name.endsWith(".mp4") ? (
                  <FileVideo className="w-5 h-5" />
                ) : (
                  <Music className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                  {selectedFile.name}
                </p>

                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                  <span className="whitespace-nowrap">{formatFileSize(selectedFile.size)}</span>
                  {durationStr && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-400 font-medium whitespace-nowrap">{durationStr}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Ready</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onFileSelect(null);
                setFormatWarning(null);
                onError?.(null);
              }}
              disabled={disabled}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Custom Sleek Dark Audio Player Preview */}
          {audioUrl && !selectedFile.type.startsWith("video/") && (
            <div className="pt-2 border-t border-slate-800/80">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center gap-3 shadow-inner">
                {/* Play / Pause Toggle with Subtle Glow */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                  title={isPlaying ? "Pause audio" : "Play preview"}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  )}
                </button>

                {/* Timestamp Display */}
                <div className="font-mono text-xs text-indigo-300 font-semibold flex-shrink-0 min-w-[70px]">
                  <span>{formatAudioTime(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-400">{formatAudioTime(duration)}</span>
                </div>

                {/* Sleek Custom Range Track */}
                <div className="flex-1 relative flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none transition-all group-hover:h-2"
                  />
                </div>

                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
