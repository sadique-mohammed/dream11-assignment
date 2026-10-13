import markerData from "../../data/match-minute-markers.json" with { type: "json" };

const sortedMarkers = Array.isArray(markerData?.markers)
  ? [...markerData.markers].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds)
  : [];

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

  if (isNumericMinute) {
    const minStr = str.padStart(2, "0");
    return `${minStr}:${secStr}`;
  }

  if (isStoppageTime) {
    return `${str}:${secStr}`;
  }

  return str;
}

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

  const currentSec = Math.floor(currentTimeSeconds);
  const firstMarkerSec = Math.floor(sortedMarkers[0].videoTimeSeconds);

  if (currentSec < firstMarkerSec) {
    return "Pre-match";
  }

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
