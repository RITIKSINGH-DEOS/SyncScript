import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60; // Allow 60s on serverless
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const userApiKey = (formData.get("apiKey") as string | null)?.trim();

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided in request." },
        { status: 400 }
      );
    }

    const apiKey = userApiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No Groq API key found. Please enter your free Groq API key in the top-right Settings or configure GROQ_API_KEY in .env.local.",
        },
        { status: 401 }
      );
    }

    const groq = new Groq({ apiKey });

    // Call Groq Whisper-large-v3 with word-level verbose_json
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      response_format: "verbose_json",
      temperature: 0.0,
    });

    // Extract word-level timestamps or segments
    const words = (transcription as unknown as { words?: { word: string; start: number; end: number }[] }).words || [];
    const segments = (transcription as unknown as { segments?: { id: number; start: number; end: number; text: string }[] }).segments || [];

    // Fallback: If words array is empty but segments exist, approximate word timestamps from segments
    let finalWords = words;
    if (finalWords.length === 0 && segments.length > 0) {
      finalWords = [];
      segments.forEach((seg) => {
        const segWords = seg.text.trim().split(/\s+/).filter(Boolean);
        const segDuration = Math.max(0.1, seg.end - seg.start);
        const wordDuration = segDuration / segWords.length;

        segWords.forEach((w, idx) => {
          finalWords.push({
            word: w,
            start: seg.start + idx * wordDuration,
            end: seg.start + (idx + 1) * wordDuration,
          });
        });
      });
    }

    return NextResponse.json({
      success: true,
      text: transcription.text,
      words: finalWords,
      segments: segments,
    });
  } catch (error: unknown) {
    console.error("Groq Whisper API transcription error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal transcription error.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
