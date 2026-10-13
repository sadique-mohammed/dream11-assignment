import triggersData from "../../data/significant-triggers.json" with { type: "json" };

const triggers = Array.isArray(triggersData)
  ? [...triggersData].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds)
  : [];

export function getFeedTriggers() {
  return triggers;
}

export function getFeedTriggerById(id) {
  return typeof id === "string" ? triggers.find((trigger) => trigger.id === id) || null : null;
}

export function findCrossedTrigger(previousTime, currentTime, seenIds) {
  if (currentTime <= previousTime) return null;
  return triggers.find((trigger) =>
    previousTime < trigger.videoTimeSeconds &&
    currentTime >= trigger.videoTimeSeconds &&
    !seenIds?.has(trigger.id)
  ) || null;
}
