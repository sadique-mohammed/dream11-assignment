import assert from "node:assert";
import { buildContext } from "../src/lib/context-retrieval.js";
import { resolveStatsBombQueryTarget, filterHighSignalStatsBombActions } from "../src/lib/statsbomb-mapping.js";
import { getEventById } from "../src/lib/events.js";

console.log("🧪 Running Part 4 Context Retrieval Acceptance Tests...\n");

// --- Test 1: Known event ID retrieval ---
console.log("Test 1: Known event ID retrieves correct event, rule, and sources");
{
  const event = getEventById("arg-penalty-73");
  assert(event, "arg-penalty-73 event should exist");

  const queryTarget = resolveStatsBombQueryTarget({ playbackTimeSec: 5009.66, selectedEvent: event });
  assert.strictEqual(queryTarget.shouldQuery, true, "Should query StatsBomb for verified event");
  assert.strictEqual(queryTarget.period, 2, "Period should be 2");
  assert.strictEqual(queryTarget.minute, 73, "Minute should be 73");

  // Sample mock StatsBomb events for penalty
  const mockFeed = [
    { id: "sb-1", period: 2, minute: 70, second: 40, type: "Foul Committed", player: "Denzel Dumfries", detail: "Penalty conceded" },
    { id: "sb-2", period: 2, minute: 72, second: 39, type: "Shot", player: "Lionel Messi", outcome: "Goal" },
    { id: "sb-3", period: 2, minute: 71, second: 10, type: "Pass", player: "Rodrigo De Paul" }, // routine pass
  ];

  const context = buildContext({
    playbackTimeSec: 5009.66,
    selectedEventId: "arg-penalty-73",
    question: "Why was a penalty awarded?",
    statsBombEvents: mockFeed,
  });

  assert.strictEqual(context.eventStatus, "matched_event");
  assert.strictEqual(context.matchedEvent?.id, "arg-penalty-73");
  assert.strictEqual(context.matchState?.scoreBefore, "1-0");
  assert.strictEqual(context.matchState?.scoreAfter, "2-0");
  assert(context.rules.some((r) => r.id === "penalty_kick"), "Should include penalty_kick rule");
  assert.strictEqual(context.statsBombActions.length, 2, "Should filter out routine Pass and keep Foul & Shot");
  assert(context.sources.length >= 2, "Should include match sources and rule sources");
  console.log("  ✅ Passed: Correct event, rule, score, and filtered StatsBomb actions returned.");
}

// --- Test 2: Unannotated timestamp returns no matching event ---
console.log("\nTest 2: Unannotated timestamp returns no matching event");
{
  const unannotatedSec = 2000; // Well away from any curated event
  const context = buildContext({
    playbackTimeSec: unannotatedSec,
    selectedEventId: null,
    question: "What happened here?",
    statsBombEvents: [],
  });

  assert.strictEqual(context.eventStatus, "no_matching_event");
  assert.strictEqual(context.matchedEvent, null);
  assert.strictEqual(context.matchState, null);
  assert(context.evidenceLimits.some((l) => l.includes("No verified match incident recorded")), "Should include missing incident limit");
  console.log("  ✅ Passed: Unannotated time correctly returns no_matching_event without false matches.");
}

// --- Test 3: General rule questions work independently of incident matching ---
console.log("\nTest 3: General rule question works independently of incident matching");
{
  const context = buildContext({
    playbackTimeSec: 2000,
    selectedEventId: null,
    question: "Can you explain how offside works in football?",
    statsBombEvents: null,
  });

  assert.strictEqual(context.eventStatus, "no_matching_event");
  assert.strictEqual(context.matchedEvent, null);
  assert(context.rules.some((r) => r.id === "offside"), "Should match offside rule from question keywords");
  assert(context.sources.some((s) => s.label.includes("Law 11")), "Should include Law 11 source");
  console.log("  ✅ Passed: Offside rule retrieved independently of any match event.");
}

// --- Test 4: Invalid explicit event ID does NOT fall back to timestamp match ---
console.log("\nTest 4: Invalid explicit event ID returns no_matching_event");
{
  // Timestamp is exactly at Messi's penalty, but invalid event ID is given
  const context = buildContext({
    playbackTimeSec: 5009.66,
    selectedEventId: "completely-invalid-id-xyz",
    question: "Why penalty?",
    statsBombEvents: null,
  });

  assert.strictEqual(context.eventStatus, "no_matching_event");
  assert.strictEqual(context.matchedEvent, null);
  assert.notStrictEqual(context.matchedEvent?.id, "arg-penalty-73", "Must NOT silently fall back to timestamp match");
  console.log("  ✅ Passed: Invalid explicit event ID strictly returns no_matching_event.");
}

// --- Test 5: Timestamp matching within +/- 25s window ---
console.log("\nTest 5: Timestamp matching works within verified range (+/- 25s)");
{
  // 5009.66 - 15 = 4994.66 -> within window
  const inWindow = buildContext({
    playbackTimeSec: 5009.66 - 15,
    selectedEventId: null,
    question: "What is this?",
    statsBombEvents: null,
  });
  assert.strictEqual(inWindow.eventStatus, "matched_event");
  assert.strictEqual(inWindow.matchedEvent?.id, "arg-penalty-73");

  // 5009.66 - 35 = 4974.66 -> outside window
  const outWindow = buildContext({
    playbackTimeSec: 5009.66 - 35,
    selectedEventId: null,
    question: "What is this?",
    statsBombEvents: null,
  });
  assert.strictEqual(outWindow.eventStatus, "no_matching_event");
  assert.strictEqual(outWindow.matchedEvent, null);
  console.log("  ✅ Passed: Boundary window correctly matches within +/-25s and rejects outside.");
}

// --- Test 6: Non-playing phases skip StatsBomb queries with reasons ---
console.log("\nTest 6: Pre-match, half-time, and breaks skip StatsBomb queries");
{
  // Pre-match (e.g. 50s, kickoff marker is ~154s)
  const preMatch = resolveStatsBombQueryTarget({ playbackTimeSec: 50, selectedEvent: null });
  assert.strictEqual(preMatch.shouldQuery, false);
  assert(preMatch.reason.includes("Pre-match"));

  // Half time (around marker 3217s: "HT")
  const halfTime = resolveStatsBombQueryTarget({ playbackTimeSec: 3250, selectedEvent: null });
  assert.strictEqual(halfTime.shouldQuery, false);
  assert(halfTime.reason.includes("Half-time"));

  // Stoppage time 90+11 (around 6690s)
  const stoppage = resolveStatsBombQueryTarget({ playbackTimeSec: 6695, selectedEvent: null });
  assert.strictEqual(stoppage.shouldQuery, true);
  assert.strictEqual(stoppage.period, 2);
  assert.strictEqual(stoppage.minute, 101); // 90 + 11 = 101

  // Shootout verified event mapping
  const shootoutEvent = getEventById("dumfries-dismissal-shootout");
  const shootoutTarget = resolveStatsBombQueryTarget({ playbackTimeSec: 9318, selectedEvent: shootoutEvent });
  assert.strictEqual(shootoutTarget.shouldQuery, true);
  assert.strictEqual(shootoutTarget.period, 5);
  assert.strictEqual(shootoutTarget.minute, 127);
  console.log("  ✅ Passed: Non-playing phases safely skipped, stoppage accurately mapped, shootout verified.");
}

// --- Test 7: Shootout disciplinary rule handling ---
console.log("\nTest 7: Shootout cautions and card question matches shootout_disciplinary rule");
{
  const context = buildContext({
    playbackTimeSec: 9318,
    selectedEventId: "dumfries-dismissal-shootout",
    question: "Why was Dumfries shown a red card after the shootout?",
    statsBombEvents: null,
  });

  assert(context.rules.some((r) => r.id === "shootout_disciplinary"), "Should match shootout_disciplinary rule");
  assert(context.rules.some((r) => r.summary.includes("do not carry forward")), "Should clarify cautions do not carry forward");
  console.log("  ✅ Passed: Shootout disciplinary rules correctly retrieved.");
}

// --- Test 8: Live match guard - no forward data beyond +1 minute ---
console.log("\nTest 8: Live match guard strictly discards feed actions beyond +1 minute");
{
  const mockFeedWithFuture = [
    { id: "sb-past", period: 2, minute: 71, second: 0, type: "Foul Committed", player: "Acuña" },
    { id: "sb-current", period: 2, minute: 73, second: 0, type: "Shot", player: "Messi", outcome: "Goal" },
    { id: "sb-plus1", period: 2, minute: 74, second: 0, type: "Substitution", player: "Sub Player" },
    { id: "sb-future", period: 2, minute: 77, second: 0, type: "Shot", player: "Future Player" }, // 4 min in future
  ];

  const context = buildContext({
    playbackTimeSec: 5009.66,
    selectedEventId: "arg-penalty-73", // statsBombPosition is minute 73
    question: "Why penalty?",
    statsBombEvents: mockFeedWithFuture,
  });

  const actionIds = context.statsBombActions.map((a) => a.id);
  assert(actionIds.includes("sb-past"), "Should include past action");
  assert(actionIds.includes("sb-current"), "Should include current action");
  assert(actionIds.includes("sb-plus1"), "Should include action up to +1 min forward");
  assert(!actionIds.includes("sb-future"), "Must NOT include action beyond +1 min forward (future spoiler)");
  console.log("  ✅ Passed: Live match guard strictly excludes feed events beyond +1 minute forward.");
}

// --- Test 9: Fan presentation leads with short explanation and separates clocks ---
console.log("\nTest 9: Fan presentation leads with short explanation and separates clocks");
{
  const { formatAnswerPresentation } = await import("../src/lib/format-answer.js");

  const context = buildContext({
    playbackTimeSec: 9318.0,
    selectedEventId: "dumfries-dismissal-shootout",
    question: "Why was Dumfries sent off with a red card?",
    statsBombEvents: null,
  });

  const formatted = formatAnswerPresentation({
    context,
    question: "Why was Dumfries sent off with a red card?",
    matchMinute: "Shootout / FT",
  });

  assert.strictEqual(
    formatted.leadExplanation,
    "He received two cautions during the shootout and was sent off. The match report doesn’t say exactly what triggered the second caution.",
    "Should lead with short explanation headline"
  );
  assert.strictEqual(formatted.matchClockDisplay, "Shootout", "Should display clean separated match clock");
  console.log("  ✅ Passed: Lead explanation headline and separated clocks verified.");
}

// --- Test 10: Evidence relevance prioritization (cards vs match details) ---
console.log("\nTest 10: Evidence relevance prioritizes question-answering items");
{
  const { formatAnswerPresentation } = await import("../src/lib/format-answer.js");

  const mockShootoutFeed = [
    { id: "pk-1", period: 5, minute: 120, type: "Shot", player: "Virgil van Dijk" },
    { id: "pk-2", period: 5, minute: 121, type: "Shot", player: "Lionel Messi" },
    { id: "card-1", period: 5, minute: 127, type: "Bad Behaviour", outcome: "Yellow Card", player: "Denzel Dumfries" },
    { id: "card-2", period: 5, minute: 127, type: "Bad Behaviour", outcome: "Second Yellow", player: "Denzel Dumfries" },
    { id: "card-3", period: 5, minute: 127, type: "Bad Behaviour", outcome: "Yellow Card", player: "Noa Lang" },
  ];

  const context = buildContext({
    playbackTimeSec: 9318.0,
    selectedEventId: "dumfries-dismissal-shootout",
    question: "Why was Dumfries sent off with a red card?",
    statsBombEvents: mockShootoutFeed,
  });

  const formatted = formatAnswerPresentation({
    context,
    question: "Why was Dumfries sent off with a red card?",
  });

  // Primary actions should only be the relevant cards/cautions
  const primaryIds = formatted.primaryActions.map((a) => a.id);
  assert(primaryIds.includes("card-1"), "Primary actions must include Dumfries yellow card");
  assert(primaryIds.includes("card-2"), "Primary actions must include Dumfries second yellow");
  assert(!primaryIds.includes("pk-1"), "Routine penalty kicks should NOT be in primary actions");

  // Secondary actions should contain the other feed events
  const secondaryIds = formatted.secondaryActions.map((a) => a.id);
  assert(secondaryIds.includes("pk-1"), "Penalty kick should be in secondary actions for 'More match details'");

  // Primary rule should be shootout_disciplinary
  assert.strictEqual(formatted.primaryRule?.id, "shootout_disciplinary");
  assert(formatted.secondaryRules.some((r) => r.id === "extra_time_and_shootout"));
  console.log("  ✅ Passed: Relevant evidence prioritized with full logs under secondary details.");
}

console.log("\n🎉 ALL 10 ACCEPTANCE CRITERIA TESTS PASSED SUCCESSFULLY!\n");
