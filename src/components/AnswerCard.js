"use client";

import { formatPlaybackTime } from "@/lib/format-time";

export default function AnswerCard({ answerData, capturedTimestamp, onReset }) {
  if (!answerData) return null;

  const isNoMatchingEvent = answerData.eventStatus === "no_matching_event";
  const hasMoreDetails =
    (answerData.confirmedFacts?.length > 0) ||
    (answerData.secondaryActions?.length > 0) ||
    (answerData.secondaryRules?.length > 0);

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Top Header: Separated Clocks & Mode Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          {/* Match Clock */}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-zinc-700/80">
            <span className="text-zinc-400 font-normal">Match:</span>
            {answerData.matchClockDisplay || "Live"}
          </span>

          {/* Video Clock */}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300 border border-zinc-800">
            <span className="text-zinc-400 font-normal">Video:</span>
            {formatPlaybackTime(capturedTimestamp)}
          </span>
        </div>

        {answerData.aiStatus === "ai_generated" ? (
          <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
            {answerData.model === "gemini-3.1-flash-lite"
              ? "Gemini 3.1 Flash Lite"
              : answerData.model === "gemini-2.5-flash"
              ? "Gemini 2.5 Flash"
              : answerData.model === "gemini-3.8-flash"
              ? "Gemini 3.8 Flash"
              : (answerData.model || "Gemini AI")}
          </span>
        ) : answerData.aiStatus === "fallback" ? (
          <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
            Fallback record
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
            Verified match data
          </span>
        )}
      </div>

      {/* Fan-friendly Context Bar */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          About this moment
        </p>
        <p className="mt-0.5 text-xs font-medium text-zinc-200">{answerData.question}</p>
      </div>

      {/* Main Explanation (AI Response) */}
      <section className="rounded-lg bg-zinc-900/90 p-3 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-cyan-300">
            {isNoMatchingEvent ? "Incident Status" : "What happened"}
          </h3>
          {answerData.explanationLevel && (
            <span className="text-[10px] text-zinc-400 capitalize">
              {answerData.explanationLevel === "detailed" ? "Detailed view" : "Quick answer"}
            </span>
          )}
        </div>
        <p className="leading-relaxed text-zinc-100 text-sm font-medium">
          {answerData.answer ||
            answerData.leadExplanation ||
            (isNoMatchingEvent
              ? "No verified match incident is recorded for this playback timestamp."
              : "No description available.")}
        </p>
      </section>

      {/* Primary Match Record (Only the evidence answering the question) */}
      {answerData.primaryActions?.length > 0 && (
        <section className="border-t border-zinc-800 pt-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-zinc-300">Match record</h3>
            <span className="text-[10px] text-zinc-400">Official data feed</span>
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {answerData.primaryActions.map((action, index) => (
              <li
                key={action.id || index}
                className="flex items-center gap-2 rounded bg-zinc-900/70 px-2.5 py-1.5 border border-zinc-800/80"
              >
                <span className="font-mono text-cyan-300 shrink-0 font-medium">
                  {action.timeDisplay || `${action.minute}'`}
                </span>
                <span className="font-medium text-zinc-100">{action.type}</span>
                <span className="text-zinc-300 truncate">
                  {action.player ? `· ${action.player}` : action.team ? `· ${action.team}` : ""}
                </span>
                {action.outcome && (
                  <span className="text-amber-300 shrink-0 text-[11px] font-medium">
                    ({action.outcome})
                  </span>
                )}
                {action.detail && (
                  <span className="text-zinc-400 shrink-0 text-[11px]">
                    ({action.detail})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Primary Relevant Rule */}
      {answerData.primaryRule && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1 text-xs font-semibold text-zinc-300">
            The rule · {answerData.primaryRule.law}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-300">
            {answerData.primaryRule.summary}
          </p>
        </section>
      )}

      {/* Collapsible: More match details (puts extra feed actions, facts, and secondary rules behind detail) */}
      {hasMoreDetails && (
        <details className="mt-1 rounded-lg border border-zinc-800/90 bg-zinc-900/40 p-2.5 text-xs transition-colors">
          <summary className="cursor-pointer font-medium text-cyan-300 hover:text-cyan-200 focus-visible:outline-none">
            More match details
          </summary>
          <div className="mt-3 space-y-3 pt-2 border-t border-zinc-800/60">
            {/* Confirmed Match Facts */}
            {answerData.confirmedFacts?.length > 0 && (
              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Confirmed Facts
                </h4>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {answerData.confirmedFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Match Feed Log */}
            {answerData.secondaryActions?.length > 0 && (
              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Other Feed Actions ({answerData.secondaryActions.length})
                </h4>
                <ul className="space-y-1 text-xs text-zinc-300 max-h-40 overflow-y-auto pr-1">
                  {answerData.secondaryActions.map((action, idx) => (
                    <li
                      key={action.id || idx}
                      className="flex items-center gap-2 rounded bg-zinc-950/60 px-2 py-1 text-[11px] border border-zinc-800/60"
                    >
                      <span className="font-mono text-zinc-400 shrink-0">
                        {action.timeDisplay || `${action.minute}'`}
                      </span>
                      <span className="text-zinc-200">{action.type}</span>
                      <span className="text-zinc-400 truncate">
                        {action.player ? `· ${action.player}` : ""}
                      </span>
                      {action.outcome && (
                        <span className="text-zinc-400 shrink-0">({action.outcome})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional / Secondary Rules */}
            {answerData.secondaryRules?.length > 0 && (
              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Additional Rules
                </h4>
                <ul className="space-y-1.5">
                  {answerData.secondaryRules.map((rule) => (
                    <li key={rule.id} className="rounded bg-zinc-950/60 p-2 border border-zinc-800/60">
                      <span className="font-semibold text-zinc-200">{rule.law}</span>
                      <p className="text-zinc-400 mt-0.5 text-[11px] leading-relaxed">
                        {rule.summary}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Uncertainty & Boundaries */}
      {(answerData.uncertainty || answerData.evidenceLimits?.length > 0) && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1 text-xs font-semibold text-zinc-400">What we can’t tell</h3>
          {answerData.uncertainty && (
            <p className="text-xs leading-relaxed text-zinc-400 mb-1">{answerData.uncertainty}</p>
          )}
          {answerData.evidenceLimits?.map((limit, idx) => (
            <p key={idx} className="text-[11px] leading-relaxed text-zinc-500">
              {limit}
            </p>
          ))}
        </section>
      )}

      {/* Sourced Links */}
      {answerData.sources?.length > 0 && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1.5 text-xs font-semibold text-zinc-400">Sources</h3>
          <div className="flex flex-wrap gap-1.5">
            {answerData.sources.map((source, index) =>
              source.url ? (
                <a
                  key={`${source.label}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-zinc-700 bg-zinc-900/60 px-2 py-0.5 text-xs text-cyan-200 underline-offset-2 hover:underline"
                >
                  {source.label}
                </a>
              ) : (
                <span
                  key={`${source.label || source}-${index}`}
                  className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
                >
                  {source.label || source}
                </span>
              )
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-1 min-h-11 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
      >
        Ask another question
      </button>
    </div>
  );
}
