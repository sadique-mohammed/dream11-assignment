"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import MatchPlayer from "@/components/MatchPlayer";
import CompanionPanel from "@/components/CompanionPanel";
import EventMarkerTool from "@/components/EventMarkerTool";
import { getMatchMinuteAtTime } from "@/lib/match-minute";
import { getCuratedEvents } from "@/lib/events";
import { getFeedTriggers } from "@/lib/feed-triggers";
import { formatPlaybackTime } from "@/lib/format-time";

export default function Home() {
  const videoRef = useRef(null);
  const previousPlaybackTimeRef = useRef(null);
  const curatedEvents = getCuratedEvents();
  const feedTriggers = getFeedTriggers();
  const seenTriggerIdsRef = useRef(new Set());

  // Playback state
  const [playbackTime, setPlaybackTime] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Question & companion state
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'answered' | 'error'
  const [capturedTimestamp, setCapturedTimestamp] = useState(null);
  const [answerData, setAnswerData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [autoNoteEvent, setAutoNoteEvent] = useState(null);
  const [automaticNotesEnabled, setAutomaticNotesEnabled] = useState(true);
  const [eventMarkerOpen, setEventMarkerOpen] = useState(false);

  const showAutomaticNote = (event) => {
    const eventId = event.curatedEventId || (event.isCurated ? event.id : null);
    const timeSec = event.videoTimeSeconds;
    const automaticQuestion = event.player
      ? `Explain what happened to ${event.player} at ${event.matchMinute} in simple terms.`
      : `Explain this match update in simple terms: ${event.title}.`;
    setSelectedEventId(eventId);
    setQuestion(automaticQuestion);
    setAnswerData(null);
    setCapturedTimestamp(timeSec);
    setStatus("loading");
    setAutoNoteEvent(event);
    setCompanionOpen(true);

    submitQuestionToApi({
      questionText: automaticQuestion,
      timeSec,
      eventId,
      level: "simple",
      automaticTrigger: true,
      triggerId: event.id,
    });
  };

  // Show a note when playback crosses a significant StatsBomb or curated action.
  // - Detects forward playback only
  // - Ignores seeks/scrubbing (natural playback jumps <= 3s)
  // - Prevents duplicate popups on replay via seenTriggerIdsRef
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    const previous = previousPlaybackTimeRef.current;
    setPlaybackTime(current);
    previousPlaybackTimeRef.current = current;

    // Ignore initial restores, paused playback, backward motion, and large scrubbing jumps (> 3s)
    if (
      !automaticNotesEnabled ||
      video.paused ||
      previous === null ||
      current <= previous ||
      current - previous > 3
    ) {
      return;
    }

    // Detect if forward playback crossed any significant feed action or interval
    const crossedTrigger = feedTriggers.find(
      (t) => previous < t.videoTimeSeconds && current >= t.videoTimeSeconds
    );

    if (crossedTrigger && !seenTriggerIdsRef.current.has(crossedTrigger.id)) {
      // Prevent duplicate popups on replay
      seenTriggerIdsRef.current.add(crossedTrigger.id);
      showAutomaticNote(crossedTrigger);
    }
  };

  const handleSeeking = () => {
    // Clear previous playback time so scrubbing jumps do not trigger notes
    previousPlaybackTimeRef.current = null;
  };

  // Selection synchronization: clear selectedEventId if seek moves outside 30s boundary
  const handleSeeked = () => {
    const current = videoRef.current?.currentTime ?? null;
    previousPlaybackTimeRef.current = current;

    if (selectedEventId && typeof current === "number") {
      const activeEvent = curatedEvents.find((e) => e.id === selectedEventId);
      if (activeEvent) {
        const diff = Math.abs(current - activeEvent.videoTimeSeconds);
        // Clear selection only if outside verified 30s selection window
        if (diff > 30) {
          setSelectedEventId(null);
        }
      }
    }
  };

  const closeCompanion = useCallback(() => {
    setAutoNoteEvent(null);
    setCompanionOpen(false);
  }, [setAutoNoteEvent, setCompanionOpen]);

  useEffect(() => {
    if (!autoNoteEvent) return undefined;
    const timer = window.setTimeout(() => {
      setAutoNoteEvent(null);
      setCompanionOpen(false);
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [autoNoteEvent]);

  const handleAskMore = async (event) => {
    const targetEvent = event || autoNoteEvent;
    if (!targetEvent) return;

    const defaultQ = targetEvent.player
      ? `Can you explain what happened with ${targetEvent.player} at ${targetEvent.matchMinute}?`
      : targetEvent.title
      ? `Can you explain what happened during "${targetEvent.title}"?`
      : "Can you explain this moment in the match?";

    const eventId = targetEvent.curatedEventId || (targetEvent.isCurated ? targetEvent.id : null);
    const timeSec = targetEvent.videoTimeSeconds || playbackTime;

    setSelectedEventId(eventId);
    setQuestion(defaultQ);
    setAutoNoteEvent(null);
    setCompanionOpen(true);
    setCapturedTimestamp(timeSec);

    // Call Gemini API immediately
    await submitQuestionToApi({
      questionText: defaultQ,
      timeSec,
      eventId,
      level: "simple",
    });
  };

  // Seek video directly to a specific timestamp, optionally playing through the replay passage
  const handleJumpToTime = (seconds, autoPlay = false) => {
    if (videoRef.current && typeof seconds === "number" && !isNaN(seconds)) {
      const duration = videoRef.current.duration || 9460;
      const target = Math.max(0, Math.min(seconds, duration));
      videoRef.current.currentTime = target;
      setPlaybackTime(target);
      if (autoPlay) {
        videoRef.current.play?.().catch(() => {});
      }
    }
  };

  // Demo check: start 10 seconds before a feed timestamp and let playback trigger the AI note.
  const handleTestFeedTrigger = (triggerId) => {
    const trigger = feedTriggers.find((t) => t.id === triggerId);
    if (!trigger || !videoRef.current) return;
    // Allow re-testing this trigger by clearing it from the seen set
    seenTriggerIdsRef.current.delete(trigger.id);
    const target = Math.max(0, trigger.videoTimeSeconds - 10);
    videoRef.current.currentTime = target;
    setPlaybackTime(target);
    previousPlaybackTimeRef.current = target;
    videoRef.current.play?.().catch(() => {});
  };

  // Submit question to server endpoint /api/ask, which computes context and evidence server-side
  const submitQuestionToApi = async ({ questionText, timeSec, eventId, level, automaticTrigger = false, triggerId = null }) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          playbackTimeSec: timeSec,
          selectedEventId: eventId,
          explanationLevel: level,
          automaticTrigger,
          triggerId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setAnswerData(data);
      setStatus("answered");
    } catch (err) {
      console.error("Error submitting question to /api/ask:", err);
      setErrorMessage(err.message || "Failed to retrieve explanation.");
      setStatus("error");
    }
  };

  const handleQuestionSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    let capturedSec = playbackTime;
    if (videoRef.current) {
      capturedSec = videoRef.current.currentTime;
    }
    setCapturedTimestamp(capturedSec);

    await submitQuestionToApi({
      questionText: trimmed,
      timeSec: capturedSec,
      eventId: selectedEventId,
      level: "simple",
    });
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
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              aria-expanded={eventMarkerOpen}
              onClick={() => setEventMarkerOpen((open) => !open)}
              className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              {eventMarkerOpen ? "Close event marker" : "Developer: mark event"}
            </button>
          )}
          <select
            aria-label="Test a match feed trigger"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleTestFeedTrigger(e.target.value);
                e.target.value = "";
              }
            }}
            className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-cyan-300 hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-cyan-300"
          >
            <option value="" disabled>
              Demo: test AI popup (starts 10s before)…
            </option>
            {feedTriggers.map((t) => (
              <option key={t.id} value={t.id}>
                {formatPlaybackTime(t.videoTimeSeconds)} [{t.matchMinute}] {t.title}
              </option>
            ))}
          </select>
        </div>
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

        {process.env.NODE_ENV === "development" && (
          <div className={eventMarkerOpen ? "block" : "hidden"}>
            <EventMarkerTool videoRef={videoRef} playbackTime={playbackTime} />
          </div>
        )}
      </div>
    </main>
  );
}
