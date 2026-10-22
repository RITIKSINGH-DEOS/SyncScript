import { WhisperWord, FormattedTimestampBlock } from "@/types/transcription";
import { formatTimeCode } from "./interval-grouper";

/**
 * Normalizes words by lowercasing and stripping all punctuation.
 */
function cleanWord(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]|_/g, "").trim();
}

/**
 * Calculates Levenshtein edit distance between two strings.
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
 * Strict and intelligent single-word matching.
 * - Words <= 3 characters MUST match exactly (prevents false matches on "it", "is", "in", "and", "a", "to").
 * - Words 4-5 characters allow edit distance <= 1.
 * - Words >= 6 characters allow edit distance <= 2, or shared stem prefix >= 5.
 * - No dangerous substring matching (prevents "juice" matching "juicy" or "there" matching "here").
 */
function isWordMatchStrict(scriptWord: string, whisperWord: string): boolean {
  const s = cleanWord(scriptWord);
  const w = cleanWord(whisperWord);
  if (!s || !w) return false;
  if (s === w) return true;

  // Short words (and, the, it, is, in, at, to, of, we, he, on, as, so) MUST be exact!
  if (s.length <= 3 || w.length <= 3) {
    return false;
  }

  // Shared prefix of length >= 5 for morphological variations (e.g., discover / discoveries)
  if (s.length >= 6 && w.length >= 6) {
    let p = 0;
    while (p < s.length && p < w.length && s[p] === w[p]) p++;
    if (p >= 5) return true;
  }

  const maxDist = s.length >= 7 ? 2 : 1;
  return levenshtein(s, w) <= maxDist;
}

/**
 * Scores how well an N-gram phrase (first 2-3 words of a segment) matches
 * starting at transcribedWords[pos].
 */
function scorePhraseMatch(
  phraseWords: string[],
  transcribedWords: WhisperWord[],
  pos: number
): { score: number; matches: number } {
  if (phraseWords.length === 0 || pos >= transcribedWords.length) {
    return { score: 0, matches: 0 };
  }

  const count = Math.min(phraseWords.length, 3);
  let matches = 0;

  for (let k = 0; k < count; k++) {
    const wordIdx = pos + k;
    if (wordIdx >= transcribedWords.length) break;

    if (isWordMatchStrict(phraseWords[k], transcribedWords[wordIdx].word)) {
      matches++;
    }
  }

  const score = matches / count;
  return { score, matches };
}

/**
 * Finds the best anchor position in transcribedWords for a segment's start phrase.
 * Uses N-gram matching across a constrained search window from the current cursor.
 */
function findSegmentStart(
  segmentWords: string[],
  transcribedWords: WhisperWord[],
  cursor: number,
  expectedOffset: number
): { index: number; startSec: number } | null {
  if (segmentWords.length === 0 || cursor >= transcribedWords.length) {
    return null;
  }

  // Look ahead in a targeted window around the expected position
  const maxLookAhead = Math.min(
    transcribedWords.length,
    cursor + Math.max(expectedOffset + 18, 25)
  );

  let bestIndex = -1;
  let bestScore = -1;

  const phrase = segmentWords.slice(0, 3);
  const neededMatches = phrase.length === 1 ? 1 : phrase.length === 2 ? 1 : 2;

  for (let w = cursor; w < maxLookAhead; w++) {
    const { score, matches } = scorePhraseMatch(phrase, transcribedWords, w);

    if (matches >= neededMatches) {
      // Proximity weighting: prefer matches closer to where we expect words to be spoken
      const distFromExpected = Math.abs(w - (cursor + expectedOffset));
      const compositeScore = score - distFromExpected * 0.015;

      if (compositeScore > bestScore) {
        bestScore = compositeScore;
        bestIndex = w;

        // If perfect match very close to expected, take it immediately
        if (score === 1.0 && distFromExpected <= 2) {
          break;
        }
      }
    }
  }

  if (bestIndex !== -1 && bestScore >= 0.4) {
    return {
      index: bestIndex,
      startSec: transcribedWords[bestIndex].start,
    };
  }

  return null;
}

/**
 * Aligns user-provided script segments (split by marker symbol)
 * with Whisper's transcribed word timestamps using Multi-Word N-Gram Phrase Matching.
 * Eliminates false jumps caused by common single words or substring matches.
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

    // Expected offset from current cursor (first segment starts at 0, subsequent segments follow word count)
    const expectedOffset = i === 0 ? 0 : 0;

    // Find start anchor using 3-word N-gram phrase matching
    const startMatch = findSegmentStart(
      segmentWords,
      transcribedWords,
      wordCursor,
      expectedOffset
    );

    let startSec = previousEnd;
    let foundStartIndex = wordCursor;

    if (startMatch) {
      startSec = startMatch.startSec;
      foundStartIndex = startMatch.index;
      wordCursor = foundStartIndex;
    } else {
      // Fallback: estimate from transcribed word position
      if (transcribedWords[wordCursor]) {
        startSec = transcribedWords[wordCursor].start;
      } else {
        startSec = previousEnd;
      }
    }

    // First block snaps to 0:00 if near beginning
    if (i === 0 && startSec <= 1.5) {
      startSec = 0;
    }

    // Ensure chronological progression
    if (startSec < previousEnd && blocks.length > 0) {
      startSec = previousEnd;
    }

    // Find segment end anchor: search forward from start word within segment length + small buffer
    const endSearchLimit = Math.min(
      transcribedWords.length,
      wordCursor + segmentWords.length + 4
    );

    const lastWord = segmentWords[segmentWords.length - 1];
    let foundEndIndex = -1;
    let endSec = startSec;

    // Forward search for the last word within the expected segment boundary
    for (let w = Math.min(transcribedWords.length - 1, wordCursor + segmentWords.length - 1); w < endSearchLimit; w++) {
      if (isWordMatchStrict(lastWord, transcribedWords[w].word)) {
        endSec = transcribedWords[w].end;
        foundEndIndex = w;
        break;
      }
    }

    // Fallback end estimation if exact last word wasn't found
    if (foundEndIndex === -1) {
      const estimatedEndIdx = Math.min(
        transcribedWords.length - 1,
        wordCursor + segmentWords.length - 1
      );

      if (transcribedWords[estimatedEndIdx] && transcribedWords[estimatedEndIdx].end > startSec) {
        endSec = transcribedWords[estimatedEndIdx].end;
        foundEndIndex = estimatedEndIdx;
      } else {
        // Natural speech rate: ~0.35s to 0.4s per word
        endSec = startSec + Math.max(1.2, segmentWords.length * 0.38);
      }
    }

    // Advance cursor for next segment
    if (foundEndIndex !== -1) {
      wordCursor = foundEndIndex + 1;
    } else {
      wordCursor += segmentWords.length;
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
