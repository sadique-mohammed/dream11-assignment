"use client";

import { useState } from "react";

export default function ContextInspector({
  context,
  onRunPreset,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'json'

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-cyan-800/60 bg-zinc-950/80 p-3 text-xs text-zinc-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-cyan-950 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-800">
            DEV INSPECTOR
          </span>
          <span className="font-medium text-zinc-200">
            AI Evidence Context Object (Part 4)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
        >
          {isOpen ? "Collapse Inspector ▲" : "Expand Inspector ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3 pt-3 border-t border-zinc-800">
          {/* Quick Presets for Acceptance Criteria */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Acceptance Test Presets:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onRunPreset?.("known_event")}
                className="cursor-pointer rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-[11px] hover:border-cyan-500 hover:text-cyan-200"
              >
                1. Known Event (Penalty 73&apos;)
              </button>
              <button
                type="button"
                onClick={() => onRunPreset?.("unannotated_time")}
                className="cursor-pointer rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-[11px] hover:border-cyan-500 hover:text-cyan-200"
              >
                2. Unannotated Time (2000s)
              </button>
              <button
                type="button"
                onClick={() => onRunPreset?.("general_rule")}
                className="cursor-pointer rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-[11px] hover:border-cyan-500 hover:text-cyan-200"
              >
                3. General Rule (&quot;What is offside?&quot;)
              </button>
              <button
                type="button"
                onClick={() => onRunPreset?.("shootout_event")}
                className="cursor-pointer rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-[11px] hover:border-cyan-500 hover:text-cyan-200"
              >
                4. Shootout Event (Dumfries Card)
              </button>
            </div>
          </div>

          {!context ? (
            <p className="italic text-zinc-500">
              No question submitted yet. Submit a question or click a preset above to inspect the context.
            </p>
          ) : (
            <div>
              <div className="flex gap-2 border-b border-zinc-800 pb-2 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    activeTab === "overview"
                      ? "bg-cyan-950 text-cyan-200 font-semibold border border-cyan-800"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Structured Summary
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    activeTab === "json"
                      ? "bg-cyan-950 text-cyan-200 font-semibold border border-cyan-800"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Raw JSON Payload
                </button>
              </div>

              {activeTab === "overview" ? (
                <div className="space-y-2.5">
                  {/* Status Banner */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        context.eventStatus === "matched_event"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {context.eventStatus}
                    </span>
                    <span className="text-zinc-400">
                      Playback: {context.retrievalMetadata?.playbackTimeSec?.toFixed(1)}s
                    </span>
                    {context.retrievalMetadata?.explicitEventRequested && (
                      <span className="text-zinc-400">
                        Requested ID: {context.retrievalMetadata.explicitEventRequested}
                      </span>
                    )}
                  </div>

                  {/* Matched Event */}
                  {context.matchedEvent ? (
                    <div className="rounded bg-zinc-900/90 p-2 border border-zinc-800">
                      <p className="font-semibold text-zinc-100">
                        {context.matchedEvent.title} ({context.matchedEvent.matchMinute})
                      </p>
                      <p className="text-zinc-400 mt-0.5">{context.matchedEvent.quickNote}</p>
                      <div className="mt-1 flex gap-3 text-[11px] text-zinc-400">
                        <span>Score: {context.matchState?.scoreBefore} → {context.matchState?.scoreAfter}</span>
                        <span>Period: {context.matchState?.period}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded bg-zinc-900/60 p-2 border border-zinc-800 text-zinc-400 italic">
                      No matching incident found. No unrelated nearby events were attached.
                    </div>
                  )}

                  {/* Matched Rules */}
                  <div>
                    <p className="text-[11px] font-semibold text-cyan-300 mb-1">
                      Matched Rules ({context.rules?.length || 0}):
                    </p>
                    {context.rules?.length > 0 ? (
                      <ul className="space-y-1">
                        {context.rules.map((rule) => (
                          <li key={rule.id} className="rounded bg-zinc-900/70 p-2 border border-zinc-800">
                            <span className="font-semibold text-zinc-200">{rule.law} ({rule.edition})</span>
                            <p className="text-zinc-400 mt-0.5">{rule.summary}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic text-zinc-500">No rule matches.</p>
                    )}
                  </div>

                  {/* StatsBomb Feed Actions */}
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-cyan-300 mb-1">
                        Feed-Recorded Actions ({context.statsBombActions?.length || 0}):
                      </p>
                      <span className="text-[10px] text-zinc-400">
                        {context.statsBombStatus?.label}
                      </span>
                    </div>
                    {context.statsBombActions?.length > 0 ? (
                      <ul className="space-y-1">
                        {context.statsBombActions.map((act, i) => (
                          <li key={act.id || i} className="flex items-center gap-2 rounded bg-zinc-900/60 px-2 py-1 text-[11px] border border-zinc-800">
                            <span className="font-mono text-cyan-400">{act.timeDisplay || `${act.minute}'`}</span>
                            <span className="font-medium text-zinc-200">{act.type}</span>
                            <span className="text-zinc-400">· {act.player || act.team}</span>
                            {act.outcome && <span className="text-emerald-400">({act.outcome})</span>}
                            {act.detail && <span className="text-zinc-400">({act.detail})</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic text-zinc-500">
                        {context.statsBombStatus?.queried
                          ? "No high-signal actions (goals, shots, fouls, cards) in the backward window (up to +1 min forward)."
                          : "Feed query skipped or unmapped for this phase."}
                      </p>
                    )}
                  </div>

                  {/* Sources & Uncertainty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 mb-1">Sources ({context.sources?.length || 0}):</p>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                        {context.sources?.map((s, idx) => (
                          <li key={idx} className="truncate">
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                                {s.label}
                              </a>
                            ) : (
                              s.label
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 mb-1">Uncertainty & Evidence Limits:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                        {context.uncertainty?.map((u, idx) => (
                          <li key={`u-${idx}`}>{u}</li>
                        ))}
                        {context.evidenceLimits?.map((l, idx) => (
                          <li key={`l-${idx}`} className="text-zinc-500">{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <pre className="max-h-80 overflow-auto rounded bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300 border border-zinc-800">
                  {JSON.stringify(context, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
