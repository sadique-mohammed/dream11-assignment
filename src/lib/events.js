import eventsData from "../../data/events.json" with { type: "json" };

export function getCuratedEvents() {
  return Array.isArray(eventsData?.events) ? eventsData.events : [];
}

export function getEventById(id) {
  if (!id) return null;
  const events = getCuratedEvents();
  return events.find((e) => e.id === id) || null;
}
