import { getCuratedEvents, getEventById } from "./events.js";
import { retrieveMatchingRules } from "./rules.js";
import { filterHighSignalStatsBombActions, findLatestOnBallAction } from "./statsbomb-mapping.js";

const TIMESTAMP_MATCH_FALLBACK_WINDOW_SEC = 25;

function isPlaybackTimeWithinEvent(event, timeSec) {
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

  if (selectedEventId !== null && selectedEventId !== undefined && String(selectedEventId).trim() !== "") {
    const found = getEventById(String(selectedEventId).trim());
    if (found) {
      matchedEvent = found;
      eventStatus = "matched_event";
    } else {
      matchedEvent = null;
      eventStatus = "no_matching_event";
    }
  } else {
    const matchingCandidates = curatedEvents.filter((ev) => isPlaybackTimeWithinEvent(ev, timeSec));

    if (matchingCandidates.length > 0) {
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

  const eventRuleTags = matchedEvent?.ruleTags || [];
  const rules = retrieveMatchingRules({
    ruleTags: eventRuleTags,
    question: cleanQuestion,
  });

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

  let maxAllowedMinute = null;
  if (typeof matchedEvent?.statsBombPosition?.minute === "number") {
    maxAllowedMinute = matchedEvent.statsBombPosition.minute + 1;
  }
  const highSignalActions = filterHighSignalStatsBombActions(statsBombEvents, { maxAllowedMinute });
  const possessionQuestion = /\b(who|which player).{0,30}\b(ball|possession|on the ball)\b|\bwho('?s| is) on the ball\b/i.test(cleanQuestion);
  const latestOnBallAction = possessionQuestion
    ? findLatestOnBallAction(statsBombEvents, matchPosition || {})
    : null;

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

  const uncertainty = [];
  if (matchedEvent?.uncertainty && Array.isArray(matchedEvent.uncertainty)) {
    uncertainty.push(...matchedEvent.uncertainty);
  }

  const evidenceLimits = [];
  if (Array.isArray(statsBombEvents) && !possessionQuestion) {
    evidenceLimits.push(
      "The match record lists actions, but it does not say why the referee made a decision or explain tactics that were not recorded."
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
    sources,
    uncertainty,
    evidenceLimits,
  };
}
