import { getCuratedEvents, getEventById } from "./events.js";
import { retrieveMatchingRules } from "./rules.js";
import { filterHighSignalStatsBombActions, findLatestOnBallAction } from "./statsbomb-mapping.js";

const TIMESTAMP_MATCH_FALLBACK_WINDOW_SEC = 25;

/**
 * Determines whether a playback time in seconds falls within an event's verified range.
 * Uses replayStartSeconds/replayEndSeconds if available, otherwise +/- 25s window.
 *
 * @param {object} event
 * @param {number} timeSec
 * @returns {boolean}
 */
export function isPlaybackTimeWithinEvent(event, timeSec) {
  if (!event || typeof timeSec !== "number" || isNaN(timeSec)) return false;

  const hasReplayRange =
    typeof event.replayStartSeconds === "number" &&
    typeof event.replayEndSeconds === "number";

  if (hasReplayRange) {
    return timeSec >= event.replayStartSeconds && timeSec <= event.replayEndSeconds;
  }

  const start = event.videoTimeSeconds - TIMESTAMP_MATCH_FALLBACK_WINDOW_SEC;
  const end = event.videoTimeSeconds + TIMESTAMP_MATCH_FALLBACK_WINDOW_SEC;
  return timeSec >= start && timeSec <= end;
}

/**
 * Pure, synchronous, deterministic context retrieval function.
 * Does not fetch network data or call an AI model.
 *
 * @param {object} params
 * @param {number} params.playbackTimeSec - Current video playback time in seconds
 * @param {string|null} [params.selectedEventId] - Explicitly selected event ID (if any)
 * @param {string} [params.question] - The user's submitted question
 * @param {Array<object>|null} [params.statsBombEvents] - Optional pre-fetched StatsBomb slice
 * @returns {object} Deterministic evidence context object
 */
export function buildContext({
  playbackTimeSec = 0,
  selectedEventId = null,
  question = "",
  statsBombEvents = null,
  matchState = null,
  matchPosition = null,
} = {}) {
  const curatedEvents = getCuratedEvents();
  const timeSec = typeof playbackTimeSec === "number" && !isNaN(playbackTimeSec) ? playbackTimeSec : 0;
  const cleanQuestion = typeof question === "string" ? question.trim() : "";

  let matchedEvent = null;
  let eventStatus = "no_matching_event";

  // 1. Explicit event selection
  if (selectedEventId !== null && selectedEventId !== undefined && String(selectedEventId).trim() !== "") {
    const found = getEventById(String(selectedEventId).trim());
    if (found) {
      matchedEvent = found;
      eventStatus = "matched_event";
    } else {
      // Invalid event ID: return no matching event. DO NOT silently fall back to timestamp.
      matchedEvent = null;
      eventStatus = "no_matching_event";
    }
  } else {
    // 2. Timestamp-based match: search within verified replay boundaries or +/- 25s fallback
    const matchingCandidates = curatedEvents.filter((ev) => isPlaybackTimeWithinEvent(ev, timeSec));

    if (matchingCandidates.length > 0) {
      // If multiple events overlap the window, select the closest to the center videoTimeSeconds
      matchingCandidates.sort(
        (a, b) =>
          Math.abs(timeSec - a.videoTimeSeconds) - Math.abs(timeSec - b.videoTimeSeconds)
      );
      matchedEvent = matchingCandidates[0];
      eventStatus = "matched_event";
    } else {
      matchedEvent = null;
      eventStatus = "no_matching_event";
    }
  }

  // 3. Rule matching: using matched event tags and question terms
  const eventRuleTags = matchedEvent?.ruleTags || [];
  const rules = retrieveMatchingRules({
    ruleTags: eventRuleTags,
    question: cleanQuestion,
  });

  // 4. Match state
  let resolvedMatchState = matchState;
  if (matchedEvent) {
    resolvedMatchState = {
      ...matchState,
      scoreBefore: matchedEvent.scoreBefore,
      scoreAfter: matchedEvent.scoreAfter,
      period: matchedEvent.period,
      matchMinute: matchedEvent.matchMinute,
      videoPlaybackSeconds: timeSec,
      isApproximate: false,
    };
  }

  // 5. StatsBomb high-signal actions (live match: backward history, max +1 min forward)
  let maxAllowedMinute = null;
  if (typeof matchedEvent?.statsBombPosition?.minute === "number") {
    maxAllowedMinute = matchedEvent.statsBombPosition.minute + 1;
  }
  const highSignalActions = filterHighSignalStatsBombActions(statsBombEvents, { maxAllowedMinute });
  const possessionQuestion = /\b(who|which player).{0,30}\b(ball|possession|on the ball)\b|\bwho('?s| is) on the ball\b/i.test(cleanQuestion);
  const latestOnBallAction = possessionQuestion
    ? findLatestOnBallAction(statsBombEvents, matchPosition || {})
    : null;

  // 6. Aggregate sources
  const sources = [];
  const seenSourceUrls = new Set();

  if (matchedEvent?.sources && Array.isArray(matchedEvent.sources)) {
    for (const src of matchedEvent.sources) {
      if (src && src.label) {
        sources.push(src);
        if (src.url) seenSourceUrls.add(src.url);
      }
    }
  }

  for (const rule of rules) {
    if (rule.sourceUrl && !seenSourceUrls.has(rule.sourceUrl)) {
      sources.push({
        label: `${rule.law} (${rule.edition})`,
        url: rule.sourceUrl,
      });
      seenSourceUrls.add(rule.sourceUrl);
    }
  }

  // 7. Aggregate uncertainty and evidence limits
  const uncertainty = [];
  if (matchedEvent?.uncertainty && Array.isArray(matchedEvent.uncertainty)) {
    uncertainty.push(...matchedEvent.uncertainty);
  }

  const evidenceLimits = [];
  if (Array.isArray(statsBombEvents) && !possessionQuestion) {
    evidenceLimits.push(
      "StatsBomb records match actions; it cannot establish referee intent or unrecorded tactical rationale."
    );
  }
  if (
    !matchedEvent &&
    !possessionQuestion &&
    !["pre-match", "half-time", "second-half-start", "extra-time-break", "penalty-shootout", "post-match"]
      .includes(matchState?.phase)
  ) {
    evidenceLimits.push("No verified match incident recorded for this playback timestamp.");
  }

  return {
    eventStatus,
    matchedEvent,
    matchState: resolvedMatchState,
    rules,
    statsBombActions: highSignalActions,
    possessionQuestion,
    latestOnBallAction,
    statsBombStatus: {
      queried: Array.isArray(statsBombEvents),
      actionsCount: highSignalActions.length,
      label: Array.isArray(statsBombEvents)
        ? `${highSignalActions.length} feed-recorded action(s)`
        : "No StatsBomb feed queried",
    },
    sources,
    uncertainty,
    evidenceLimits,
    retrievalMetadata: {
      playbackTimeSec: timeSec,
      explicitEventRequested: selectedEventId,
      question: cleanQuestion,
      matchPosition,
      timestampMatchesAllowed: selectedEventId === null || selectedEventId === undefined,
    },
  };
}
