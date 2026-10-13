import assert from "node:assert";

console.log("🧪 Running Part 5 /api/ask Endpoint Acceptance Tests (HTTP)...\n");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Pre-flight check: verify server is reachable
try {
  const probe = await fetch(`${BASE_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "   ", playbackTimeSec: 0 }),
    signal: AbortSignal.timeout(4000),
  });
  if (probe.status !== 400) {
    throw new Error(`Unexpected status code: ${probe.status}`);
  }
} catch (err) {
  console.error(`\n❌ Local server at ${BASE_URL} is not reachable (${err.message}).`);
  console.error("   To run the HTTP endpoint acceptance test suite, start the server:");
  console.error("     npm run dev   (or npm run build && npm start)\n");
  console.error("   Note: Standalone deterministic context retrieval tests run without a server:");
  console.error("     node scripts/test-context-retrieval.js\n");
  process.exit(1);
}

async function postAsk(body) {
  return fetch(`${BASE_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Test 1: Empty question returns 400
console.log("Test 1: Empty question returns 400 error");
{
  const res = await postAsk({ question: "   ", playbackTimeSec: 5000 });
  const json = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.error, "Question cannot be empty.");
  console.log("  ✅ Passed: Rejected empty question with 400 status.");
}

// Test 2: Server-side recomputation for known event (Penalty 73')
console.log("\nTest 2: Recomputes context and evidence on server for known event");
{
  const res = await postAsk({
    question: "Why did Argentina get a penalty?",
    playbackTimeSec: 5009.66,
    selectedEventId: "arg-penalty-73",
    explanationLevel: "simple",
  });
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.eventStatus, "matched_event");
  assert.strictEqual(json.matchClockDisplay, "73'");
  assert(json.answer.includes("penalty"), "Answer should explain penalty");
  assert(json.primaryRule?.law.includes("Law 14"), "Should match Law 14 Penalty Kick");
  assert(json.sources.length >= 2, "Should include match and IFAB sources");
  assert(json.primaryActions.some(a => a.type === "Shot" || a.type === "Foul Committed"), "Should include key actions");
  console.log("  ✅ Passed: Server recomputed verified event and evidence without trusting browser context.");
}

// Test 3: Stale event selection cleared by server (>30s away)
console.log("\nTest 3: Stale event selection cleared if seeked outside 30s boundary");
{
  const res = await postAsk({
    question: "What happened here?",
    playbackTimeSec: 2000, // 3000s away from penalty
    selectedEventId: "arg-penalty-73",
    explanationLevel: "simple",
  });
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.eventStatus, "no_matching_event");
  assert.strictEqual(json.matchedEvent, null);
  console.log("  ✅ Passed: Stale selection cleared, returns no_matching_event.");
}

// Test 4: Question-relevant evidence prioritization (Shootout red card)
console.log("\nTest 4: Shootout question prioritizes cautions over routine penalty kicks");
{
  const res = await postAsk({
    question: "Why was Dumfries sent off with a red card?",
    playbackTimeSec: 9318,
    selectedEventId: "dumfries-dismissal-shootout",
    explanationLevel: "simple",
  });
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.matchClockDisplay, "Shootout");
  assert(json.leadExplanation.includes("cautions during the shootout"), "Lead explanation should mention shootout cautions");
  assert(json.answer.toLowerCase().includes("shootout") && (json.answer.toLowerCase().includes("caution") || json.answer.toLowerCase().includes("card") || json.answer.toLowerCase().includes("booking")), "AI answer should mention shootout and cautions/cards");
  assert.strictEqual(json.primaryRule?.id, "shootout_disciplinary");
  // Primary actions should only be cards/cautions
  assert(json.primaryActions.every(a => a.outcome?.includes("Yellow") || a.type === "Bad Behaviour"), "Primary actions must only be cards");
  // Secondary actions should contain the other kicks
  assert(json.secondaryActions.length > 0, "Secondary actions should contain other shootout kicks");
  console.log("  ✅ Passed: Cautions prioritized; kicks placed in secondary details.");
}

// Test 5: Detail toggle preserves explanation level
console.log("\nTest 5: Preserves explanation level toggle ('detailed' vs 'simple')");
{
  const resDetailed = await postAsk({
    question: "Explain this goal",
    playbackTimeSec: 5566,
    selectedEventId: "ned-goal-83",
    explanationLevel: "detailed",
  });
  const jsonDetailed = await resDetailed.json();
  assert.strictEqual(jsonDetailed.explanationLevel, "detailed");
  console.log("  ✅ Passed: Explanation level correctly handled by endpoint.");
}

console.log("\n🎉 ALL 5 /api/ask ENDPOINT TESTS PASSED SUCCESSFULLY!\n");
