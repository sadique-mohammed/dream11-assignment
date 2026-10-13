import triggersData from "../../data/significant-triggers.json" with { type: "json" };

/**
 * Array of sorted significant match events and intervals (StatsBomb + Curated + Breaks)
 * with mapped video timestamps.
 */
export const FEED_TRIGGERS = Array.isArray(triggersData)
  ? [...triggersData].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds)
  : [];

/**
 * Returns all feed triggers.
 * @returns {Array<object>}
 */
export function getFeedTriggers() {
  return FEED_TRIGGERS;
}

/**
 * Finds a trigger by its ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getFeedTriggerById(id) {
  if (!id || typeof id !== "string") return null;
  return FEED_TRIGGERS.find((t) => t.id === id) || null;
}

/**
 * Checks if a playback transition (from previous -> current) crosses any trigger.
 *
 * Requirements:
 * - Only detects forward playback (previous < current)
 * - Ignores seeks/scrubbing (caller ensures current - previous <= naturalPlaybackThreshold)
 * - Returns the first crossed trigger not yet seen
 *
 * @param {number} previousTimeSec
 * @param {number} currentTimeSec
 * @param {Set<string>} seenTriggerIds
 * @returns {object|null}
 */
export function findCrossedTrigger(previousTimeSec, currentTimeSec, seenTriggerIds) {
  if (
    typeof previousTimeSec !== "number" ||
    typeof currentTimeSec !== "number" ||
    currentTimeSec <= previousTimeSec
  ) {
    return null;
  }

  for (const trigger of FEED_TRIGGERS) {
    if (
      previousTimeSec < trigger.videoTimeSeconds &&
      currentTimeSec >= trigger.videoTimeSeconds
    ) {
      if (!seenTriggerIds || !seenTriggerIds.has(trigger.id)) {
        return trigger;
      }
    }
  }

  return null;
}
