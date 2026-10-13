/**
 * Formats deterministic retrieved match context into a fan-friendly answer presentation.
 *
 * Rules:
 * - Lead with one concise plain-English explanation.
 * - Prioritize only the evidence directly relevant to the question (e.g. cautions for card questions).
 * - Put full match feed logs and secondary rules behind "More match details".
 * - Clearly separate the match clock from the video clock.
 * - Use fan-friendly labels ("About this moment", "Match record").
 *
 * @param {object} params
 * @param {object} params.context - Output of buildContext()
 * @param {string} [params.question] - The submitted question
 * @param {string} [params.explanationLevel] - 'simple' | 'detailed'
 * @param {string} [params.matchMinute] - Calibrated clock at current playback
 * @returns {object} Formatted answer presentation object
 */
export function formatAnswerPresentation({
  context,
  question = "",
  explanationLevel = "simple",
  matchMinute = "",
} = {}) {
  const matched = context?.matchedEvent;
  const isNoMatching = context?.eventStatus === "no_matching_event";
  const cleanQ = (question || "").toLowerCase();

  // 1. Separate Match Clock and Video Clock
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

  // 2. Lead with one short, definitive explanation
  let leadExplanation = "";
  if (isNoMatching) {
    leadExplanation = "No verified match incident is recorded for this playback timestamp.";
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
    leadExplanation =
      explanationLevel === "detailed" ? matched.description : matched.quickNote;
  }

  // 3. Question-driven Action Relevance (Show only evidence that answers the question)
  const allActions = Array.isArray(context?.statsBombActions) ? context.statsBombActions : [];
  let primaryActions = [];
  let secondaryActions = [];

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

  if (isCardQuestion && allActions.length > 0) {
    // Show only the cautions / red cards / fouls first
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
    // Default: show top 2 actions as primary, remaining behind secondary
    primaryActions = allActions.slice(0, 2);
    secondaryActions = allActions.slice(2);
  }

  // 4. Question-driven Rule Relevance (Primary rule vs secondary rules)
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

  return {
    question,
    eventStatus: context?.eventStatus || "no_matching_event",
    matchClockDisplay,
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
