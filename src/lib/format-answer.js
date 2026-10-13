export function formatAnswerPresentation({
  context,
  question = "",
  matchMinute = "",
} = {}) {
  const matched = context?.matchedEvent;
  const isNoMatching = context?.eventStatus === "no_matching_event";
  const cleanQ = (question || "").toLowerCase();

  let matchClockDisplay = "Live";
  if (matched?.matchMinute) {
    if (matched.matchMinute.toLowerCase().includes("shootout")) {
      matchClockDisplay = "Shootout";
    } else {
      matchClockDisplay = matched.matchMinute;
    }
  } else if (matchMinute && matchMinute !== "Unavailable") {
    matchClockDisplay = matchMinute;
  }

  let leadExplanation = "";
  if (context?.possessionQuestion) {
    const action = context.latestOnBallAction;
    if (!action?.player) {
      leadExplanation = "I can’t tell who has the ball from this moment. The match record has no recent action for it.";
    } else {
      const verbs = {
        "Ball Receipt*": "received",
        Carry: "carried",
        Dribble: "dribbled",
        "Ball Recovery": "recovered",
        Interception: "intercepted",
      };
      const actionText = verbs[action.type] || action.type.toLowerCase();
      const team = action.team ? ` of ${action.team}` : "";
      leadExplanation = `The latest recorded action shows ${action.player}${team} ${actionText} the ball at ${action.timeDisplay}, about ${action.secondsBeforePlayhead} seconds ago. It may not show who has it now.`;
    }
  } else if (isNoMatching) {
    const state = context?.matchState;
    const score = state?.scoreDisplay;
    const scoreSummary = getScoreSummary(state?.score);
    const scoreStatus = scoreSummary || (score ? `The score is ${score}` : "The score is unavailable");
    if (state?.phase === "pre-match") {
      leadExplanation = "The match has not kicked off yet. The score is 0–0.";
    } else if (state?.phase === "half-time") {
      leadExplanation = `It's half-time. ${scoreSummary ? `${scoreSummary} at the break` : `${scoreStatus} at the break`}.${state?.lastGoal ? ` ${state.lastGoal.player} scored the latest goal.` : ""}`;
    } else if (state?.phase === "second-half-start") {
      leadExplanation = `The second half is starting. ${scoreStatus}.`;
    } else if (state?.phase === "extra-time-break") {
      leadExplanation = `The teams are taking a break before extra time. ${scoreSummary ? `${scoreSummary} after 90 minutes.` : `The score is unavailable after 90 minutes.`}`;
    } else if (state?.phase === "penalty-shootout") {
      leadExplanation = `${scoreSummary || `The score is ${score || "unavailable"}`} after extra time. A penalty shootout will decide the winner.`;
    } else if (state?.phase === "post-match") {
      leadExplanation = `The match has finished. Argentina won after the teams drew ${score || "after extra time"}.`;
    } else if (score) {
      leadExplanation = `At ${matchClockDisplay}, ${scoreSummary || `the score is ${score}`}. No selected incident is recorded at this exact moment.`;
    } else {
      leadExplanation = "I don’t have a verified incident for this moment yet. Ask me about a listed match moment or a football rule.";
    }
  } else if (matched?.id === "dumfries-dismissal-shootout") {
    leadExplanation =
      "He received two cautions during the shootout and was sent off. The match report doesn’t say exactly what triggered the second caution.";
  } else if (matched?.id === "arg-penalty-73") {
    leadExplanation =
      "Argentina were awarded a penalty after Denzel Dumfries fouled Marcos Acuña inside the penalty box. Lionel Messi converted the spot kick to put Argentina 2–0 ahead.";
  } else if (matched?.id === "ned-goal-83") {
    leadExplanation =
      "Substitute Wout Weghorst scored a glancing header from Steven Berghuis’s curling cross to pull the Netherlands back to 2–1.";
  } else if (matched?.id === "paredes-confrontation-89") {
    leadExplanation =
      "Leandro Paredes fouled Nathan Aké and kicked the ball into the Dutch dugout, sparking an altercation before receiving a yellow card. The report does not state which action led to the card.";
  } else if (matched?.id === "ned-equaliser-90-11") {
    leadExplanation =
      "In the 101st minute, Teun Koopmeiners rolled an ingenious short free kick to Wout Weghorst, who turned and scored to equalise 2–2.";
  } else if (matched?.id === "et-to-shootout") {
    leadExplanation =
      "Extra time ended 2–2, sending the match into a penalty shootout under tournament knockout rules.";
  } else if (matched) {
    leadExplanation = matched.quickNote;
  }

  const allActions = Array.isArray(context?.statsBombActions) ? context.statsBombActions : [];
  let primaryActions = [];
  let secondaryActions = [];

  if (context?.possessionQuestion && context.latestOnBallAction) {
    const action = context.latestOnBallAction;
    primaryActions = [{
      id: `on-ball-${action.timeDisplay}-${action.player}`,
      timeDisplay: action.timeDisplay,
      type: `Last recorded action · ${action.type}`,
      player: action.player,
      team: action.team,
    }];
  }

  const isCardQuestion =
    cleanQ.includes("card") ||
    cleanQ.includes("yellow") ||
    cleanQ.includes("red") ||
    cleanQ.includes("caution") ||
    cleanQ.includes("dumfries") ||
    cleanQ.includes("foul") ||
    cleanQ.includes("sent off") ||
    cleanQ.includes("dismiss");

  const isGoalOrPenaltyQuestion =
    cleanQ.includes("penalty") ||
    cleanQ.includes("goal") ||
    cleanQ.includes("score") ||
    cleanQ.includes("shot");

  if (context?.possessionQuestion) {
    secondaryActions = [];
  } else if (isCardQuestion && allActions.length > 0) {
    primaryActions = allActions.filter(
      (a) =>
        a.type === "Bad Behaviour" ||
        a.type === "Card" ||
        a.type === "Foul Committed" ||
        (a.outcome && (a.outcome.includes("Yellow") || a.outcome.includes("Card") || a.outcome.includes("Red"))) ||
        (a.player && a.player.toLowerCase().includes("dumfries"))
    );
    secondaryActions = allActions.filter((a) => !primaryActions.includes(a));
    if (primaryActions.length === 0) {
      primaryActions = allActions.slice(0, 2);
      secondaryActions = allActions.slice(2);
    }
  } else if (isGoalOrPenaltyQuestion && allActions.length > 0) {
    primaryActions = allActions.filter(
      (a) =>
        a.outcome === "Goal" ||
        a.type === "Shot" ||
        (a.detail && a.detail.includes("Penalty"))
    );
    secondaryActions = allActions.filter((a) => !primaryActions.includes(a));
    if (primaryActions.length === 0) {
      primaryActions = allActions.slice(0, 2);
      secondaryActions = allActions.slice(2);
    }
  } else {
    primaryActions = allActions.slice(0, 2);
    secondaryActions = allActions.slice(2);
  }

  const allRules = Array.isArray(context?.rules) ? context.rules : [];
  let primaryRule = null;
  let secondaryRules = [];

  if (allRules.length > 0) {
    if (isCardQuestion) {
      primaryRule =
        allRules.find((r) => r.id === "shootout_disciplinary") ||
        allRules.find((r) => r.id === "foul_and_misconduct") ||
        allRules[0];
    } else if (isGoalOrPenaltyQuestion) {
      primaryRule =
        allRules.find((r) => r.id === "penalty_kick") ||
        allRules.find((r) => r.id === "direct_free_kick") ||
        allRules[0];
    } else {
      primaryRule = allRules[0];
    }
    secondaryRules = allRules.filter((r) => r.id !== primaryRule.id);
  }

  const asksForRule = /\b(rule|offside|penalty|foul|card|added time|extra time|shootout)\b/i.test(cleanQ);
  if (isNoMatching && asksForRule && primaryRule) {
    leadExplanation = primaryRule.summary;
  }

  return {
    eventStatus: context?.eventStatus || "no_matching_event",
    matchClockDisplay,
    matchState: context?.matchState || null,
    latestOnBallAction: context?.latestOnBallAction || null,
    leadExplanation,
    primaryActions,
    secondaryActions,
    primaryRule,
    secondaryRules,
    confirmedFacts: Array.isArray(matched?.facts) ? matched.facts : [],
    uncertainty: matched?.uncertainty?.[0] || null,
    evidenceLimits: Array.isArray(context?.evidenceLimits) ? context.evidenceLimits : [],
    sources: Array.isArray(context?.sources) ? context.sources : [],
  };
}

function getScoreSummary(score) {
  if (!score || typeof score.Argentina !== "number" || typeof score.Netherlands !== "number") {
    return null;
  }
  if (score.Argentina === score.Netherlands) return `Argentina and the Netherlands are level ${score.Argentina}–${score.Netherlands}`;
  const leader = score.Argentina > score.Netherlands ? "Argentina" : "The Netherlands";
  const trailing = score.Argentina > score.Netherlands ? "the Netherlands" : "Argentina";
  return `${leader} lead ${trailing} ${Math.max(score.Argentina, score.Netherlands)}–${Math.min(score.Argentina, score.Netherlands)}`;
}
