"use client";

import AnswerCard from "./AnswerCard";

const SUGGESTED_QUESTIONS = [
  "Why did the referee blow the whistle?",
  "What foul was called on this play?",
  "Can you explain the referee's card decision?",
  "What is the official rule for this situation?",
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
  onSubmit,
  onReset,
  onPanelPointerDown,
}) {
  const handleSuggestedClick = (text) => {
    // Fill the input only; do NOT auto-submit (per viewer preference)
    setQuestion(text);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-zinc-950/55 border border-white/20 rounded-xl p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div
          onPointerDown={onPanelPointerDown}
          className="min-w-0 flex-1 cursor-move select-none touch-none"
          title="Drag to move"
        >
          <h2 className="text-sm font-semibold text-white tracking-tight">Live Lens</h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
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
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {status === "idle" && (
          <div className="flex flex-col gap-4">
            {/* Suggested Questions */}
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Try asking
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedClick(item)}
                    className="text-left text-xs bg-zinc-800/45 hover:bg-zinc-700/70 hover:text-white text-zinc-100 px-3 py-1.5 rounded-lg border border-white/15 transition-colors cursor-pointer"
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
                className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
              >
                Ask about this moment
              </label>
              <textarea
                id="companion-question"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What just happened? Why is there a confrontation?"
                className="w-full px-3.5 py-2.5 bg-zinc-950/45 border border-white/20 focus:border-cyan-300/80 focus:ring-1 focus:ring-cyan-300 rounded-lg text-sm text-white placeholder:text-white/55 resize-none outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!question.trim()}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ask Live Lens</span>
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
                Sending your question...
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
