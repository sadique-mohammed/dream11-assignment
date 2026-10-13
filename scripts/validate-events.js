import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eventsPath = path.join(__dirname, "..", "data", "events.json");
const KNOWN_MEDIA_DURATION_SECONDS = 9460;

function validateEvents() {
  console.log("🔍 Validating curated events dataset:", eventsPath);

  if (!fs.existsSync(eventsPath)) {
    console.error("❌ Error: events.json not found at", eventsPath);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
  } catch (err) {
    console.error("❌ Error: events.json is not valid JSON:", err.message);
    process.exit(1);
  }

  const events = data?.events;
  if (!Array.isArray(events) || events.length === 0) {
    console.error("❌ Error: data.events must be a non-empty array.");
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  let previousTime = -1;

  events.forEach((ev, idx) => {
    const prefix = `[Event #${idx + 1} (${ev.id || "unnamed"})]`;

    // 1. Required core fields
    const required = ["id", "title", "matchMinute", "videoTimeSeconds", "period", "type", "description", "facts", "sources"];
    for (const field of required) {
      if (ev[field] === undefined || ev[field] === null || ev[field] === "") {
        errors.push(`${prefix} Missing required field: "${field}"`);
      }
    }

    // 2. Unique ID
    if (ev.id) {
      if (seenIds.has(ev.id)) {
        errors.push(`${prefix} Duplicate event ID: "${ev.id}"`);
      }
      seenIds.add(ev.id);
    }

    // 3. Numeric & non-negative timestamps
    if (typeof ev.videoTimeSeconds !== "number" || isNaN(ev.videoTimeSeconds) || ev.videoTimeSeconds < 0) {
      errors.push(`${prefix} videoTimeSeconds must be a non-negative number, got: ${ev.videoTimeSeconds}`);
    } else {
      // 4. Bounded by media duration
      if (ev.videoTimeSeconds > KNOWN_MEDIA_DURATION_SECONDS) {
        errors.push(`${prefix} videoTimeSeconds (${ev.videoTimeSeconds}s) exceeds media duration (${KNOWN_MEDIA_DURATION_SECONDS}s)`);
      }

      // 5. Chronological ordering
      if (ev.videoTimeSeconds < previousTime) {
        errors.push(`${prefix} Events must be in ascending chronological order. Current: ${ev.videoTimeSeconds}s < Previous: ${previousTime}s`);
      }
      previousTime = ev.videoTimeSeconds;
    }

    // 6. Replay boundaries (required for curated events)
    if (typeof ev.replayStartSeconds !== "number" || typeof ev.replayEndSeconds !== "number") {
      errors.push(`${prefix} Curated events must specify both numeric "replayStartSeconds" and "replayEndSeconds"`);
    } else if (ev.replayStartSeconds > ev.videoTimeSeconds || ev.videoTimeSeconds > ev.replayEndSeconds) {
      errors.push(`${prefix} Replay range violation: must satisfy replayStartSeconds (${ev.replayStartSeconds}) <= videoTimeSeconds (${ev.videoTimeSeconds}) <= replayEndSeconds (${ev.replayEndSeconds})`);
    }

    // 7. Facts array check
    if (!Array.isArray(ev.facts) || ev.facts.length === 0) {
      errors.push(`${prefix} "facts" must be a non-empty array of confirmed facts`);
    }

    // 8. Sources check
    if (!Array.isArray(ev.sources) || ev.sources.length === 0) {
      errors.push(`${prefix} "sources" must be a non-empty array`);
    } else {
      ev.sources.forEach((src, sIdx) => {
        if (!src.label || typeof src.label !== "string" || !src.label.trim()) {
          errors.push(`${prefix} Source #${sIdx + 1} is missing a non-empty "label"`);
        }
        if (!src.url || typeof src.url !== "string" || !src.url.startsWith("http")) {
          errors.push(`${prefix} Source #${sIdx + 1} is missing a valid HTTP URL`);
        }
      });
    }
  });

  if (warnings.length > 0) {
    console.warn("\n⚠️ Warnings:");
    warnings.forEach((w) => console.warn("  - " + w));
  }

  if (errors.length > 0) {
    console.error("\n❌ Validation failed with errors:");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  console.log(`\n✅ Success: All ${events.length} curated events are valid according to Part 3 acceptance criteria!`);
}

validateEvents();
