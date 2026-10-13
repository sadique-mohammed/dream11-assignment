import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCuratedEvents, getEventById } from "@/lib/events";
import { getMatchMinuteAtTime } from "@/lib/match-minute";
import { resolveStatsBombQueryTarget } from "@/lib/statsbomb-mapping";
import { getStatsBombSlice } from "@/lib/statsbomb-data";
import { buildContext } from "@/lib/context-retrieval";
import { formatAnswerPresentation } from "@/lib/format-answer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_MEDIA_DURATION_SECONDS = 9460;
const SELECTION_BOUNDARY_SECONDS = 30;

/**
 * POST /api/ask
 *
 * Recomputes match context and retrieved evidence on the server from the submitted
 * playback time and event ID. Never trusts browser-supplied context.
 *
 * Calls Gemini 3.8 Flash with the grounded evidence (or returns deterministic fallback
 * when credentials are not configured or on network timeout).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body; expected JSON object." },
        { status: 400 }
      );
    }

    const {
      question,
      playbackTimeSec = 0,
      selectedEventId = null,
      explanationLevel = "simple",
      conversationTurns = [],
    } = body;

    // 1. Validate inputs
    const trimmedQuestion = typeof question === "string" ? question.trim() : "";
    if (!trimmedQuestion) {
      return NextResponse.json(
        { error: "Question cannot be empty." },
        { status: 400 }
      );
    }
    if (trimmedQuestion.length > 500) {
      return NextResponse.json(
        { error: "Question exceeds maximum length of 500 characters." },
        { status: 400 }
      );
    }

    const timeSec =
      typeof playbackTimeSec === "number" && !isNaN(playbackTimeSec) && playbackTimeSec >= 0
        ? Math.min(KNOWN_MEDIA_DURATION_SECONDS, playbackTimeSec)
        : 0;

    const validatedLevel = explanationLevel === "detailed" ? "detailed" : "simple";

    // 2. Server-side event selection synchronization:
    // If selectedEventId is provided, verify it is still within 30s boundary of playback time
    let effectiveEventId = null;
    let selectedEvent = null;
    if (selectedEventId && typeof selectedEventId === "string") {
      const candidate = getEventById(selectedEventId.trim());
      if (candidate) {
        const timeDiff = Math.abs(timeSec - candidate.videoTimeSeconds);
        if (timeDiff <= SELECTION_BOUNDARY_SECONDS) {
          effectiveEventId = candidate.id;
          selectedEvent = candidate;
        }
      }
    }

    // 3. Server-side clock & phase resolution using calibrated markers
    const matchClock = getMatchMinuteAtTime(timeSec, false);

    // 4. Server-side StatsBomb query target & slice retrieval
    const queryTarget = resolveStatsBombQueryTarget({
      playbackTimeSec: timeSec,
      selectedEvent,
    });

    let statsBombSlice = null;
    if (queryTarget.shouldQuery && typeof queryTarget.minute === "number") {
      try {
        statsBombSlice = await getStatsBombSlice({
          targetMinute: queryTarget.minute,
          period: queryTarget.period,
          pastWindow: 5,
          forwardWindow: 1,
        });
      } catch (err) {
        console.error("Error fetching server StatsBomb slice:", err);
        statsBombSlice = null;
      }
    }

    // 5. Server-side deterministic context retrieval (Part 4)
    const context = buildContext({
      playbackTimeSec: timeSec,
      selectedEventId: effectiveEventId,
      question: trimmedQuestion,
      statsBombEvents: statsBombSlice,
    });

    // 6. Format presentation & prioritize question-answering evidence
    const presentation = formatAnswerPresentation({
      context,
      question: trimmedQuestion,
      explanationLevel: validatedLevel,
      matchMinute: matchClock,
    });

    // 7. Gemini AI call (Part 5)
    const apiKey = process.env.GEMINI_API_KEY;
    const candidateModels = process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : ["gemini-3.1-flash-lite", "gemini-2.5-flash"];
    let aiAnswer = presentation.leadExplanation;
    let aiStatus = apiKey ? "pending" : "simulated";
    let aiModelUsed = null;

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      const promptSystem = `You are Live Lens, a precise, fan-friendly live match companion explaining Argentina vs Netherlands (2022 World Cup Quarter-Final).
Explain the moment to a football fan based ONLY on the verified evidence below.
CRITICAL RULES:
- Lead directly with one short, clear explanation.
- Keep the answer short by default: 1–2 sentences for simple, up to 3–4 sentences for detailed.
- NEVER invent referee thoughts, unrecorded actions, or speculative rationale.
- If official records do not state why a decision was made (e.g. which exact action triggered a card), explicitly state that uncertainty.
- If there is no verified match incident at this timestamp, state that clearly while answering any general football rules if asked.
- Respond with a JSON object containing:
  {"answer": "Your plain-language explanation"}`;

      const promptUser = `Match Clock: ${presentation.matchClockDisplay}
Video Timestamp: ${timeSec.toFixed(1)}s
Incident Status: ${context.eventStatus}
${context.matchedEvent ? `Matched Incident: ${context.matchedEvent.title} (${context.matchedEvent.matchMinute})
Facts: ${context.matchedEvent.facts.join(" | ")}
Uncertainty: ${context.uncertainty.join(" | ") || "None recorded"}` : "No specific match milestone registered for this timestamp."}
Key Feed Actions: ${JSON.stringify(presentation.primaryActions.map(a => `${a.timeDisplay} ${a.type}: ${a.player || a.team} ${a.outcome ? `(${a.outcome})` : ""}`))}
Relevant Rules: ${presentation.primaryRule ? `${presentation.primaryRule.law}: ${presentation.primaryRule.summary}` : "None"}

Fan Question: "${trimmedQuestion}"
Detail Level: ${validatedLevel}

Provide the concise explanation in JSON.`;

      for (const modelId of candidateModels) {
        try {
          let timeoutId;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Gemini ${modelId} timed out after 5000ms`)), 5000);
          });

          const generatePromise = ai.models.generateContent({
            model: modelId,
            contents: `${promptSystem}\n\n${promptUser}`,
            config: {
              responseMimeType: "application/json",
              maxOutputTokens: 1000,
              thinkingConfig: { thinkingBudget: 0 },
            },
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);
          clearTimeout(timeoutId);

          const rawText = response?.text;
          if (rawText) {
            let parsedAnswer = null;
            try {
              const parsed = JSON.parse(rawText);
              if (parsed?.answer && typeof parsed.answer === "string") {
                parsedAnswer = parsed.answer.trim();
              }
            } catch {
              const match = rawText.match(/"answer"\s*:\s*"([^"]+)"/);
              if (match && match[1]) {
                parsedAnswer = match[1].trim();
              }
            }

            if (parsedAnswer) {
              aiAnswer = parsedAnswer;
              aiStatus = "ai_generated";
              aiModelUsed = modelId;
              break;
            }
          }
        } catch (modelError) {
          console.warn(`Gemini model ${modelId} failed:`, modelError?.message || modelError);
        }
      }

      if (aiStatus !== "ai_generated") {
        aiStatus = "fallback";
        aiAnswer = presentation.leadExplanation;
        aiModelUsed = candidateModels[0];
      }
    }

    return NextResponse.json({
      answer: aiAnswer,
      leadExplanation: presentation.leadExplanation,
      explanationLevel: validatedLevel,
      aiStatus,
      model: aiModelUsed,
      matchClockDisplay: presentation.matchClockDisplay,
      capturedTimestamp: timeSec,
      eventStatus: context.eventStatus,
      matchedEvent: context.matchedEvent,
      primaryActions: presentation.primaryActions,
      secondaryActions: presentation.secondaryActions,
      primaryRule: presentation.primaryRule,
      secondaryRules: presentation.secondaryRules,
      confirmedFacts: presentation.confirmedFacts,
      uncertainty: presentation.uncertainty,
      evidenceLimits: presentation.evidenceLimits,
      sources: presentation.sources,
      context, // Sent for development inspector
    });
  } catch (error) {
    console.error("Unhandled error in /api/ask:", error);
    return NextResponse.json(
      { error: "Failed to process question." },
      { status: 500 }
    );
  }
}
