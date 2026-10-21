export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          🏛️ MNC Architecture Ready
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Sync<span className="text-indigo-400">Script</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Foundational architecture established for custom interval & symbol-aligned transcription.
        </p>
      </div>
    </main>
  );
}
