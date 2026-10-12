"use client";

import { formatPlaybackTime } from "@/lib/format-time";

export default function EventTimeline({
  events = [],
  selectedEventId,
  onSelectEvent,
  onJumpToTime,
  onShowMoment,
}) {
  if (!events || events.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Curated moments
          </h2>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
            {events.length} Curated Events
          </span>
        </div>
        <p className="text-xs text-zinc-400 hidden sm:block">
          Choose a moment to open its note and jump to it
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {events.map((event) => {
          const isSelected = selectedEventId === event.id;
          return (
            <div
              key={event.id}
              className={`group flex flex-col justify-between p-3 rounded-lg border ${
                  isSelected
                  ? "bg-blue-950/40 border-blue-500/70 ring-1 ring-blue-500/50"
                  : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                    {event.matchMinute}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {formatPlaybackTime(event.videoTimeSeconds)}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-white line-clamp-1">
                  {event.title}
                </h3>

                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {event.description}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                {event.scoreAfter ? (
                  <span className="text-zinc-400 font-mono">
                    Score: <strong className="text-zinc-200">{event.scoreAfter}</strong>
                  </span>
                ) : (
                  <span className="text-zinc-500 capitalize">{event.period.replace("_", " ")}</span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onSelectEvent(event.id);
                    onJumpToTime(event.videoTimeSeconds);
                    onShowMoment?.(event);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300 group-hover:bg-blue-600 group-hover:text-white"
                  }`}
                >
                  Open note
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Details of Selected Event */}
      {selectedEventId && (
        (() => {
          const active = events.find((e) => e.id === selectedEventId);
          if (!active) return null;
          return (
            <div className="mt-4 p-3.5 rounded-lg border border-blue-900/40 bg-zinc-950/70 text-xs text-zinc-300 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-700/60 font-semibold">
                    {active.matchMinute}
                  </span>
                  <h4 className="font-semibold text-white text-sm">{active.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEvent(null)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer px-1.5 py-0.5"
                >
                  ✕ Close
                </button>
              </div>

              {/* Confirmed Facts */}
              {active.facts?.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Confirmed Facts:
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-zinc-300 pl-1">
                    {active.facts.map((fact, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Uncertainty Notes */}
              {active.uncertainty?.length > 0 && (
                <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-amber-200/90">
                  <span className="font-semibold text-amber-300 block mb-0.5">
                    Uncertainty / Context Note:
                  </span>
                  {active.uncertainty.map((item, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>
              )}

              {/* Sources */}
              {active.sources?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-900">
                  <span className="text-[11px] text-zinc-500">Official Sources:</span>
                  {active.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 text-[11px]"
                    >
                      {src.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      )}
    </section>
  );
}
