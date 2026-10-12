"use client";

import AnswerCard from "./AnswerCard";

const SUGGESTED_QUESTIONS = [
  "What just happened?",
  "Why was a card shown?",
  "What happens next?",
];

export default function CompanionPanel({
  status,
  question,
  setQuestion,
  explanationLevel,
  setExplanationLevel,
  capturedTimestamp,
  answerData,
  errorMessage,
  autoNoteEvent,
  onSubmit,
  onAskAboutMoment,
  onReset,
  onClose,
}) {
  const handleSuggestedClick = (text) => {
    // Fill the input only; do NOT auto-submit (per viewer preference)
    setQuestion(text);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/20 bg-zinc-950/75 p-3 text-white shadow-2xl backdrop-blur-xl sm:p-4">
      {/* Panel Header */}
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
          {!autoNoteEvent && <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setExplanationLevel("simple")}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                explanationLevel === "simple"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setExplanationLevel("detailed")}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                explanationLevel === "detailed"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              More detail
            </button>
          </div>}

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

      {/* Main Content Area */}
      <div className="pt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {autoNoteEvent && status === "idle" ? (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2 text-xs text-cyan-200">
              <span>{autoNoteEvent.matchMinute}</span>
              <span className="text-zinc-400">Quick update</span>
            </div>
            <h3 className="text-base font-semibold leading-snug text-white">
              {autoNoteEvent.title}
            </h3>
              <p className="text-sm leading-relaxed text-zinc-100">
                {autoNoteEvent.quickNote || autoNoteEvent.description}
              </p>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
              <span className="text-xs text-zinc-400">The match keeps playing.</span>
              <button
                type="button"
                onClick={() => onAskAboutMoment(autoNoteEvent)}
                className="min-h-11 cursor-pointer rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Ask
              </button>
            </div>
          </div>
        ) : status === "idle" && (
          <div className="flex flex-col gap-4">
            {/* Suggested Questions */}
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

            {/* Question Input Form */}
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
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Thinking…
              </p>
            </div>
          </div>
        )}

        {status === "answered" && (
          <AnswerCard
            answerData={answerData}
            capturedTimestamp={capturedTimestamp}
            explanationLevel={explanationLevel}
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
