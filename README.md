# 🎙️ SyncScript

> Convert audio into custom interval and symbol-aligned timestamped transcripts for AI video & image creators.

---

## 🏛️ Engineering Standard (MNC SOP)

This project strictly adheres to the **MNC Software Engineering Rulebook**:
1. **Sacred `main` Branch**: Zero direct commits on `main`. All work happens in `feat/*` or `chore/*`.
2. **Quality Gatekeeper**: `npm run build` must return `Code 0` prior to any PR/merge.
3. **User Acceptance Testing (UAT)**: Explicit visual green signal required before merging.
4. **Conventional Commits**: Standardized commit history (`feat:`, `fix:`, `chore:`).
5. **Milestone Tags**: Immutable restore points (`v1.x.0-<feature-slug>`).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Add your GROQ_API_KEY from https://console.groq.com
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Quality Gatekeeper Build
```bash
npm run build
```
