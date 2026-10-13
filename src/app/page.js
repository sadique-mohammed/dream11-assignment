"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import MatchPlayer from "@/components/MatchPlayer";
import CompanionPanel from "@/components/CompanionPanel";
import { getMatchMinuteAtTime } from "@/lib/match-minute";
import { getCuratedEvents } from "@/lib/events";
import { findCrossedTrigger, getFeedTriggers } from "@/lib/feed-triggers";
import { formatPlaybackTime } from "@/lib/format-time";

export default function Home() {
  const videoRef = useRef(null);
  const previousPlaybackTimeRef = useRef(null);
  const curatedEvents = getCuratedEvents();
  const feedTriggers = getFeedTriggers();
  const seenTriggerIdsRef = useRef(new Set());

  const [playbackTime, setPlaybackTime] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("idle");
  const [capturedTimestamp, setCapturedTimestamp] = useState(null);
  const [answerData, setAnswerData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [autoNoteEvent, setAutoNoteEvent] = useState(null);
  const [automaticNotesEnabled, setAutomaticNotesEnabled] = useState(true);

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
      automaticTrigger: true,
      triggerId: event.id,
    });
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    const previous = previousPlaybackTimeRef.current;
    setPlaybackTime(current);
    previousPlaybackTimeRef.current = current;

    if (
      !automaticNotesEnabled ||
      video.paused ||
      previous === null ||
      current <= previous ||
      current - previous > 3
    ) {
      return;
    }

    const crossedTrigger = findCrossedTrigger(previous, current, seenTriggerIdsRef.current);
    if (crossedTrigger) {
      seenTriggerIdsRef.current.add(crossedTrigger.id);
      showAutomaticNote(crossedTrigger);
    }
  };

  const handleSeeking = () => {
    previousPlaybackTimeRef.current = null;
  };

  const handleSeeked = () => {
    const current = videoRef.current?.currentTime ?? null;
    previousPlaybackTimeRef.current = current;

    if (selectedEventId && typeof current === "number") {
      const activeEvent = curatedEvents.find((e) => e.id === selectedEventId);
      if (activeEvent) {
        const diff = Math.abs(current - activeEvent.videoTimeSeconds);
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
    if (!event) return;

    const defaultQ = event.player
      ? `Can you explain what happened with ${event.player} at ${event.matchMinute}?`
      : event.title
      ? `Can you explain what happened during "${event.title}"?`
      : "Can you explain this moment in the match?";

    const eventId = event.curatedEventId || (event.isCurated ? event.id : null);
    const timeSec = event.videoTimeSeconds || playbackTime;

    setSelectedEventId(eventId);
    setQuestion(defaultQ);
    setAutoNoteEvent(null);
    setCompanionOpen(true);
    setCapturedTimestamp(timeSec);

    await submitQuestionToApi({
      questionText: defaultQ,
      timeSec,
      eventId,
    });
  };

  const handleJumpToTime = (seconds) => {
    if (videoRef.current && typeof seconds === "number" && !isNaN(seconds)) {
      const duration = videoRef.current.duration || 9460;
      const target = Math.max(0, Math.min(seconds, duration));
      videoRef.current.currentTime = target;
      setPlaybackTime(target);
      videoRef.current.play?.().catch(() => {});
    }
  };

  const handleTestFeedTrigger = (triggerId) => {
    const trigger = feedTriggers.find((t) => t.id === triggerId);
    if (!trigger || !videoRef.current) return;
    seenTriggerIdsRef.current.delete(trigger.id);
    const target = Math.max(0, trigger.videoTimeSeconds - 10);
    videoRef.current.currentTime = target;
    setPlaybackTime(target);
    previousPlaybackTimeRef.current = target;
    videoRef.current.play?.().catch(() => {});
  };

  const submitQuestionToApi = async ({ questionText, timeSec, eventId, automaticTrigger = false, triggerId = null }) => {
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
      console.error("Could not get a match explanation:", err);
      setErrorMessage(err.message || "Failed to retrieve explanation.");
      setStatus("error");
    }
  };

  const handleQuestionSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    videoRef.current?.pause();
    let capturedSec = playbackTime;
    if (videoRef.current) {
      capturedSec = videoRef.current.currentTime;
    }
    setCapturedTimestamp(capturedSec);

    await submitQuestionToApi({
      questionText: trimmed,
      timeSec: capturedSec,
      eventId: selectedEventId,
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
            <select
              aria-label="Preview an automatic match note"
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
                Preview a match note…
              </option>
              {feedTriggers.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatPlaybackTime(t.videoTimeSeconds)} [{t.matchMinute}] {t.title}
                </option>
              ))}
            </select>
          )}
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
            onReplay={handleJumpToTime}
            onClose={closeCompanion}
          />
        </MatchPlayer>

      </div>
    </main>
  );
}
