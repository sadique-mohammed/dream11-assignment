"use client";

import { formatPlaybackTime } from "@/lib/format-time";

export default function AnswerCard({ answerData, capturedTimestamp, onReset }) {
  if (!answerData) return null;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <p className="text-xs text-zinc-400">Demo answer · {formatPlaybackTime(capturedTimestamp)}</p>
          <p className="mt-1 text-xs text-zinc-300">{answerData.question}</p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
          AI not connected
        </span>
      </div>

      <section>
        <h3 className="mb-1 text-xs font-semibold text-cyan-300">What happened</h3>
        <p className="leading-relaxed text-zinc-100">{answerData.summary}</p>
      </section>

      {answerData.confirmedFacts?.length > 0 && (
        <section className="border-t border-zinc-800 pt-3">
          <h3 className="mb-1 text-xs font-semibold text-zinc-300">Match details</h3>
          <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-300">
            {answerData.confirmedFacts.map((fact, index) => (
              <li key={index}>{fact}</li>
            ))}
          </ul>
        </section>
      )}

      {answerData.ruleExplanation && (
        <section className="border-t border-zinc-800 pt-3">
          <h3 className="mb-1 text-xs font-semibold text-zinc-300">The rule</h3>
          <p className="text-xs leading-relaxed text-zinc-300">{answerData.ruleExplanation}</p>
        </section>
      )}

      {answerData.uncertainty && (
        <section className="border-t border-zinc-800 pt-3">
          <h3 className="mb-1 text-xs font-semibold text-zinc-300">What we can’t tell</h3>
          <p className="text-xs leading-relaxed text-zinc-400">{answerData.uncertainty}</p>
        </section>
      )}

      {answerData.sources?.length > 0 && (
        <section className="border-t border-zinc-800 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-zinc-300">Sources</h3>
          <div className="flex flex-wrap gap-2">
            {answerData.sources.map((source, index) => (
              source.url ? (
                <a
                  key={`${source.label}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-cyan-200 underline-offset-2 hover:underline"
                >
                  {source.label}
                </a>
              ) : (
                <span key={`${source.label || source}-${index}`} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {source.label || source}
                </span>
              )
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={onReset}
        className="min-h-11 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
      >
        Ask another question
      </button>
    </div>
  );
}
