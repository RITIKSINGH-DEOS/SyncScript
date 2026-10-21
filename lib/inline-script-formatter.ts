import { FormattedTimestampBlock } from "@/types/transcription";

/**
 * Formats seconds into the exact narrative inline timestamp style:
 * e.g., 0 -> "(0:00)", 5 -> "(0:05)", 68 -> "(1:08)"
 */
export function formatInlineTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `(${mins}:${String(secs).padStart(2, "0")})`;
}

export function parseInlineTimeToSeconds(timeStr: string): number {
  const cleaned = timeStr.replace(/[()\[\]]/g, "").trim();
  const parts = cleaned.split(":").map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  } else if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

/**
 * Reconstructs the continuous inline text when blocks are edited manually or generated.
 * Output: "(0:00) Scene 1 text... (0:05) Scene 2 text... (0:10) Scene 3 text..."
 */
export function reconstructInlineScriptFromBlocks(blocks: FormattedTimestampBlock[]): string {
  if (!blocks || blocks.length === 0) return "";

  return blocks
    .map((block) => {
      const cleaned = block.startTime.replace(/[()\[\]]/g, "").trim();
      return `(${cleaned}) ${block.text.trim()}`;
    })
    .join(" ");
}

/**
 * Replaces each delimiter symbol (e.g. "|") in the user's text
 * with sequential inline timestamps, keeping the entire story paragraph continuous.
 */
export function generateInlineScript(
  scriptText: string,
  markerSymbol: string = "|",
  defaultDuration: number = 5
): { inlineOutput: string; blocks: FormattedTimestampBlock[] } {
  if (!scriptText.trim()) {
    return { inlineOutput: "", blocks: [] };
  }

  const rawSegments = scriptText
    .split(markerSymbol)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSegments.length === 0) {
    return { inlineOutput: "", blocks: [] };
  }

  const formatMinSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const blocks: FormattedTimestampBlock[] = rawSegments.map((seg, idx) => {
    const startSec = idx * defaultDuration;
    const endSec = (idx + 1) * defaultDuration;

    return {
      index: idx + 1,
      startTime: formatMinSec(startSec),
      endTime: formatMinSec(endSec),
      startSeconds: startSec,
      endSeconds: endSec,
      text: seg,
    };
  });

  const inlineOutput = reconstructInlineScriptFromBlocks(blocks);

  return {
    inlineOutput,
    blocks,
  };
}
