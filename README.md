# 🎙️ SyncScript

> **Enterprise-Grade Audio-to-Timestamp Alignment for AI Video Creators & Storytellers.**  
> Built with Next.js 14, Web Audio API, Groq Whisper-large-v3, and Tailwind CSS. 100% Free & Unlimited.

---

## 🌟 Core Features

1. **⏱️ Auto-Interval Mode**:
   - Converts spoken audio into fixed $N$-second blocks (e.g. every 5 seconds).
   - Protects word boundaries (never slices words in half).
   - Designed for fast-paced YouTube Shorts, Reels, and TikTok visual slideshows.

2. **🏷️ Symbol Marker Mode**:
   - Takes your scripted text with custom delimiters (`|`, `//`, etc.).
   - Employs Levenshtein-based fuzzy forced alignment against Whisper word timestamps.
   - Stamps each individual scene with exact audio start and end timestamps.

3. **✂️ Browser-Side 10-Minute Audio Chunking**:
   - Uses native Web Audio API to decode and downsample audio to 16-bit Mono WAV.
   - Slices long audio (>10 mins or >25MB) into 10-minute chunks in the browser.
   - Bypasses Groq 25MB limits and Vercel serverless timeouts completely.

4. **🔑 BYOK (Bring Your Own Key) Support**:
   - Enter your free Groq API key directly into the UI (saved safely in browser `localStorage`).
   - Ensures zero rate limits and zero cost for the website owner.

5. **📥 Multi-Format Exports**:
   - `.TXT`: Clean timestamped text format.
   - `.SRT`: Standard SubRip subtitle format ready for Adobe Premiere, DaVinci Resolve, or CapCut.
   - One-click clipboard copy.

---

## 🏛️ Engineering Standard (MNC SOP)

This project strictly adheres to **The MNC Software Engineering Rulebook & SOP**:
- **Law 1**: Sacred `main` Branch (Zero direct commits).
- **Law 2**: Multi-Role Testing Isolation (Incognito window `Ctrl + Shift + N`).
- **Law 3**: Quality Gatekeeper (`npm run build` must return `Code 0`).
- **Law 4**: User Acceptance Testing (Explicit verification before merge).
- **Law 5**: Conventional Commits (`feat:`, `fix:`, `chore:`).
- **Law 6**: Descriptive Milestone Tags (`v1.x.0-<feature-slug>`).
- **Law 7**: Clean House (`git merge --no-ff` + auto-delete temporary branches).

---

## 🚀 Getting Started Locally

### 1. Clone & Install
```bash
git clone https://github.com/RITIKSINGH-DEOS/SyncScript.git
cd SyncScript
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env.local
# Set your GROQ_API_KEY from https://console.groq.com/keys
# (Or enter it directly in the UI via the top-right button)
```

### 3. Run Development / Production Server
```bash
npm run build
npm start
# Open http://localhost:3000
```

---

## 🌐 Deploy to Vercel (100% Free)

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select the `SyncScript` repository.
4. Add environment variable (optional):
   - `GROQ_API_KEY`: Your Groq API key from https://console.groq.com/keys
5. Click **Deploy**!
