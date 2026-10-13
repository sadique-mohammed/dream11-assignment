"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import MatchPlayer from "@/components/MatchPlayer";
import CompanionPanel from "@/components/CompanionPanel";
import EventMarkerTool from "@/components/EventMarkerTool";
import EventTimeline from "@/components/EventTimeline";
import ContextInspector from "@/components/ContextInspector";
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
  const [retrievedContext, setRetrievedContext] = useState(null);
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

  const getBreakStatusNote = (matchMinute, videoTimeSeconds) => {
    const notes = {
      HT: {
        title: "Half-time",
        quickNote: "Half-time: Argentina lead the Netherlands 1–0. Nahuel Molina scored in the first half.",
      },
      "90' (ET Break)": {
        title: "Extra-time break",
        quickNote: "The match is 2–2 after 90 minutes. The teams are taking a short break before extra time.",
      },
      Penalties: {
        title: "Penalty shootout",
        quickNote: "The match is still 2–2 after extra time. Penalties will decide the winner.",
      },
    };
    const note = notes[matchMinute];
    return note ? {
      id: `break-${matchMinute}`,
      matchMinute,
      videoTimeSeconds,
      ...note,
    } : null;
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

    const previousMatchMinute = getMatchMinuteAtTime(previous, false);
    const currentMatchMinute = getMatchMinuteAtTime(current, false);
    if (previousMatchMinute !== currentMatchMinute) {
      const breakNote = getBreakStatusNote(currentMatchMinute, current);
      if (breakNote) {
        showAutomaticNote(breakNote);
        return;
      }
    }

    const crossedEvent = curatedEvents.find((event) =>
      previous < event.videoTimeSeconds && current >= event.videoTimeSeconds
    );
    if (crossedEvent) showAutomaticNote(crossedEvent);
  };

  const handleSeeking = () => {
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

  // Submit question to server endpoint /api/ask, which computes context and evidence server-side
  const submitQuestionToApi = async ({ questionText, timeSec, eventId, level }) => {
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
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setAnswerData(data);
      setRetrievedContext(data.context || null);
      setStatus("answered");
    } catch (err) {
      console.error("Error submitting question to /api/ask:", err);
      setErrorMessage(err.message || "Failed to retrieve explanation.");
      setStatus("error");
    }
  };

  const handleQuestionSubmit = async (e, overrideLevel = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    let capturedSec = playbackTime;
    if (videoRef.current) {
      capturedSec = videoRef.current.currentTime;
    }
    setCapturedTimestamp(capturedSec);

    const level = overrideLevel || explanationLevel;
    await submitQuestionToApi({
      questionText: trimmed,
      timeSec: capturedSec,
      eventId: selectedEventId,
      level,
    });
  };

  const handleExplanationLevelChange = (newLevel) => {
    setExplanationLevel(newLevel);
    // If currently displaying an answer, re-request from /api/ask with the new level
    if (status === "answered" && question.trim()) {
      const capturedSec = capturedTimestamp !== null ? capturedTimestamp : playbackTime;
      submitQuestionToApi({
        questionText: question.trim(),
        timeSec: capturedSec,
        eventId: selectedEventId,
        level: newLevel,
      });
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setQuestion("");
    setAnswerData(null);
    setCapturedTimestamp(null);
    setErrorMessage(null);
  };

  // Acceptance test runner for ContextInspector presets
  const handleRunPreset = async (presetKey) => {
    let presetTime = 0;
    let presetEventId = null;
    let presetQuestion = "";

    if (presetKey === "known_event") {
      presetTime = 5009.66;
      presetEventId = "arg-penalty-73";
      presetQuestion = "Why did Argentina get a penalty kick?";
    } else if (presetKey === "unannotated_time") {
      presetTime = 2000;
      presetEventId = null;
      presetQuestion = "What happened in this passage of play?";
    } else if (presetKey === "general_rule") {
      presetTime = 2000;
      presetEventId = null;
      presetQuestion = "What is the offside rule in football?";
    } else if (presetKey === "shootout_event") {
      presetTime = 9318.0;
      presetEventId = "dumfries-dismissal-shootout";
      presetQuestion = "Why was Dumfries sent off with a red card after the shootout?";
    }

    handleJumpToTime(presetTime);
    setSelectedEventId(presetEventId);
    setQuestion(presetQuestion);
    setCapturedTimestamp(presetTime);
    setCompanionOpen(true);

    await submitQuestionToApi({
      questionText: presetQuestion,
      timeSec: presetTime,
      eventId: presetEventId,
      level: explanationLevel,
    });
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
            setExplanationLevel={handleExplanationLevelChange}
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

        {/* Development Context Inspector */}
        <ContextInspector
          context={retrievedContext}
          onRunPreset={handleRunPreset}
        />

        {process.env.NODE_ENV === "development" && (
          <div className={eventMarkerOpen ? "block" : "hidden"}>
            <EventMarkerTool videoRef={videoRef} playbackTime={playbackTime} />
          </div>
        )}
      </div>
    </main>
  );
}
