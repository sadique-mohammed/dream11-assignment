"use client";

import { formatPlaybackTime } from "@/lib/format-time";
import { getMatchMinuteAtTime } from "@/lib/match-minute";

export default function AnswerCard({
  answerData,
  capturedTimestamp,
  explanationLevel,
  onReset,
}) {
  if (!answerData) return null;

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Placeholder Banner */}
      <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-200 text-xs">
        <span className="select-none">⚠️</span>
        <span className="font-medium text-amber-300">Placeholder response</span>
        <span className="text-amber-200/70 text-[11px]">— AI connects in Part 5</span>
      </div>

      {/* Captured Metadata Header */}
      <div className="flex items-center justify-between gap-2 p-2.5 bg-zinc-900/50 border border-white/15 rounded-lg text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Captured:</span>
            <span className="font-mono font-medium text-white">
              {formatPlaybackTime(capturedTimestamp)}
            </span>
            <span className="text-zinc-500">({Math.floor(capturedTimestamp)}s)</span>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 font-mono text-[11px]">
            {getMatchMinuteAtTime(capturedTimestamp)}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize text-[11px]">
          {explanationLevel}
        </span>
      </div>

      {/* Question Asked */}
      <div className="p-2.5 bg-zinc-900/35 border border-white/15 rounded-lg text-xs">
        <p className="text-zinc-400 font-medium italic">
          &ldquo;{answerData.question}&rdquo;
        </p>
      </div>

      {/* Content Card */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-zinc-900/40 border border-white/15 rounded-xl space-y-1.5 backdrop-blur-sm text-xs">
        {/* Answer Summary */}
        <div>
          <p className="text-zinc-100 leading-relaxed text-sm">
            {answerData.summary}
          </p>
        </div>

        {/* Confirmed Facts */}
        {answerData.confirmedFacts && answerData.confirmedFacts.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Sample Facts
            </h4>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-300 leading-relaxed">
              {answerData.confirmedFacts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Rule Explanation */}
        {answerData.ruleExplanation && (
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              Rule
            </h4>
            <p className="text-zinc-300 leading-relaxed">
              {answerData.ruleExplanation}
            </p>
          </div>
        )}

        {/* Uncertainty Notes */}
        {answerData.uncertainty && (
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">
              Uncertainty
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              {answerData.uncertainty}
            </p>
          </div>
        )}

        {/* Sources */}
        {answerData.sources && answerData.sources.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Sources
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {answerData.sources.map((src, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 text-[11px]"
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset Action */}
      <button
        type="button"
        onClick={onReset}
        className="w-full py-2 px-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium text-xs transition-colors border border-zinc-700 cursor-pointer"
      >
        Ask another question
      </button>
    </div>
  );
}
