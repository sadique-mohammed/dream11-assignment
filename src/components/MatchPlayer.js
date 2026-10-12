"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPlaybackTime } from "@/lib/format-time";
import { getMatchMinuteAtTime } from "@/lib/match-minute";
import AiPet from "./AiPet";

function getPanelPosition(bounds, petPosition, compact = false) {
  const margin = 16;
  const gap = 14;
  const petSize = 56;
  const panelWidth = Math.min(compact ? 332 : 360, bounds.width - margin * 2);
  const panelHeight = Math.min(compact ? 224 : 420, bounds.height - margin * 2);
  const petLeft = petPosition.left;
  const petTop = petPosition.top;
  const roomRight = bounds.width - (petLeft + petSize) - margin;
  const roomLeft = petLeft - margin;

  let left = roomRight >= panelWidth + gap
    ? petLeft + petSize + gap
    : petLeft - panelWidth - gap;
  if (roomRight < panelWidth + gap && roomLeft < panelWidth + gap) {
    left = roomRight >= roomLeft
      ? petLeft + petSize + gap
      : petLeft - panelWidth - gap;
  }
  left = Math.max(margin, Math.min(bounds.width - panelWidth - margin, left));

  let top = petTop;
  if (top + panelHeight > bounds.height - margin) {
    top = petTop + petSize - panelHeight;
  }
  top = Math.max(margin, Math.min(bounds.height - panelHeight - margin, top));
  return { left, top };
}

function parseVttTimestamp(value) {
  const parts = value.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function parseWebVtt(content) {
  return content.split(/\r?\n\s*\r?\n/).flatMap((block, index) => {
    const lines = block.trim().split(/\r?\n/);
    const timingLine = lines.find((line) => line.includes("-->"));
    if (!timingLine) return [];
    const [start, end] = timingLine.split("-->").map((value) => value.trim().split(/\s+/)[0]);
    const timingIndex = lines.indexOf(timingLine);
    const text = lines.slice(timingIndex + 1).join(" ").replace(/<[^>]*>/g, "").trim();
    if (!text) return [];
    return [{ id: `${index}-${start}`, start: parseVttTimestamp(start), end: parseVttTimestamp(end), text }];
  });
}

export default function MatchPlayer({
  videoRef,
  playbackTime,
  onTimeUpdate,
  onSeeking,
  onSeeked,
  companionOpen,
  onToggleCompanion,
  onCloseCompanion,
  autoNoteEvent,
  onToggleAutomaticNotes,
  automaticNotesEnabled,
  matchMinute,
  children,
}) {
  const currentMatchMinute = matchMinute || getMatchMinuteAtTime(playbackTime);
  const playerRef = useRef(null);
  const dragRef = useRef(null);
  const panelDragRef = useRef(null);
  const panelRef = useRef(null);
  const [orbPosition, setOrbPosition] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 12, top: 12 });
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState("idle");
  const [transcriptCues, setTranscriptCues] = useState([]);
  const positionedNoteRef = useRef(null);

  const toggleCompanionAtOrb = () => {
    if (companionOpen) {
      onToggleCompanion();
      return;
    }

    const bounds = playerRef.current?.getBoundingClientRect();
    if (bounds) {
      const petPosition = orbPosition ?? { left: bounds.width - 74, top: 18 };
      setPanelPosition(getPanelPosition(bounds, petPosition));
    }

    onToggleCompanion();
  };

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!autoNoteEvent) {
      positionedNoteRef.current = null;
      return;
    }
    if (!companionOpen || positionedNoteRef.current === autoNoteEvent.id) return;
    const bounds = playerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    positionedNoteRef.current = autoNoteEvent.id;
    const petPosition = orbPosition ?? { left: bounds.width - 74, top: 18 };
    setPanelPosition(getPanelPosition(bounds, petPosition, true));
  }, [autoNoteEvent, companionOpen, orbPosition]);

  useEffect(() => {
    if (!transcriptOpen || transcriptStatus !== "loading") return;
    let cancelled = false;
    fetch("/media/commentary.vtt")
      .then((response) => {
        if (!response.ok) throw new Error("Transcript not found");
        return response.text();
      })
      .then((content) => {
        if (cancelled) return;
        const cues = parseWebVtt(content);
        setTranscriptCues(cues);
        setTranscriptStatus(cues.length ? "ready" : "missing");
      })
      .catch(() => {
        if (!cancelled) setTranscriptStatus("missing");
      });
    return () => { cancelled = true; };
  }, [transcriptOpen, transcriptStatus]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement === playerRef.current) {
        await document.exitFullscreen();
      } else {
        await playerRef.current?.requestFullscreen();
      }
    } catch {
      // Keep the inline player usable if fullscreen is unavailable in this browser.
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef]);

  const seekRelative = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 9460, video.currentTime + seconds));
  }, [videoRef]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not capture key events when focus is on interactive controls
      const active = document.activeElement;
      if (
        active &&
        active !== document.body &&
        active !== document.documentElement &&
        active !== videoRef.current &&
        active.closest("button, input, textarea, select, a, [role='button'], [role='slider'], [contenteditable='true']")
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekRelative(e.shiftKey ? -10 : -5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekRelative(e.shiftKey ? 10 : 5);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        const video = videoRef.current;
        if (video) video.volume = Math.min(1, video.volume + 0.1);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        const video = videoRef.current;
        if (video) video.volume = Math.max(0, video.volume - 0.1);
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoRef, seekRelative, toggleFullscreen, togglePlayPause]);

  const handlePointerDown = (event) => {
    const bounds = playerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: orbPosition?.left ?? bounds.width - 74,
      originTop: orbPosition?.top ?? 18,
      moved: false,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const bounds = playerRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 7) return;

    drag.moved = true;
    const diameter = 56;
    const nextPosition = {
      left: Math.max(8, Math.min(bounds.width - diameter - 8, drag.originLeft + deltaX)),
      top: Math.max(8, Math.min(bounds.height - diameter - 8, drag.originTop + deltaY)),
    };
    setOrbPosition(nextPosition);
    if (companionOpen) setPanelPosition(getPanelPosition(bounds, nextPosition));
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) toggleCompanionAtOrb();
  };

  const handlePanelPointerDown = (event) => {
    if (event.target.closest("button")) return;
    const bounds = playerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panelDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: panelPosition.left,
      originTop: panelPosition.top,
    };
  };

  const handlePanelPointerMove = (event) => {
    const drag = panelDragRef.current;
    const bounds = playerRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return;
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 390;
    const height = panel?.offsetHeight ?? 500;
    const nextPanelPosition = {
      left: Math.max(8, Math.min(bounds.width - width - 8, drag.originLeft + event.clientX - drag.startX)),
      top: Math.max(8, Math.min(bounds.height - height - 8, drag.originTop + event.clientY - drag.startY)),
    };
    setPanelPosition(nextPanelPosition);
    setOrbPosition({
      left: nextPanelPosition.left + width - 56,
      top: nextPanelPosition.top + 8,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={playerRef}
        className="player-shell relative w-full aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
        onClick={(event) => {
          if (companionOpen && event.target === videoRef.current) {
            onCloseCompanion();
          }
        }}
      >
        <video
          ref={videoRef}
          id="match-player"
          className="w-full h-full object-contain bg-black"
          controls
          controlsList="nofullscreen"
          preload="metadata"
          playsInline
          onTimeUpdate={onTimeUpdate}
          onSeeking={onSeeking}
          onSeeked={onSeeked}
        >
          <source src="/media/live-match.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="absolute bottom-12 right-3 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-lg bg-black/60 text-white/90 backdrop-blur hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3v5H3M16 3v5h5M8 21v-5H3m13 5v-5h5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
            </svg>
          )}
        </button>

        <div
          ref={panelRef}
          aria-hidden={!companionOpen}
          inert={!companionOpen ? "" : undefined}
          className={`lens-panel-shell ${companionOpen ? "lens-panel-visible" : "lens-panel-hidden hidden"} ${autoNoteEvent ? "lens-note-mode" : ""} absolute z-20`}
          style={{
            left: panelPosition.left,
            top: panelPosition.top,
            maxWidth: `calc(100% - ${panelPosition.left + 12}px)`,
            maxHeight: `calc(100% - ${panelPosition.top + 12}px)`,
          }}
        >
          {children && (
            <div
              className="h-full"
              onPointerDown={(event) => {
                if (
                  !event.target.closest("[data-companion-close='true']") &&
                  event.target.closest("[data-lens-drag-handle='true']")
                ) {
                  handlePanelPointerDown(event);
                }
              }}
              onPointerMove={handlePanelPointerMove}
              onPointerUp={() => { panelDragRef.current = null; }}
              onPointerCancel={() => { panelDragRef.current = null; }}
            >
              {children}
            </div>
          )}
        </div>

        <button
          type="button"
          tabIndex={companionOpen ? -1 : 0}
          aria-hidden={companionOpen}
          aria-label="Open Live Lens companion. Click to open or drag to move. Use arrow keys to reposition."
          aria-expanded={companionOpen}
          title="Click to open · drag to move"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { dragRef.current = null; }}
          onKeyDown={(event) => {
            if (event.key.startsWith("Arrow")) {
              event.preventDefault();
              const bounds = playerRef.current?.getBoundingClientRect();
              if (!bounds) return;
              const step = event.shiftKey ? 32 : 16;
              const current = orbPosition ?? { left: bounds.width - 74, top: 18 };
              const nextPosition = {
                left: Math.max(8, Math.min(bounds.width - 64, current.left + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))),
                top: Math.max(8, Math.min(bounds.height - 64, current.top + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))),
              };
              setOrbPosition(nextPosition);
              if (companionOpen) setPanelPosition(getPanelPosition(bounds, nextPosition));
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleCompanionAtOrb();
            }
          }}
          className={`lens-orb absolute z-30 grid h-14 w-14 cursor-grab place-items-center overflow-hidden rounded-full bg-transparent p-0 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${companionOpen ? "lens-orb-hidden" : "lens-orb-visible"}`}
          style={orbPosition ? { left: orbPosition.left, top: orbPosition.top } : { right: 18, top: 18 }}
        >
          <AiPet size={52} />
          <span className="sr-only">Live Lens</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Video time:</span>
            <span className="font-mono font-medium text-white tracking-wider text-base">
              {formatPlaybackTime(playbackTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Match time:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 font-mono tracking-wide shadow-sm">
            {currentMatchMinute}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!transcriptOpen && transcriptStatus === "idle") setTranscriptStatus("loading");
            setTranscriptOpen((open) => !open);
          }}
          aria-expanded={transcriptOpen}
          className="min-h-11 cursor-pointer rounded-md border border-zinc-700 px-3 text-xs text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          {transcriptOpen ? "Hide transcript" : "Transcript"}
        </button>
        <button
          type="button"
          onClick={onToggleAutomaticNotes}
          aria-pressed={automaticNotesEnabled}
          className={`min-h-11 cursor-pointer rounded-md border px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
            automaticNotesEnabled
              ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
              : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
          }`}
        >
          Match notes {automaticNotesEnabled ? "on" : "off"}
        </button>
      </div>

      {transcriptOpen && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-4" aria-label="Match transcript">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Commentary transcript</h2>
              <p className="mt-1 text-xs text-zinc-400">Choose a line to jump to that moment.</p>
            </div>
            <button type="button" onClick={() => setTranscriptOpen(false)} aria-label="Close transcript" className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            {transcriptStatus === "loading" && <p className="text-sm text-zinc-300">Loading transcript…</p>}
            {transcriptStatus === "missing" && <p className="text-sm leading-relaxed text-zinc-300">A transcript hasn’t been added for this match yet.</p>}
            {transcriptStatus === "ready" && (
              <ol className="space-y-1">
                {transcriptCues.map((cue) => {
                  const active = playbackTime >= cue.start && playbackTime < cue.end;
                  return (
                    <li key={cue.id}>
                      <button type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = cue.start; }} className={`flex w-full cursor-pointer gap-3 rounded-md px-2 py-2 text-left text-sm leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? "bg-cyan-950/70 text-white" : "text-zinc-300 hover:bg-zinc-900"}`}>
                        <span className="shrink-0 font-mono text-xs text-zinc-400">{formatPlaybackTime(cue.start)}</span>
                        <span>{cue.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
