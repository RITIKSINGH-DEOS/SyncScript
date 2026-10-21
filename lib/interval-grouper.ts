import { WhisperWord, WhisperSegment, FormattedTimestampBlock } from "@/types/transcription";

export function formatTimeCode(seconds: number): string {
  const totalSecs = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Groups audio transcription words into natural, video-friendly scene blocks
 * based on speech pauses, sentence completions (., !, ?), and natural pacing (3s - 7s sweet spot).
 * Never cuts words or sentences midway.
 */
export function groupWordsByNaturalSpeech(
  words: WhisperWord[],
  segments: WhisperSegment[] = [],
  chunkOffsetSeconds: number = 0,
  startingIndex: number = 1
): FormattedTimestampBlock[] {
  if (!words || words.length === 0) return [];

  // Sort words chronologically
  const sortedWords = [...words].sort((a, b) => a.start - b.start);
  const blocks: FormattedTimestampBlock[] = [];

  let currentBlockWords: WhisperWord[] = [];
  let blockStartIndex = startingIndex;

  const pushCurrentBlock = () => {
    if (currentBlockWords.length === 0) return;

    const firstWord = currentBlockWords[0];
    const lastWord = currentBlockWords[currentBlockWords.length - 1];

    const absStart = chunkOffsetSeconds + Math.floor(firstWord.start);
    const absEnd = chunkOffsetSeconds + Math.ceil(lastWord.end);

    const text = currentBlockWords
      .map((w) => w.word.trim())
      .filter(Boolean)
      .join(" ");

    blocks.push({
      index: blockStartIndex++,
      startTime: formatTimeCode(absStart),
      endTime: formatTimeCode(absEnd),
      startSeconds: absStart,
      endSeconds: absEnd,
      text,
    });

    currentBlockWords = [];
  };

  for (let i = 0; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    currentBlockWords.push(word);

    const firstWordInBlock = currentBlockWords[0];
    const duration = word.end - firstWordInBlock.start;
    const isLastWord = i === sortedWords.length - 1;

    if (isLastWord) {
      pushCurrentBlock();
      break;
    }

    const nextWord = sortedWords[i + 1];
    const silenceGap = nextWord.start - word.end;
    const cleanWord = word.word.trim();
    const endsWithSentenceStop = /[.!?]$/.test(cleanWord);
    const endsWithClauseStop = /[,;:\-—]$/.test(cleanWord);

    // Rule 1: Natural Sentence Completion
    // If the sentence completed (., !, ?) and block is at least 2.5s, cut cleanly
    if (endsWithSentenceStop && duration >= 2.5) {
      pushCurrentBlock();
      continue;
    }

    // Rule 2: Natural Breath / Silence Pause
    // If speaker pauses (silence >= 0.35s) and block is at least 3.5s, cut here
    if (silenceGap >= 0.35 && duration >= 3.5) {
      pushCurrentBlock();
      continue;
    }

    // Rule 3: Clause Punctuation
    // If comma/colon/semicolon and duration is in the 4.5s - 7s sweet spot, cut here
    if (endsWithClauseStop && duration >= 4.5) {
      pushCurrentBlock();
      continue;
    }

    // Rule 4: Maximum Scene Duration (Cap at ~7.5 seconds)
    // Avoid scenes running too long for video editing pacing
    if (duration >= 7.5 && (silenceGap >= 0.2 || endsWithClauseStop || endsWithSentenceStop)) {
      pushCurrentBlock();
      continue;
    }

    // Rule 5: Hard upper ceiling (8.5 seconds) - cut at word boundary
    if (duration >= 8.5) {
      pushCurrentBlock();
      continue;
    }
  }

  return blocks;
}

/**
 * Backward-compatible fixed interval grouper
 */
export function groupWordsByInterval(
  words: WhisperWord[],
  intervalSeconds: number,
  chunkOffsetSeconds: number = 0,
  startingIndex: number = 1
): FormattedTimestampBlock[] {
  if (!words || words.length === 0) return [];

  const blocks: FormattedTimestampBlock[] = [];
  const maxWordEnd = Math.max(...words.map((w) => w.end));
  const totalWindows = Math.ceil(maxWordEnd / intervalSeconds);

  let currentBlockIndex = startingIndex;

  for (let w = 0; w < totalWindows; w++) {
    const windowStart = w * intervalSeconds;
    const windowEnd = (w + 1) * intervalSeconds;

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
