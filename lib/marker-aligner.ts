import { WhisperWord, FormattedTimestampBlock } from "@/types/transcription";
import { formatTimeCode } from "./interval-grouper";

/**
 * Normalizes words by lowercasing and stripping punctuation for comparison.
 */
function cleanWord(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]|_/g, "").trim();
}

/**
 * Calculates Levenshtein edit distance between two strings for fuzzy matching.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Checks if two words match either exactly or fuzzily (<= 1-2 typo distance).
 */
function isWordMatch(scriptWord: string, whisperWord: string): boolean {
  const s = cleanWord(scriptWord);
  const w = cleanWord(whisperWord);
  if (!s || !w) return false;
  if (s === w) return true;
  if (s.length > 3 && (s.includes(w) || w.includes(s))) return true;
  const maxDistance = s.length > 5 ? 2 : 1;
  return levenshtein(s, w) <= maxDistance;
}

/**
 * Aligns user-provided script segments (split by marker symbol)
 * with Whisper's transcribed word timestamps.
 * Automatically discovers where each segment is spoken in the audio.
 */
export function alignScriptWithWords(
  scriptText: string,
  markerSymbol: string = "|",
  transcribedWords: WhisperWord[],
  totalAudioDuration: number = 0
): FormattedTimestampBlock[] {
  if (!transcribedWords || transcribedWords.length === 0) {
    return [];
  }

  // 1. Split script text by marker symbol
  const rawSegments = scriptText
    .split(markerSymbol)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSegments.length === 0) {
    return [];
  }

  const blocks: FormattedTimestampBlock[] = [];
  let wordCursor = 0;
  let previousEnd = 0;

  for (let i = 0; i < rawSegments.length; i++) {
    const segmentText = rawSegments[i];
    const segmentWords = segmentText.split(/\s+/).filter(Boolean);

    if (segmentWords.length === 0) continue;

    const firstScriptWord = segmentWords[0];
    const lastScriptWord = segmentWords[segmentWords.length - 1];

    let startSec = previousEnd;
    let endSec = previousEnd;
    let foundStartIndex = -1;
    let foundEndIndex = -1;

    // Search forward from current wordCursor for the anchor words
    const searchLimit = Math.min(
      transcribedWords.length,
      wordCursor + Math.max(segmentWords.length * 3, 25)
    );

    // 1. Find segment start anchor
    for (let w = wordCursor; w < searchLimit; w++) {
      if (isWordMatch(firstScriptWord, transcribedWords[w].word)) {
        startSec = transcribedWords[w].start;
        foundStartIndex = w;
        wordCursor = w;
        break;
      }
    }

    // 2. Find segment end anchor (search from current wordCursor)
    const endSearchLimit = Math.min(
      transcribedWords.length,
      wordCursor + Math.max(segmentWords.length * 2, 15)
    );

    // Search backwards from endSearchLimit to find the last matching word in this segment
    for (let w = endSearchLimit - 1; w >= wordCursor; w--) {
      if (isWordMatch(lastScriptWord, transcribedWords[w].word)) {
        endSec = transcribedWords[w].end;
        foundEndIndex = w;
        break;
      }
    }

    // Fallback: If exact last word wasn't found, estimate based on word count
    if (foundEndIndex === -1) {
      const estimatedIndex = Math.min(
        transcribedWords.length - 1,
        wordCursor + segmentWords.length - 1
      );
      if (transcribedWords[estimatedIndex]) {
        endSec = transcribedWords[estimatedIndex].end;
        foundEndIndex = estimatedIndex;
      } else {
        endSec = startSec + Math.max(1.5, segmentWords.length * 0.4);
      }
    }

    // Advance cursor for next segment
    if (foundEndIndex !== -1) {
      wordCursor = foundEndIndex + 1;
    } else {
      wordCursor += segmentWords.length;
    }

    // First block should snap to 0:00 if near beginning
    if (i === 0 && startSec <= 1.5) {
      startSec = 0;
    }

    // Ensure start < end and chronological progression
    if (startSec < previousEnd && blocks.length > 0) {
      startSec = previousEnd;
    }
    if (endSec <= startSec) {
      endSec = startSec + Math.max(1.0, segmentWords.length * 0.35);
    }

    previousEnd = endSec;

    blocks.push({
      index: i + 1,
      startTime: formatTimeCode(startSec),
      endTime: formatTimeCode(endSec),
      startSeconds: Number(startSec.toFixed(2)),
      endSeconds: Number(endSec.toFixed(2)),
      text: segmentText,
    });
  }

  // Adjust final block end to match total audio duration if provided
  if (totalAudioDuration > 0 && blocks.length > 0) {
    const lastBlock = blocks[blocks.length - 1];
    if (totalAudioDuration > lastBlock.startSeconds) {
      lastBlock.endSeconds = Number(totalAudioDuration.toFixed(2));
      lastBlock.endTime = formatTimeCode(totalAudioDuration);
    }
  }

  return blocks;
}
