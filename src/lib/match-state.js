/** Derive phase and score from the calibrated match clock and StatsBomb goals. */
export function getMatchStateAtClock(matchClock, events = []) {
  const label = typeof matchClock === "string" ? matchClock : "Unavailable";
  const position = parseMatchClock(label);
  const score = { Argentina: 0, Netherlands: 0 };
  let lastGoal = null;

  if (position) {
    const goals = events
      .filter((event) => {
        const team = event?.team?.name;
        if (event?.shot?.outcome?.name !== "Goal" || !(team in score)) return false;
        if (event.period > position.period) return false;
        return event.period < position.period || event.minute <= position.minute;
      })
      .sort((a, b) => a.period - b.period || a.minute - b.minute || a.second - b.second);

    for (const goal of goals) {
      score[goal.team.name] += 1;
      lastGoal = {
        team: goal.team.name,
        player: goal.player?.name || "Unknown player",
        minute: goal.minute,
      };
    }
  }

  const hasScoreData = Array.isArray(events) && events.length > 0;
  return {
    phase: position?.phase || "match",
    matchClock: label,
    score: hasScoreData ? score : null,
    scoreDisplay: hasScoreData ? `${score.Argentina}–${score.Netherlands}` : null,
    lastGoal,
  };
}

function parseMatchClock(label) {
  if (label === "Pre-match") return { period: 1, minute: -1, phase: "pre-match" };
  if (label === "HT") return { period: 1, minute: 45, phase: "half-time" };
  if (label === "HT Over") return { period: 1, minute: 45, phase: "second-half-start" };
  if (label.includes("ET Break")) return { period: 2, minute: 90, phase: "extra-time-break" };
  if (label === "Penalties") return { period: 4, minute: 120, phase: "penalty-shootout" };
  if (label.toLowerCase().startsWith("match over")) {
    return { period: 4, minute: 120, phase: "post-match" };
  }

  const timed = label.match(/^(\d+)(?:\+(\d+))?/);
  if (!timed) return null;
  const baseMinute = Number(timed[1]);
  const minute = baseMinute + Number(timed[2] || 0);
  const period = baseMinute <= 45 ? 1 : baseMinute <= 90 ? 2 : baseMinute <= 105 ? 3 : 4;
  const phase = period === 1 ? "first-half" : period === 2 ? "second-half" : "extra-time";
  return { period, minute, phase };
}
