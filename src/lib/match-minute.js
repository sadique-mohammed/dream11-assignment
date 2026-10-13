import markerData from "../../data/match-minute-markers.json" with { type: "json" };

// Pre-sort markers ascending by video timestamp
const sortedMarkers = Array.isArray(markerData?.markers)
  ? [...markerData.markers].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds)
  : [];

/**
 * Formats a raw matchMinute label into match clock time with auto-applied seconds
 * e.g. "23" + 1.2s -> "23:01"
 * e.g. "23" + 59.1s -> "23:59"
 * e.g. "45+2" + 14s -> "45+2:14"
 * e.g. "HT" -> "HT"
 * e.g. "Penalties Start" -> "Penalties"
 *
 * @param {string} rawMinute
 * @param {number} elapsedSeconds
 * @param {boolean} includeSeconds
 * @returns {string}
 */
export function formatMatchMinute(rawMinute, elapsedSeconds = 0, includeSeconds = true) {
  if (!rawMinute) return "Unavailable";
  const str = String(rawMinute).trim();
  if (str === "HT" || str === "HT Over") return str;
  if (str === "90ET Start") return "90' (ET Break)";
  if (str === "Penalties Start") return "Penalties";
  if (str === "Match Over - Argentina Won" || str.toLowerCase().startsWith("match over")) {
    return str;
  }

  const isNumericMinute = /^\d+$/.test(str);
  const isStoppageTime = /^\d+\+\d+$/.test(str);

  if (!includeSeconds) {
    if (isNumericMinute || isStoppageTime) {
      return `${str}'`;
    }
    return str;
  }

  const sec = Math.min(59, Math.max(0, Math.floor(elapsedSeconds)));
  const secStr = String(sec).padStart(2, "0");

  // Pure integer minutes like "0", "1", "23", "118"
  if (isNumericMinute) {
    const minStr = str.padStart(2, "0");
    return `${minStr}:${secStr}`;
  }

  // Stoppage time like "45+1", "90+11", "120+1"
  if (isStoppageTime) {
    return `${str}:${secStr}`;
  }

  // Any non-timed status / milestone string
  return str;
}

/**
 * Looks up the official match clock time for a given video playback second
 * using calibrated match minute markers.
 *
 * Automatically counts seconds within each minute (e.g. 23:00 -> 23:01 -> 23:59 -> 24:00)
 * and transitions when the next minute boundary is reached.
 *
 * @param {number} currentTimeSeconds
 * @param {boolean} [includeSeconds=true]
 * @returns {string} e.g. "23:01", "23:30", "45+2:14", "HT", "Pre-match"
 */
export function getMatchMinuteAtTime(currentTimeSeconds, includeSeconds = true) {
  if (
    typeof currentTimeSeconds !== "number" ||
    isNaN(currentTimeSeconds) ||
    currentTimeSeconds < 0
  ) {
    return "Unavailable";
  }

  if (sortedMarkers.length === 0) {
    return "Unavailable";
  }

  // Align with video playback integer second to avoid subsecond delays
  const currentSec = Math.floor(currentTimeSeconds);
  const firstMarkerSec = Math.floor(sortedMarkers[0].videoTimeSeconds);

  // Before kickoff (marker 0 starts around 154s)
  if (currentSec < firstMarkerSec) {
    return "Pre-match";
  }

  // Find the active marker whose integer timestamp <= current playback second
  let activeMarker = sortedMarkers[0];
  for (let i = 0; i < sortedMarkers.length; i++) {
    const markerSec = Math.floor(sortedMarkers[i].videoTimeSeconds);
    if (markerSec <= currentSec) {
      activeMarker = sortedMarkers[i];
    } else {
      break;
    }
  }

  const elapsed = currentSec - Math.floor(activeMarker.videoTimeSeconds);
  return formatMatchMinute(activeMarker.matchMinute, elapsed, includeSeconds);
}
