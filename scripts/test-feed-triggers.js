import assert from "node:assert";
import { getFeedTriggers, findCrossedTrigger, getFeedTriggerById } from "../src/lib/feed-triggers.js";

console.log("🧪 Running Feed-Triggered Companion Acceptance Tests...\n");

const triggers = getFeedTriggers();

// Test 1: Significant actions are present and mapped
console.log("Test 1: Feed triggers contain goals, cards, penalties, and breaks");
{
  assert(triggers.length >= 25, `Expected at least 25 triggers, got ${triggers.length}`);

  const goals = triggers.filter((t) => t.type === "goal");
  const cards = triggers.filter((t) => t.type === "yellow_card" || t.type === "red_card");
  const penalties = triggers.filter((t) => t.type === "penalty");
  const breaks = triggers.filter((t) => t.type === "break");

  assert(goals.length >= 5, `Expected multiple goals, got ${goals.length}`);
  assert(cards.length >= 10, `Expected cards recorded, got ${cards.length}`);
  assert(penalties.length >= 1, "Expected penalty trigger");
  assert(breaks.length >= 3, "Expected HT, ET, and Penalties breaks");

  // Verify timestamps are in chronological order
  for (let i = 1; i < triggers.length; i++) {
    assert(
      triggers[i].videoTimeSeconds >= triggers[i - 1].videoTimeSeconds,
      `Triggers must be chronologically ordered at index ${i}`
    );
  }
  console.log(`  ✅ Passed: ${triggers.length} triggers verified in chronological order.`);
}

// Test 2: Natural forward playback detects crossed trigger
console.log("\nTest 2: Natural playback detects crossed action");
{
  // Pick a known trigger (e.g., Acuña yellow card at ~2695.7s)
  const acunaCard = triggers.find((t) => t.title.includes("Acuña"));
  assert(acunaCard, "Found Acuña card trigger");

  const prev = acunaCard.videoTimeSeconds - 1.0;
  const curr = acunaCard.videoTimeSeconds + 0.5;
  const seen = new Set();

  const detected = findCrossedTrigger(prev, curr, seen);
  assert.strictEqual(detected?.id, acunaCard.id);
  console.log(`  ✅ Passed: Natural forward playback correctly detected ${detected.title}.`);
}

// Test 3: Replay / rewind does not trigger duplicates
console.log("\nTest 3: Replay prevents duplicate popups");
{
  const acunaCard = triggers.find((t) => t.title.includes("Acuña"));
  const prev = acunaCard.videoTimeSeconds - 1.0;
  const curr = acunaCard.videoTimeSeconds + 0.5;
  const seen = new Set([acunaCard.id]); // Already seen

  const detected = findCrossedTrigger(prev, curr, seen);
  assert.strictEqual(detected, null, "Should NOT detect already-seen trigger on replay");
  console.log("  ✅ Passed: Previously seen trigger ignored on replay.");
}

// Test 4: Scrubbing / backward jump does not trigger
console.log("\nTest 4: Backward movement or jumping returns no trigger");
{
  const acunaCard = triggers.find((t) => t.title.includes("Acuña"));
  // Playing backwards (rewind)
  const prev = acunaCard.videoTimeSeconds + 5.0;
  const curr = acunaCard.videoTimeSeconds - 1.0;
  const seen = new Set();

  const detected = findCrossedTrigger(prev, curr, seen);
  assert.strictEqual(detected, null, "Backward movement must return null");
  console.log("  ✅ Passed: Backward scrubbing correctly ignored.");
}

// Test 5: Feed-derived actions carry mapping caveat
console.log("\nTest 5: Mapping caveat badge attached to feed items");
{
  const feedOnly = triggers.filter((t) => !t.isCurated);
  assert(feedOnly.length > 0, "Expected feed-derived triggers");

  for (const item of feedOnly) {
    assert(
      item.mappingNote.includes("Mapped from StatsBomb feed"),
      `Feed item ${item.id} must include mapping caveat`
    );
  }
  console.log(`  ✅ Passed: All ${feedOnly.length} feed triggers include the mapping caveat.`);
}

console.log("\n🎉 ALL FEED-TRIGGER TESTS PASSED SUCCESSFULLY!\n");
