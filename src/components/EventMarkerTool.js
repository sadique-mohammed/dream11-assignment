"use client";

import { useEffect, useState } from "react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00:00.000";
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1000);
  const remainder = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(remainder).padStart(3, "0")}`;
}

export default function EventMarkerTool({ videoRef, playbackTime }) {
  const [matchMinute, setMatchMinute] = useState("");
  const [markers, setMarkers] = useState([]);
  const [status, setStatus] = useState("Loading saved marks…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/markers")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load saved marks.");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setMarkers(data.markers);
        setStatus(`Saved automatically to project/data/match-minute-markers.json (${data.markers.length} marks).`);
      })
      .catch((error) => !cancelled && setStatus(error.message));
    return () => { cancelled = true; };
  }, []);

  const saveMark = async (event) => {
    event.preventDefault();
    const label = matchMinute.trim();
    if (!label) {
      setStatus("Enter the match clock label, such as 12, 45+2, HT, ET, or Penalties.");
      return;
    }

    const marker = {
      matchMinute: label,
      videoTimeSeconds: Number.isFinite(videoRef.current?.currentTime)
        ? videoRef.current.currentTime
        : playbackTime,
    };
    setSaving(true);
    try {
      const response = await fetch("/api/markers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(marker),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this mark.");
      setMarkers(data.markers);
      setMatchMinute("");
      setStatus(`Saved ${label} → ${formatTime(marker.videoTimeSeconds)} to project/data/match-minute-markers.json.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMark = async (id) => {
    try {
      const response = await fetch("/api/markers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove this mark.");
      setMarkers(data.markers);
      setStatus("Mark removed and JSON file updated.");
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 text-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-white">Match-minute time map</h2>
        <p className="font-mono text-cyan-200">Video: {formatTime(playbackTime)}</p>
      </div>
      <p className="mb-3 text-xs text-zinc-400">
        Enter only the match clock label. Save captures the player’s exact video time and writes it to the project JSON automatically.
      </p>

      <form onSubmit={saveMark} className="flex flex-wrap gap-2">
        <input
          value={matchMinute}
          onChange={(event) => setMatchMinute(event.target.value)}
          aria-label="Match clock label"
          placeholder="12, 45+2, HT, ET, Penalties"
          className="min-w-56 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
        <button type="submit" disabled={saving} className="marker-button marker-primary">
          {saving ? "Saving…" : "Save current time"}
        </button>
      </form>

      <p role="status" className="mt-3 text-xs text-zinc-300">{status}</p>
      {markers.length > 0 && (
        <ol className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t border-zinc-700 pt-3">
          {markers.map((marker) => (
            <li key={marker.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-200">Match {marker.matchMinute} <span className="text-zinc-500">→ Video {formatTime(marker.videoTimeSeconds)}</span></span>
              <button type="button" onClick={() => deleteMark(marker.id)} className="cursor-pointer text-zinc-500 hover:text-red-300" aria-label={`Remove mark for ${marker.matchMinute}`}>Remove</button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
