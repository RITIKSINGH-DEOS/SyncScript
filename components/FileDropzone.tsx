"use client";

import React, { useRef, useState, useEffect } from "react";
import { UploadCloud, Music, FileVideo, X, CheckCircle2, Play, Volume2 } from "lucide-react";

interface FileDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function FileDropzone({ selectedFile, onFileSelect, disabled = false }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationStr, setDurationStr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);

      const audio = document.createElement("audio");
      audio.src = url;
      audio.onloadedmetadata = () => {
        const d = audio.duration;
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
    }
  }, [selectedFile]);

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
      const file = e.dataTransfer.files[0];
      if (isValidMedia(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isValidMedia = (file: File) => {
    const validExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".mp4", ".mov", ".mkv", ".webm"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    return validExtensions.includes(ext) || file.type.startsWith("audio/") || file.type.startsWith("video/");
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
        accept="audio/*,video/mp4,video/quicktime,video/webm,.mp3,.wav,.m4a,.aac,.ogg,.opus,.mp4,.mov,.mkv"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
              : "border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            Drag & drop your audio or video file
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            Supports MP3, WAV, M4A, AAC, OGG, MP4, MOV (Auto-chunked if long)
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Or click to browse from device
          </span>
        </div>
      ) : (
        <div className="border border-slate-800 bg-slate-900/90 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0 flex items-center justify-center text-indigo-400">
                {selectedFile.type.startsWith("video/") || selectedFile.name.endsWith(".mp4") ? (
                  <FileVideo className="w-6 h-6" />
                ) : (
                  <Music className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  {durationStr && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-400 font-medium">{durationStr} duration</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-emerald-400">Ready</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onFileSelect(null)}
              disabled={disabled}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Inline Audio Player Preview */}
          {audioUrl && !selectedFile.type.startsWith("video/") && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Preview:</span>
              </div>
              <audio
                controls
                src={audioUrl}
                className="w-full h-8 accent-indigo-500 rounded-lg focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
