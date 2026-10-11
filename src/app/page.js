export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-6 tracking-tight">
        Live Lens
      </h1>
      <div className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        <video
          id="match-player"
          className="w-full h-full object-contain bg-black"
          controls
          preload="metadata"
          playsInline
        >
          <source src="/media/live-match.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Argentina vs Netherlands — 2022 FIFA World Cup Quarter-Final
      </p>
    </main>
  );
}
