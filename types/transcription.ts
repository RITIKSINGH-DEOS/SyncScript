export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WhisperWord[];
}

export interface FormattedTimestampBlock {
  index: number;
  startTime: string; // e.g., "00:00"
  endTime: string;   // e.g., "00:05"
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export type ProcessingMode = 'interval' | 'marker';

export interface TranscriptionRequestPayload {
  mode: ProcessingMode;
  intervalSeconds?: number;
  markerSymbol?: string;
  markedScript?: string;
}

export interface TranscriptionResponsePayload {
  success: boolean;
  blocks: FormattedTimestampBlock[];
  rawText: string;
  formattedOutput: string;
  error?: string;
}
