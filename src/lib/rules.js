import rulesData from "../../data/rules.json" with { type: "json" };

export function getCuratedRules() {
  return Array.isArray(rulesData?.rules) ? rulesData.rules : [];
}

export function getRuleById(id) {
  if (!id) return null;
  const rules = getCuratedRules();
  return rules.find((r) => r.id === id) || null;
}

const TAG_TO_RULE_MAP = {
  penalty_kick: "penalty_kick",
  penalty: "penalty_kick",
  foul: "foul_and_misconduct",
  foul_and_misconduct: "foul_and_misconduct",
  yellow_card: "foul_and_misconduct",
  red_card: "foul_and_misconduct",
  second_yellow: "shootout_disciplinary",
  shootout_disciplinary: "shootout_disciplinary",
  unsporting_behaviour: "unsporting_behaviour",
  free_kick: "direct_free_kick",
  direct_free_kick: "direct_free_kick",
  added_time: "added_time",
  stoppage_time: "added_time",
  offside: "offside",
  extra_time: "extra_time_and_shootout",
  penalty_shootout: "extra_time_and_shootout",
  knockout_rules: "extra_time_and_shootout",
  extra_time_and_shootout: "extra_time_and_shootout",
};

const QUESTION_TERM_MAP = [
  {
    ruleId: "offside",
    patterns: [/\boffside\b/i, /\boff-side\b/i],
  },
  {
    ruleId: "penalty_kick",
    patterns: [/\bpenalt(y|ies)\b/i, /\bspot kick\b/i, /\bpenalty kick\b/i],
  },
  {
    ruleId: "direct_free_kick",
    patterns: [/\bfree kick\b/i, /\bfree-kick\b/i, /\bwall\b/i],
  },
  {
    ruleId: "added_time",
    patterns: [
      /\badded time\b/i,
      /\bstoppage time\b/i,
      /\binjury time\b/i,
      /\bextra (time )?added\b/i,
      /\bwhy (\d+|ten|so much) (more )?min/i,
    ],
  },
  {
    ruleId: "shootout_disciplinary",
    patterns: [
      /\b(card|cautions?|yellow|red) (in|during|carry into) (the )?(shootout|penalties)\b/i,
      /\bdumfries (card|red|yellow|sent off|dismiss)\b/i,
      /\bsecond yellow\b/i,
      /\btwo yellows\b/i,
    ],
  },
  {
    ruleId: "extra_time_and_shootout",
    patterns: [
      /\bextra time\b/i,
      /\bshootout\b/i,
      /\bpenalties\b/i,
      /\bwhy extra time\b/i,
      /\bwhy shootout\b/i,
      /\bknockout\b/i,
    ],
  },
  {
    ruleId: "unsporting_behaviour",
    patterns: [
      /\bunsporting\b/i,
      /\bdugout\b/i,
      /\bbench\b/i,
      /\baltercation\b/i,
      /\bconfrontation\b/i,
      /\bprovoc/i,
    ],
  },
  {
    ruleId: "foul_and_misconduct",
    patterns: [
      /\bfoul\b/i,
      /\byellow card\b/i,
      /\bred card\b/i,
      /\bcard\b/i,
      /\bcaution\b/i,
      /\bbooking\b/i,
      /\bbooked\b/i,
      /\bdismiss/i,
      /\bsent off\b/i,
    ],
  },
];

export function retrieveMatchingRules({ ruleTags = [], question = "" } = {}) {
  const matchedRuleIds = new Set();

  if (Array.isArray(ruleTags)) {
    for (const tag of ruleTags) {
      const normalizedId = TAG_TO_RULE_MAP[tag] || tag;
      if (getRuleById(normalizedId)) {
        matchedRuleIds.add(normalizedId);
      }
    }
  }

  if (typeof question === "string" && question.trim().length > 0) {
    const q = question.trim();
    for (const mapping of QUESTION_TERM_MAP) {
      if (mapping.patterns.some((pattern) => pattern.test(q))) {
        matchedRuleIds.add(mapping.ruleId);
      }
    }
  }

  const allRules = getCuratedRules();
  return allRules.filter((r) => matchedRuleIds.has(r.id));
}
