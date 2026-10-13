import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedEvents = null;

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

export async function getStatsBombSlice({
  targetMinute,
  period = null,
  pastWindow = 5,
} = {}) {
  if (typeof targetMinute !== "number" || isNaN(targetMinute)) {
    return [];
  }

  const allEvents = await getStatsBombEvents();
  if (!allEvents || allEvents.length === 0) return [];

  const pastWindowMinutes = Math.min(10, Math.max(1, pastWindow));

  const minMin = Math.max(0, targetMinute - pastWindowMinutes);

  return allEvents.filter((e) => {
    if (period !== null && !isNaN(period) && e.period !== period) {
      return false;
    }
    return typeof e.minute === "number" && e.minute >= minMin && e.minute <= targetMinute;
  });
}
