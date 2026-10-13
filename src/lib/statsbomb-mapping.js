import markerData from "../../data/match-minute-markers.json" with { type: "json" };

const sortedMarkers = Array.isArray(markerData?.markers)
  ? [...markerData.markers].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds)
  : [];

/**
 * High-signal event types to keep from the StatsBomb feed.
 * Omits routine tracking events (passes, receipts, carries, recoveries, etc.).
 */
export const HIGH_SIGNAL_TYPES = new Set([
  "Shot",
  "Goal",
  "Foul Committed",
  "Bad Behaviour",
  "Card",
  "Substitution",
]);

/**
 * Resolves the numeric period and minute for querying /api/statsbomb,
 * or determines that the query should be skipped with a stated reason.
 *
 * @param {object} params
 * @param {number} params.playbackTimeSec
 * @param {object|null} [params.selectedEvent]
 * @returns {{ shouldQuery: boolean, period: number | null, minute: number | null, reason?: string }}
 */
export function resolveStatsBombQueryTarget({ playbackTimeSec, selectedEvent = null } = {}) {
  // 1. If an explicit verified event is provided, prefer its verified statsBombPosition
  if (selectedEvent) {
    if (
      selectedEvent.statsBombPosition &&
      typeof selectedEvent.statsBombPosition.period === "number" &&
      typeof selectedEvent.statsBombPosition.minute === "number"
    ) {
      return {
        shouldQuery: true,
        period: selectedEvent.statsBombPosition.period,
        minute: selectedEvent.statsBombPosition.minute,
      };
    }
    return {
      shouldQuery: false,
      period: null,
      minute: null,
      reason: `No verified StatsBomb feed position for event "${selectedEvent.id}"`,
    };
  }

  // 2. Unselected playback time: map through calibrated match minute markers
  if (
    typeof playbackTimeSec !== "number" ||
    isNaN(playbackTimeSec) ||
    playbackTimeSec < 0 ||
    sortedMarkers.length === 0
  ) {
    return {
      shouldQuery: false,
      period: null,
      minute: null,
      reason: "Playback time is unavailable or invalid",
    };
  }

  const currentSec = Math.floor(playbackTimeSec);
  const firstMarkerSec = Math.floor(sortedMarkers[0].videoTimeSeconds);

  // Pre-match before kickoff
  if (currentSec < firstMarkerSec) {
    return {
      shouldQuery: false,
      period: null,
      minute: null,
      reason: "Pre-match phase (prior to kickoff); no match play feed recorded",
    };
  }

  // Find active marker
  let activeMarker = sortedMarkers[0];
  for (let i = 0; i < sortedMarkers.length; i++) {
    const markerSec = Math.floor(sortedMarkers[i].videoTimeSeconds);
    if (markerSec <= currentSec) {
      activeMarker = sortedMarkers[i];
    } else {
      break;
    }
  }

  const rawMinute = String(activeMarker?.matchMinute || "").trim();

  // Non-playing breaks / milestones
  if (rawMinute === "HT" || rawMinute === "HT Over") {
    return {
      shouldQuery: false,
      period: null,
      minute: null,
      reason: "Half-time break (non-playing interval); no play in feed",
    };
  }

  if (rawMinute === "90ET Start") {
    return {
      shouldQuery: false,
      period: null,
      minute: null,
      reason: "Extra-time break (non-playing interval); no play in feed",
    };
  }

  if (rawMinute === "Penalties Start" || rawMinute.toLowerCase().startsWith("match over")) {
    return {
      shouldQuery: false,
      period: null,
      minute: null,
      reason: "Shootout or post-match phase without verified event selection",
    };
  }

  // Stoppage time handling
  const stoppageMatch = rawMinute.match(/^(\d+)\+(\d+)$/);
  if (stoppageMatch) {
    const base = parseInt(stoppageMatch[1], 10);
    const added = parseInt(stoppageMatch[2], 10);

    if (base === 45) {
      return {
        shouldQuery: true,
        period: 1,
        minute: 45 + added,
      };
    }
    if (base === 90) {
      return {
        shouldQuery: true,
        period: 2,
        minute: 90 + added,
      };
    }
    if (base === 120) {
      return {
        shouldQuery: true,
        period: 4,
        minute: 120 + added,
      };
    }
  }

  // Standard numeric minute mapping to official match periods
  const numericMinute = parseInt(rawMinute, 10);
  if (!isNaN(numericMinute)) {
    if (numericMinute <= 45) {
      return {
        shouldQuery: true,
        period: 1,
        minute: numericMinute,
      };
    }
    if (numericMinute <= 90) {
      return {
        shouldQuery: true,
        period: 2,
        minute: numericMinute,
      };
    }
    if (numericMinute <= 105) {
      return {
        shouldQuery: true,
        period: 3,
        minute: numericMinute,
      };
    }
    if (numericMinute <= 120) {
      return {
        shouldQuery: true,
        period: 4,
        minute: numericMinute,
      };
    }
  }

  return {
    shouldQuery: false,
    period: null,
    minute: null,
    reason: `Unrecognized or unmapped match minute "${rawMinute}"`,
  };
}

/**
 * Filters a raw list of StatsBomb events down to concise high-signal actions
 * (goals, shots, fouls/cards, substitutions).
 *
 * Live match guard: optionally rejects any event beyond maxAllowedMinute (e.g. targetMinute + 1).
 *
 * @param {Array<object>} events
 * @param {object} [options]
 * @param {number|null} [options.maxAllowedMinute]
 * @returns {Array<object>}
 */
export function filterHighSignalStatsBombActions(events, { maxAllowedMinute = null } = {}) {
  if (!Array.isArray(events)) return [];

  return events
    .filter((e) => {
      if (!e) return false;
      if (typeof maxAllowedMinute === "number" && typeof e.minute === "number" && e.minute > maxAllowedMinute) {
        return false;
      }
      const typeName = typeof e.type === "string" ? e.type : e.type?.name;
      return typeof typeName === "string" && HIGH_SIGNAL_TYPES.has(typeName);
    })
    .map((e) => {
      const type = typeof e.type === "string" ? e.type : e.type?.name || null;
      const sec = typeof e.second === "number" ? String(e.second).padStart(2, "0") : "00";
      const timeDisplay = typeof e.minute === "number" ? `${e.minute}:${sec}` : "";
      const team = typeof e.team === "string" ? e.team : e.team?.name || null;
      const player = typeof e.player === "string" ? e.player : e.player?.name || null;
      const outcome =
        e.outcome ||
        e.shot?.outcome?.name ||
        e.pass?.outcome?.name ||
        e.foul_committed?.card?.name ||
        e.bad_behaviour?.card?.name ||
        null;
      const detail =
        e.detail ||
        (e.substitution?.replacement?.name
          ? `Replaced by ${e.substitution.replacement.name}`
          : e.foul_committed?.penalty
          ? "Penalty conceded"
          : null);

      return {
        id: e.id,
        period: e.period,
        minute: e.minute,
        second: e.second,
        timeDisplay,
        type,
        team,
        player,
        outcome,
        detail,
      };
    });
}
