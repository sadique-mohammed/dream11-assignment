"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import MatchPlayer from "@/components/MatchPlayer";
import CompanionPanel from "@/components/CompanionPanel";
import EventMarkerTool from "@/components/EventMarkerTool";
import EventTimeline from "@/components/EventTimeline";
import { getMatchMinuteAtTime } from "@/lib/match-minute";
import { getCuratedEvents } from "@/lib/events";

export default function Home() {
  const videoRef = useRef(null);
  const previousPlaybackTimeRef = useRef(null);
  const curatedEvents = getCuratedEvents();

  // Playback state
  const [playbackTime, setPlaybackTime] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Question & companion state
  const [question, setQuestion] = useState("");
  const [explanationLevel, setExplanationLevel] = useState("simple"); // 'simple' | 'detailed'
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'answered' | 'error'
  const [capturedTimestamp, setCapturedTimestamp] = useState(null);
  const [answerData, setAnswerData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [autoNoteEvent, setAutoNoteEvent] = useState(null);
  const [automaticNotesEnabled, setAutomaticNotesEnabled] = useState(true);
  const [eventMarkerOpen, setEventMarkerOpen] = useState(false);

  const showAutomaticNote = (event) => {
    setSelectedEventId(event.id);
    setQuestion("");
    setAnswerData(null);
    setStatus("idle");
    setAutoNoteEvent(event);
    setCompanionOpen(true);
  };

  // Show a note when playback crosses an event timestamp.
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    const previous = previousPlaybackTimeRef.current;
    setPlaybackTime(current);
    previousPlaybackTimeRef.current = current;

    // Ignore initial restores and large jumps; only notify while naturally watching.
    if (!automaticNotesEnabled || video.paused || previous === null || current <= previous || current - previous > 3) return;

    const crossedEvent = curatedEvents.find((event) =>
      previous < event.videoTimeSeconds && current >= event.videoTimeSeconds
    );
    if (crossedEvent) showAutomaticNote(crossedEvent);
  };

  const handleSeeking = () => {
    previousPlaybackTimeRef.current = null;
  };

  const handleSeeked = () => {
    previousPlaybackTimeRef.current = videoRef.current?.currentTime ?? null;
  };

  const closeCompanion = useCallback(() => {
    setAutoNoteEvent(null);
    setCompanionOpen(false);
  }, []);

  useEffect(() => {
    if (!autoNoteEvent) return undefined;
    const timer = window.setTimeout(() => {
      setAutoNoteEvent(null);
      setCompanionOpen(false);
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [autoNoteEvent]);

  const handleShowMoment = (event) => {
    if (!event) return;
    showAutomaticNote(event);
  };

  const handleAskMore = (event) => {
    setSelectedEventId(event.id);
    setQuestion("Can you explain this moment?");
    setStatus("idle");
    setAnswerData(null);
    setAutoNoteEvent(null);
    setCompanionOpen(true);
  };

  // Seek video directly to a specific timestamp
  const handleJumpToTime = (seconds) => {
    if (videoRef.current && typeof seconds === "number" && !isNaN(seconds)) {
      const duration = videoRef.current.duration || 9460;
      const target = Math.max(0, Math.min(seconds, duration));
      videoRef.current.currentTime = target;
      setPlaybackTime(target);
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

    // Simulate short network turn to display loading state then render answer
    setTimeout(() => {
      const isSimple = explanationLevel === "simple";
      const selectedEvent = curatedEvents.find((ev) => ev.id === selectedEventId);

      setAnswerData({
        question: trimmed,
        summary: isSimple
          ? selectedEvent?.quickNote || "I don’t have a verified note for this moment yet. Try asking about a marked match moment."
          : selectedEvent?.description || "I don’t have a verified note for this moment yet. Try asking about a marked match moment.",
        confirmedFacts: [
          ...(selectedEvent
            ? [
                `${selectedEvent.title} · ${selectedEvent.matchMinute}`,
                ...selectedEvent.facts.slice(0, 2),
              ]
            : []),
        ],
        ruleExplanation: selectedEvent?.ruleTags?.includes("penalty_kick")
          ? "A foul by a defending team inside its own penalty area can lead to a penalty kick."
          : selectedEvent?.ruleTags?.includes("free_kick")
            ? "A free kick restarts play after a foul. The team can pass instead of shooting."
            : selectedEvent?.ruleTags?.includes("yellow_card")
              ? "A yellow card is a warning. A player who receives a second yellow in the same match is sent off."
              : null,
        uncertainty: selectedEvent?.uncertainty?.length > 0
          ? selectedEvent.uncertainty[0]
          : null,
        sources: selectedEvent?.sources || [],
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
                Match companion
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Brief explanations for moments that are hard to follow
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
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          companionOpen={companionOpen}
          onToggleCompanion={() => setCompanionOpen((open) => !open)}
          onCloseCompanion={closeCompanion}
          autoNoteEvent={autoNoteEvent}
          onToggleAutomaticNotes={() => {
            if (automaticNotesEnabled) {
              setAutoNoteEvent(null);
              setCompanionOpen(false);
            }
            setAutomaticNotesEnabled(!automaticNotesEnabled);
          }}
          automaticNotesEnabled={automaticNotesEnabled}
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
            autoNoteEvent={autoNoteEvent}
            onAskAboutMoment={handleAskMore}
            onClose={closeCompanion}
          />
        </MatchPlayer>

        <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Browse key match moments <span className="ml-1 text-xs text-zinc-500">{curatedEvents.length}</span>
          </summary>
          <div className="border-t border-zinc-800 px-3 pb-3">
            <EventTimeline
              events={curatedEvents}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              onJumpToTime={handleJumpToTime}
              onShowMoment={handleShowMoment}
            />
          </div>
        </details>

        {process.env.NODE_ENV === "development" && (
          <div className={eventMarkerOpen ? "block" : "hidden"}>
            <EventMarkerTool videoRef={videoRef} playbackTime={playbackTime} />
          </div>
        )}
      </div>
    </main>
  );
}
