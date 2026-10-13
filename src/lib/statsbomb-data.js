import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedEvents = null;

/**
 * Loads and caches StatsBomb.json match events in server memory.
 * @returns {Promise<Array<object>>}
 */
export async function getStatsBombEvents() {
  if (cachedEvents) return cachedEvents;
  try {
    const statsBombFile = path.join(process.cwd(), "data", "StatsBomb.json");
    const raw = await readFile(statsBombFile, "utf8");
    cachedEvents = JSON.parse(raw);
    return cachedEvents;
  } catch (error) {
    console.error("Failed to read StatsBomb.json:", error);
    return [];
  }
}

/**
 * Slices StatsBomb events within a live-match window (past history, max +1 min forward).
 *
 * @param {object} params
 * @param {number} params.targetMinute - The target match minute
 * @param {number|null} [params.period] - The official match period (1-5)
 * @param {number} [params.pastWindow=5] - Minutes of past history to include (max 10)
 * @param {number} [params.forwardWindow=1] - Maximum forward minutes to include (strictly capped at 1 for live match)
 * @returns {Promise<Array<object>>}
 */
export async function getStatsBombSlice({
  targetMinute,
  period = null,
  pastWindow = 5,
  forwardWindow = 1,
} = {}) {
  if (typeof targetMinute !== "number" || isNaN(targetMinute)) {
    return [];
  }

  const allEvents = await getStatsBombEvents();
  if (!allEvents || allEvents.length === 0) return [];

  const pastWindowMinutes = Math.min(10, Math.max(1, pastWindow));
  const forwardWindowMinutes = Math.min(1, Math.max(0, forwardWindow));

  const minMin = Math.max(0, targetMinute - pastWindowMinutes);
  const maxMin = targetMinute + forwardWindowMinutes;

  return allEvents.filter((e) => {
    if (period !== null && !isNaN(period) && e.period !== period) {
      return false;
    }
    return typeof e.minute === "number" && e.minute >= minMin && e.minute <= maxMin;
  });
}
