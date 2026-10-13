import { NextResponse } from "next/server";
import { getStatsBombEvents, getStatsBombSlice } from "@/lib/statsbomb-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/statsbomb?minute=73&window=5
 * Returns a lightweight slice of StatsBomb match events within +/- window minutes (default 5 min).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const minuteParam = searchParams.get("minute");
  const windowParam = searchParams.get("window");
  const periodParam = searchParams.get("period");

  const targetMinute = minuteParam !== null ? parseInt(minuteParam, 10) : null;
  const windowMinutes = Math.min(10, Math.max(1, windowParam !== null ? parseInt(windowParam, 10) : 5));
  const period = periodParam !== null ? parseInt(periodParam, 10) : null;

  const allEvents = await getStatsBombEvents();
  if (!allEvents || allEvents.length === 0) {
    return NextResponse.json({ error: "StatsBomb feed unavailable" }, { status: 503 });
  }

  // If no minute specified, return match summary overview
  if (targetMinute === null || isNaN(targetMinute)) {
    return NextResponse.json({
      totalEvents: allEvents.length,
      note: "Provide ?minute=X&window=5 to retrieve batched match events within +/- 5 to 10 minutes.",
    });
  }

  const pastWindow = windowMinutes;
  const forwardWindow = 1;
  const minMin = Math.max(0, targetMinute - pastWindow);
  const maxMin = targetMinute + forwardWindow;

  const matched = await getStatsBombSlice({
    targetMinute,
    period,
    pastWindow,
    forwardWindow,
  });

  // Pick only relevant concise fields so client bundle/network payload is not bloated
  const simplifiedEvents = matched.map((e) => ({
    id: e.id,
    period: e.period,
    minute: e.minute,
    second: e.second,
    type: e.type?.name || null,
    team: e.team?.name || null,
    player: e.player?.name || null,
    outcome:
      e.shot?.outcome?.name ||
      e.pass?.outcome?.name ||
      e.foul_committed?.card?.name ||
      e.bad_behaviour?.card?.name ||
      null,
    detail:
      e.substitution?.replacement?.name
        ? `Replaced by ${e.substitution.replacement.name}`
        : e.foul_committed?.penalty
        ? "Penalty conceded"
        : null,
  }));

  return NextResponse.json({
    targetMinute,
    windowMinutes,
    minMinute: minMin,
    maxMinute: maxMin,
    totalEventsInWindow: simplifiedEvents.length,
    events: simplifiedEvents,
  });
}
