"use client";

import { useState, useRef } from "react";
import MatchPlayer from "@/components/MatchPlayer";
import CompanionPanel from "@/components/CompanionPanel";
import EventMarkerTool from "@/components/EventMarkerTool";
import { getMatchMinuteAtTime } from "@/lib/match-minute";

export default function Home() {
  const videoRef = useRef(null);

  // Playback state
  const [playbackTime, setPlaybackTime] = useState(0);

  // Question & companion state
  const [question, setQuestion] = useState("");
  const [explanationLevel, setExplanationLevel] = useState("simple"); // 'simple' | 'detailed'
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'answered' | 'error'
  const [capturedTimestamp, setCapturedTimestamp] = useState(null);
  const [answerData, setAnswerData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [eventMarkerOpen, setEventMarkerOpen] = useState(false);

  // Update playback time on video timeupdate (~4Hz)
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlaybackTime(videoRef.current.currentTime);
    }
  };

  // Capture the question timestamp while playback continues in the background.
  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    // Read currentTime directly so the answer is tied to the submitted moment.
    let capturedSec = playbackTime;
    if (videoRef.current) {
      capturedSec = videoRef.current.currentTime;
    }

    setCapturedTimestamp(capturedSec);
    setStatus("loading");
    setErrorMessage(null);

    // Simulate short network turn to display loading state then render placeholder answer
    setTimeout(() => {
      const isSimple = explanationLevel === "simple";
      setAnswerData({
        question: trimmed,
        summary: isSimple
          ? "Demo preview: Live Lens will explain what happened using verified match facts and football rules."
          : "Demo preview: Live Lens will connect this moment to verified match facts, explain the relevant rule, and say when something is uncertain.",
        confirmedFacts: [
          `Captured at ${Math.floor(capturedSec)}s (Match minute: ${getMatchMinuteAtTime(capturedSec)})`,
          "Event timeline links in Part 3",
        ],
        ruleExplanation:
          "The relevant rule will be shown here in plain language.",
        uncertainty:
          "We can’t know what the referee said or intended unless a reliable source confirms it.",
        sources: [
          "FIFA Official Match Report #57",
          "IFAB Laws of the Game 2022/23",
        ],
      });
      setStatus("answered");
    }, 600);
  };

  const handleReset = () => {
    setStatus("idle");
    setQuestion("");
    setAnswerData(null);
    setCapturedTimestamp(null);
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-base shadow-md">
            L
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Live Lens
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
                Part 2 Interface
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Interactive match player & rules companion for new football viewers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className="font-medium text-zinc-200">Match:</span>
          <span>Argentina vs Netherlands</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-500">2022 World Cup Quarter-Final</span>
        </div>
      </header>

      <div className="player-stage">
        {process.env.NODE_ENV === "development" && (
          <div className="mb-3">
            <button
              type="button"
              aria-expanded={eventMarkerOpen}
              onClick={() => setEventMarkerOpen((open) => !open)}
              className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              {eventMarkerOpen ? "Close event marker" : "Developer: mark event"}
            </button>
          </div>
        )}
        <MatchPlayer
          videoRef={videoRef}
          playbackTime={playbackTime}
          matchMinute={getMatchMinuteAtTime(playbackTime)}
          onTimeUpdate={handleTimeUpdate}
          companionOpen={companionOpen}
          onToggleCompanion={() => setCompanionOpen((open) => !open)}
        >
          <CompanionPanel
            status={status}
            question={question}
            setQuestion={setQuestion}
            explanationLevel={explanationLevel}
            setExplanationLevel={setExplanationLevel}
            capturedTimestamp={capturedTimestamp}
            answerData={answerData}
            errorMessage={errorMessage}
            onSubmit={handleQuestionSubmit}
            onReset={handleReset}
            onClose={() => setCompanionOpen(false)}
          />
        </MatchPlayer>
        {process.env.NODE_ENV === "development" && (
          <div className={eventMarkerOpen ? "block" : "hidden"}>
            <EventMarkerTool videoRef={videoRef} playbackTime={playbackTime} />
          </div>
        )}
      </div>
    </main>
  );
}
