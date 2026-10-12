import eventsData from "../../data/events.json";

/**
 * Returns all curated match events.
 * @returns {Array<object>}
 */
export function getCuratedEvents() {
  return Array.isArray(eventsData?.events) ? eventsData.events : [];
}

/**
 * Returns a single curated event by its ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getEventById(id) {
  if (!id) return null;
  const events = getCuratedEvents();
  return events.find((e) => e.id === id) || null;
}
