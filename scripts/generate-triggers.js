import { writeFile } from "node:fs/promises";
import path from "node:path";
import markerData from "../data/match-minute-markers.json" with { type: "json" };
import curatedData from "../data/events.json" with { type: "json" };
import { getStatsBombEvents } from "../src/lib/statsbomb-data.js";

const markers = markerData.markers;
const curated = curatedData.events;

function mapToVideoTime(period, minute, second = 0) {
  if (period === 5) {
    const penStart = 8841.479559;
    const penEnd = 9318.0;
    const elapsedPen = (minute - 120) * 60 + second;
    const totalPen = 8 * 60;
    return penStart + (elapsedPen / totalPen) * (penEnd - penStart);
  }

  let targetLabel = String(minute);
  if (period === 1 && minute > 45) {
    targetLabel = `45+${minute - 45}`;
  } else if (period === 2 && minute > 90) {
    targetLabel = `90+${minute - 90}`;
  } else if (period === 4 && minute > 120) {
    targetLabel = `120+${minute - 120}`;
  }

  const m = markers.find((x) => x.matchMinute === targetLabel);
  if (m) {
    return m.videoTimeSeconds + second;
  }
  return null;
}

async function generateTriggers() {
  const allEvents = await getStatsBombEvents();
  const triggers = [];

  const breaks = [
    {
      id: "break-HT",
      matchMinute: "HT",
      videoTimeSeconds: 3004.89,
      type: "break",
      title: "Half-time Interval",
      quickNote: "Half-time: Argentina lead the Netherlands 1–0. Nahuel Molina scored in the 35th minute.",
      mappingNote: "Official match interval",
      isCurated: true,
    },
    {
      id: "break-90ET",
      matchMinute: "90' (ET Break)",
      videoTimeSeconds: 6867.7,
      type: "break",
      title: "Extra-time Break",
      quickNote: "The match is 2–2 after 90+ minutes. The teams are taking a short break before extra time.",
      mappingNote: "Official match interval",
      isCurated: true,
    },
    {
      id: "break-Penalties",
      matchMinute: "Penalties",
      videoTimeSeconds: 8841.48,
      type: "break",
      title: "Penalty Shootout Begins",
      quickNote: "The match remains 2–2 after 120 minutes. Penalties will decide who advances to the semi-final.",
      mappingNote: "Official match interval",
      isCurated: true,
    },
  ];
  triggers.push(...breaks);

  for (const c of curated) {
    triggers.push({
      id: c.id,
      curatedEventId: c.id,
      isCurated: true,
      period: c.statsBombPosition?.period || (c.period === "first_half" ? 1 : c.period === "second_half" ? 2 : c.period === "extra_time" ? 4 : 5),
      minute: c.statsBombPosition?.minute || 0,
      second: 0,
      matchMinute: c.matchMinute,
      videoTimeSeconds: c.videoTimeSeconds,
      type: c.ruleTags?.includes("penalty")
        ? "penalty"
        : c.ruleTags?.includes("card")
        ? "card"
        : c.ruleTags?.includes("goal")
        ? "goal"
        : "moment",
      title: c.title,
      quickNote: c.quickNote,
      mappingNote: "Verified match moment",
      facts: c.facts,
      uncertainty: c.uncertainty,
    });
  }

  for (const e of allEvents) {
    const isGoal = e.shot?.outcome?.name === "Goal";
    const card = e.foul_committed?.card?.name || e.bad_behaviour?.card?.name;
    const isPenaltyFoul = e.foul_committed?.penalty === true;
    const isShootoutShot = e.period === 5 && e.type?.name === "Shot";

    if (!isGoal && !card && !isPenaltyFoul && !isShootoutShot) continue;

    const vTime = mapToVideoTime(e.period, e.minute, e.second || 0);
    if (vTime === null) continue;

    const matchedCurated = curated.find((c) => {
      return Math.abs(c.videoTimeSeconds - vTime) <= 35;
    });

    if (matchedCurated) continue;

    let type = "moment";
    let title = "";
    let quickNote = "";

    if (isGoal) {
      type = "goal";
      title = `Goal: ${e.player?.name || "Goal"}`;
      quickNote = `${e.player?.name} scores for ${e.team?.name} in the ${e.minute}' minute!`;
    } else if (card) {
      const isRed = card.toLowerCase().includes("red") || card.toLowerCase().includes("second");
      type = isRed ? "red_card" : "yellow_card";
      title = `${card}: ${e.player?.name || "Player"}`;
      quickNote = `${e.player?.name} (${e.team?.name}) receives a ${card.toLowerCase()} from referee Mateu Lahoz.`;
    } else if (isPenaltyFoul) {
      type = "penalty";
      title = `Penalty Conceded: ${e.player?.name || "Foul"}`;
      quickNote = `Foul in the penalty area by ${e.player?.name} (${e.team?.name}) in the ${e.minute}' minute.`;
    } else if (isShootoutShot) {
      type = "shootout_kick";
      const outcome = e.shot?.outcome?.name || "Taken";
      title = `Shootout Kick: ${e.player?.name || "Penalty"}`;
      quickNote = `Penalty taken by ${e.player?.name} (${e.team?.name}) — ${outcome}.`;
    }

    triggers.push({
      id: `sb-${e.id}`,
      statsBombId: e.id,
      curatedEventId: null,
      isCurated: false,
      period: e.period,
      minute: e.minute,
      second: e.second || 0,
      matchMinute: `${e.minute}'`,
      videoTimeSeconds: Number(vTime.toFixed(1)),
      type,
      title,
      quickNote,
      player: e.player?.name || null,
      team: e.team?.name || null,
      mappingNote: "Approximate video timing from match records (about ±15 seconds)",
    });
  }

  const seenIds = new Set();
  triggers.sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds);

  const unique = [];
  for (const t of triggers) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      unique.push(t);
    }
  }

  const outPath = path.join(process.cwd(), "data", "significant-triggers.json");
  await writeFile(outPath, JSON.stringify(unique, null, 2), "utf8");
  console.log(`✅ Generated ${unique.length} significant feed triggers at: ${outPath}`);
}

generateTriggers().catch((err) => {
  console.error("Failed to generate triggers:", err);
  process.exit(1);
});
