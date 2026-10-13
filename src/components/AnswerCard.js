import { formatPlaybackTime } from "@/lib/format-time";

export default function AnswerCard({ answerData, capturedTimestamp, onReplay, onReset }) {
  if (!answerData) return null;

  const isNoMatchingEvent = answerData.eventStatus === "no_matching_event";
  const isBreakUpdate = ["pre-match", "half-time", "second-half-start", "extra-time-break", "penalty-shootout", "post-match"]
    .includes(answerData.matchState?.phase);
  const hasMoreDetails = answerData.confirmedFacts?.length || answerData.secondaryActions?.length || answerData.secondaryRules?.length;
  const replayStart = answerData.matchedEvent?.replayStartSeconds;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-cyan-300">
            <span className="mr-1.5 font-normal text-zinc-400">Match:</span>
            {answerData.matchClockDisplay || "Live"}
          </span>
          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300">
            <span className="mr-1.5 font-sans text-zinc-400">Video:</span>
            {formatPlaybackTime(capturedTimestamp)}
          </span>
        </div>
        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
          {answerData.aiStatus === "ai_generated" ? "AI answer" : "Match record"}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">About this moment</p>
        <p className="mt-0.5 text-xs font-medium text-zinc-200">{answerData.question}</p>
      </div>

      <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/90 p-3">
        <h3 className="mb-1 text-xs font-semibold text-cyan-300">
          {isNoMatchingEvent ? (isBreakUpdate ? "Match update" : "Answer") : "What happened"}
        </h3>
        <p className="text-sm font-medium leading-relaxed text-zinc-100">
          {answerData.answer || "No verified match information is available for this moment."}
        </p>
      </section>

      {answerData.primaryActions?.length > 0 && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1.5 text-xs font-semibold text-zinc-300">Recorded actions</h3>
          <ul className="space-y-1.5 text-xs text-zinc-300">
            {answerData.primaryActions.map((action, index) => (
              <li key={action.id || index} className="flex items-center gap-2 rounded border border-zinc-800/80 bg-zinc-900/70 px-2.5 py-1.5">
                <span className="shrink-0 font-mono font-medium text-cyan-300">{action.timeDisplay || `${action.minute}'`}</span>
                <span className="font-medium text-zinc-100">{action.type}</span>
                <span className="truncate text-zinc-300">{action.player ? `· ${action.player}` : action.team ? `· ${action.team}` : ""}</span>
                {action.outcome && <span className="shrink-0 text-[11px] text-amber-300">({action.outcome})</span>}
                {action.detail && <span className="shrink-0 text-[11px] text-zinc-400">({action.detail})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {answerData.primaryRule && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1 text-xs font-semibold text-zinc-300">Rule · {answerData.primaryRule.law}</h3>
          <p className="text-xs leading-relaxed text-zinc-300">{answerData.primaryRule.summary}</p>
        </section>
      )}

      {hasMoreDetails > 0 && (
        <details className="rounded-lg border border-zinc-800/90 bg-zinc-900/40 p-2.5 text-xs">
          <summary className="cursor-pointer font-medium text-cyan-300 hover:text-cyan-200">More details</summary>
          <div className="mt-3 space-y-3 border-t border-zinc-800/60 pt-3">
            {answerData.confirmedFacts?.length > 0 && (
              <section>
                <h4 className="mb-1 font-semibold text-zinc-400">Confirmed facts</h4>
                <ul className="space-y-1 text-zinc-300">
                  {answerData.confirmedFacts.map((fact, index) => <li key={index}>• {fact}</li>)}
                </ul>
              </section>
            )}
            {answerData.secondaryActions?.length > 0 && (
              <section>
                <h4 className="mb-1 font-semibold text-zinc-400">Other recorded actions</h4>
                <ul className="max-h-40 space-y-1 overflow-y-auto pr-1 text-zinc-300">
                  {answerData.secondaryActions.map((action, index) => (
                    <li key={action.id || index}>
                      <span className="mr-2 font-mono text-zinc-400">{action.timeDisplay || `${action.minute}'`}</span>
                      {action.type}{action.player ? ` · ${action.player}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {answerData.secondaryRules?.length > 0 && (
              <section>
                <h4 className="mb-1 font-semibold text-zinc-400">Related rules</h4>
                <ul className="space-y-2 text-zinc-300">
                  {answerData.secondaryRules.map((rule) => <li key={rule.id}><strong>{rule.law}</strong>: {rule.summary}</li>)}
                </ul>
              </section>
            )}
          </div>
        </details>
      )}

      {(answerData.uncertainty || answerData.evidenceLimits?.length > 0) && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1 text-xs font-semibold text-zinc-400">What we can’t tell</h3>
          {answerData.uncertainty && <p className="mb-1 text-xs leading-relaxed text-zinc-400">{answerData.uncertainty}</p>}
          {answerData.evidenceLimits?.map((limit, index) => <p key={index} className="text-[11px] leading-relaxed text-zinc-500">{limit}</p>)}
        </section>
      )}

      {answerData.sources?.length > 0 && (
        <section className="border-t border-zinc-800 pt-2.5">
          <h3 className="mb-1.5 text-xs font-semibold text-zinc-400">Sources</h3>
          <div className="flex flex-wrap gap-1.5">
            {answerData.sources.map((source, index) => source.url ? (
              <a key={`${source.label}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="rounded-md border border-zinc-700 bg-zinc-900/60 px-2 py-0.5 text-xs text-cyan-200 underline-offset-2 hover:underline">
                {source.label}
              </a>
            ) : <span key={index} className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">{source.label || source}</span>)}
          </div>
        </section>
      )}

      <div className="mt-1 flex gap-2">
        {typeof replayStart === "number" && (
          <button type="button" onClick={() => onReplay?.(replayStart)} className="min-h-11 flex-1 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800">
            Replay moment
          </button>
        )}
        <button type="button" onClick={onReset} className="min-h-11 flex-1 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800">
          Ask another question
        </button>
      </div>
    </div>
  );
}
