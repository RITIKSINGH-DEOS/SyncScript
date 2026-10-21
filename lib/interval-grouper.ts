import { WhisperWord, FormattedTimestampBlock } from "@/types/transcription";

export function formatTimeCode(seconds: number): string {
  const totalSecs = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Groups word-level timestamps into fixed time intervals (e.g., every 5 seconds).
 * Ensures spoken words are cleanly assigned to their corresponding timeline block.
 */
export function groupWordsByInterval(
  words: WhisperWord[],
  intervalSeconds: number,
  chunkOffsetSeconds: number = 0,
  startingIndex: number = 1
): FormattedTimestampBlock[] {
  if (!words || words.length === 0) return [];

  const blocks: FormattedTimestampBlock[] = [];
  
  // Find maximum audio duration in this chunk
  const maxWordEnd = Math.max(...words.map((w) => w.end));
  const totalWindows = Math.ceil(maxWordEnd / intervalSeconds);

  let currentBlockIndex = startingIndex;

  for (let w = 0; w < totalWindows; w++) {
    const windowStart = w * intervalSeconds;
    const windowEnd = (w + 1) * intervalSeconds;

    // Words that fall within or overlap this interval window
    const wordsInWindow = words.filter((word) => {
      const midPoint = (word.start + word.end) / 2;
      return midPoint >= windowStart && midPoint < windowEnd;
    });

    if (wordsInWindow.length > 0) {
      const combinedText = wordsInWindow
        .map((item) => item.word.trim())
        .filter(Boolean)
        .join(" ");

      const absoluteStart = chunkOffsetSeconds + windowStart;
      const absoluteEnd = chunkOffsetSeconds + windowEnd;

      blocks.push({
        index: currentBlockIndex++,
        startTime: formatTimeCode(absoluteStart),
        endTime: formatTimeCode(absoluteEnd),
        startSeconds: absoluteStart,
        endSeconds: absoluteEnd,
        text: combinedText,
      });
    }
  }

  return blocks;
}
