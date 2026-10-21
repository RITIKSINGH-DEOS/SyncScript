export interface AudioChunk {
  index: number;
  totalChunks: number;
  file: File;
  startSeconds: number;
  endSeconds: number;
  duration: number;
}

/**
 * Encodes an AudioBuffer slice into a standard 16-bit 16kHz mono PCM WAV File.
 * Whisper natively operates at 16,000 Hz.
 * Resampling to 16kHz mono reduces raw PCM file size by ~67% compared to 48kHz,
 * ensuring chunks always stay well below Groq's 25MB limit (~7.6MB for 4 minutes).
 */
function bufferTo16kMonoWav(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  filename: string
): File {
  const srcSampleRate = buffer.sampleRate;
  const targetSampleRate = 16000;
  const numChannels = buffer.numberOfChannels;

  const startSample = Math.floor(startSec * srcSampleRate);
  const endSample = Math.min(Math.floor(endSec * srcSampleRate), buffer.length);
  const srcLength = Math.max(0, endSample - startSample);

  // Compute number of samples at 16kHz
  const targetLength = Math.round(srcLength * (targetSampleRate / srcSampleRate));
  const monoData = new Float32Array(targetLength);

  // High-fidelity linear interpolation resampler + channel downmix
  for (let i = 0; i < targetLength; i++) {
    const srcPosition = startSample + (i * srcSampleRate) / targetSampleRate;
    const index0 = Math.floor(srcPosition);
    const index1 = Math.min(index0 + 1, buffer.length - 1);
    const fraction = srcPosition - index0;

    let sample0 = 0;
    let sample1 = 0;

    for (let c = 0; c < numChannels; c++) {
      const channel = buffer.getChannelData(c);
      sample0 += channel[index0] / numChannels;
      sample1 += channel[index1] / numChannels;
    }

    monoData[i] = sample0 + fraction * (sample1 - sample0);
  }

  // 16-bit PCM WAV layout
  const byteRate = targetSampleRate * 2; // 1 channel * 2 bytes/sample (16-bit)
  const blockAlign = 2;                  // 1 channel * 2 bytes/sample
  const dataByteLength = targetLength * 2;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, "WAVE");

  // "fmt " sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);                  // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);                   // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);                   // NumChannels (1 = Mono)
  view.setUint32(24, targetSampleRate, true);    // SampleRate = 16000
  view.setUint32(28, byteRate, true);            // ByteRate = 32000
  view.setUint16(32, blockAlign, true);          // BlockAlign = 2
  view.setUint16(34, 16, true);                  // BitsPerSample = 16

  // "data" sub-chunk
  writeString(36, "data");
  view.setUint32(40, dataByteLength, true);

  // Write 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < targetLength; i++) {
    const s = Math.max(-1, Math.min(1, monoData[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  return new File([blob], filename, { type: "audio/wav" });
}

/**
 * Analyzes audio and slices long files into safe 4-minute chunks (240s) at 16kHz mono.
 * Each chunk is strictly ~7.6MB, completely eliminating Groq 413 "Request Entity Too Large" errors.
 */
export async function chunkAudioFile(
  file: File,
  maxChunkSeconds = 240, // 4 minutes per chunk = ~7.6MB at 16kHz (well under 25MB)
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<AudioChunk[]> {
  const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".mov");

  // Small compressed audio files (mp3, m4a, webm) under 18MB and under maxChunkSeconds can bypass decoding
  if (!isVideo && file.size < 18 * 1024 * 1024) {
    const duration = await getAudioDurationFast(file);
    if (duration > 0 && duration <= maxChunkSeconds) {
      return [
        {
          index: 1,
          totalChunks: 1,
          file,
          startSeconds: 0,
          endSeconds: duration,
          duration,
        },
      ];
    }
  }

  onProgress?.(10, "Decoding and optimizing audio track (16kHz Whisper encoding)...");

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close();
  }

  const totalDuration = audioBuffer.duration;

  onProgress?.(30, `Audio duration: ${Math.round(totalDuration)}s. Slicing into safe chunks...`);

  const totalChunks = Math.ceil(totalDuration / maxChunkSeconds);
  const chunks: AudioChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startSec = i * maxChunkSeconds;
    const endSec = Math.min((i + 1) * maxChunkSeconds, totalDuration);
    const chunkDuration = endSec - startSec;

    const chunkFilename = `${file.name.replace(/\.[^/.]+$/, "")}-part-${i + 1}.wav`;
    const chunkFile = bufferTo16kMonoWav(audioBuffer, startSec, endSec, chunkFilename);

    chunks.push({
      index: i + 1,
      totalChunks,
      file: chunkFile,
      startSeconds: startSec,
      endSeconds: endSec,
      duration: chunkDuration,
    });

    const percent = Math.round(30 + ((i + 1) / totalChunks) * 60);
    onProgress?.(percent, `Prepared chunk ${i + 1} of ${totalChunks} (${(chunkFile.size / 1024 / 1024).toFixed(1)}MB)...`);
  }

  onProgress?.(100, `Ready! Prepared ${totalChunks} optimized chunks.`);
  return chunks;
}

/**
 * Fast duration probe using native HTMLAudioElement without full memory decoding
 */
function getAudioDurationFast(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration || 0);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(9999); // Fallback to full decode
    };
  });
}
