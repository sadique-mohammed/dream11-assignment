"use client";

import { useEffect, useRef } from "react";
import AnswerCard from "./AnswerCard";

const SUGGESTED_QUESTIONS = [
  "What just happened?",
  "Why was a card shown?",
  "What does that mean?",
];

export default function CompanionPanel({
  status,
  question,
  setQuestion,
  capturedTimestamp,
  answerData,
  errorMessage,
  autoNoteEvent,
  onSubmit,
  onAskAboutMoment,
  onReplay,
  onReset,
  onClose,
}) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [status, autoNoteEvent]);

  const handleSuggestedClick = (text) => {
    setQuestion(text);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/20 bg-zinc-950/75 p-3 text-white shadow-2xl backdrop-blur-xl sm:p-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div
          data-lens-drag-handle="true"
          className="min-w-0 flex-1 cursor-move select-none touch-none"
          title="Drag to move"
        >
          <h2 className="text-sm font-semibold tracking-tight">Live Lens</h2>
          {!autoNoteEvent && <p className="mt-0.5 text-xs text-zinc-400">Ask about the match</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onClose && (
            <button
              type="button"
              data-companion-close="true"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }}
              aria-label="Close or minimise companion"
              title="Close or minimise"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div ref={contentRef} className="pt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {autoNoteEvent && status === "idle" ? (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  {autoNoteEvent.matchMinute}
                </span>
                {autoNoteEvent.type === "goal" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-950 text-green-300 border border-green-800/80">
                    ⚽ GOAL
                  </span>
                )}
                {autoNoteEvent.type === "yellow_card" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-950 text-yellow-300 border border-yellow-800/80">
                    🟨 CAUTION
                  </span>
                )}
                {autoNoteEvent.type === "red_card" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-300 border border-red-800/80">
                    🟥 RED CARD
                  </span>
                )}
                {autoNoteEvent.type === "penalty" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/80">
                    ⚠️ PENALTY
                  </span>
                )}
                {autoNoteEvent.type === "shootout_kick" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800/80">
                    🎯 SHOOTOUT
                  </span>
                )}
                {autoNoteEvent.type === "break" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                    ⏱️ INTERVAL
                  </span>
                )}
              </div>
              <span className="text-zinc-400 text-[11px] shrink-0">Match note</span>
            </div>

            <h3 className="text-sm font-semibold leading-snug text-white">
              {autoNoteEvent.title}
            </h3>

            <p className="text-xs leading-relaxed text-zinc-200">
              {autoNoteEvent.quickNote || autoNoteEvent.description}
            </p>

            <div className={`mt-1 flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
              autoNoteEvent.isCurated
                ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300/90"
                : "bg-amber-950/30 border-amber-800/50 text-amber-300/90"
            }`}>
              <span className="shrink-0 text-xs">
                {autoNoteEvent.isCurated ? "✓" : "⚡"}
              </span>
              <span>
                {autoNoteEvent.mappingNote || "Approximate timing from the match record."}
              </span>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setQuestion(autoNoteEvent.title || "Can you explain this moment?");
                  onReset();
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Custom question…
              </button>
              <button
                type="button"
                onClick={() => onAskAboutMoment(autoNoteEvent)}
                className="min-h-9 cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition-all flex items-center gap-1.5"
              >
                <span>Explain with AI</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : status === "idle" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Try one of these
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedClick(item)}
                    className="min-h-10 cursor-pointer rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-left text-xs text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <label
                htmlFor="companion-question"
                className="text-xs font-medium text-zinc-300"
              >
                Ask about this moment
              </label>
              <textarea
                id="companion-question"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask in your own words"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-400 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              />

              <button
                type="submit"
                disabled={!question.trim()}
                className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <span>Ask</span>
              </button>
            </form>
          </div>
        )}

        {status === "loading" && (
          <div className="flex h-full flex-col gap-3 py-2">
            {autoNoteEvent && (
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] text-cyan-200">{autoNoteEvent.matchMinute} · Match update</p>
                <h3 className="mt-1 text-sm font-semibold text-white">{autoNoteEvent.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  {autoNoteEvent.quickNote || autoNoteEvent.description}
                </p>
              </div>
            )}
            <p className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-cyan-300" />
              {autoNoteEvent ? "Checking match details…" : "Thinking…"}
            </p>
          </div>
        )}

        {status === "answered" && (
          <AnswerCard
            answerData={answerData}
            capturedTimestamp={capturedTimestamp}
            onReplay={onReplay}
            onReset={onReset}
          />
        )}

        {status === "error" && (
          <div className="py-6 flex flex-col gap-4">
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-red-200 text-sm">
              <p className="font-semibold text-red-400 mb-1">
                Unable to process question
              </p>
              <p className="text-xs text-red-300/80">
                {errorMessage || "An unexpected error occurred while analyzing the moment."}
              </p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium text-sm transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
