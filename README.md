# Live Lens

An AI companion for understanding football moments. Watch the Argentina vs Netherlands 2022 World Cup quarter-final, ask questions about what's happening, and get evidence-grounded explanations.

## Overview & Architecture

Live Lens pairs match video with official match records and the IFAB Laws of the Game. When a fan asks a question:
1. **Server-Side Context Retrieval:** The server route (`POST /api/ask`) recomputes all context from the submitted playback time and event ID. It does not trust browser-supplied context.
2. **Match Clock Mapping:** Maps video seconds to official match minutes and phases using 145 verified clock markers (`match-minute-markers.json`).
3. **Feed Evidence Slicing:** Extracts a live-safe window from the official StatsBomb event feed (`StatsBomb.json`), including retrospective history and capping forward visibility to +1 minute.
4. **Disciplinary & Rule Resolution:** Deterministically matches relevant IFAB rules (`rules.json`), prioritizing high-signal evidence (such as cautions during shootouts over standard kicks).
5. **AI Explanation & Deterministic Fallback:** Calls Google Gemini with a zero-thinking budget for sub-2-second answers. If an API key is not configured or network fails, the system seamlessly falls back to the verified deterministic match record.
6. **Curated Event Replay:** Six curated moments with source-backed facts, uncertainty notes, and measured `replayStartSeconds` and `replayEndSeconds`. Selecting an event seeks to its replay start; clicking "Replay moment" plays through the annotated passage.

## Prerequisites

- **Node.js** 20+ and npm
- **FFmpeg** (with FFprobe) — install via `brew install ffmpeg` on macOS

## Setup

### 1. Clone and install

```bash
cd project
npm install
```

### 2. Configure AI API Key (Optional for Live Gemini)

Create a `.env.local` file in `project/`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: override default model (default is gemini-3.1-flash-lite)
# GEMINI_MODEL=gemini-3.1-flash-lite
```

*Note: If no API key is provided, the application operates in deterministic fallback mode with verified facts and rules.*

### 3. Place source media

The match broadcast files are not committed. Place them in the `data/` directory at the repository root:

```
data/
  MatchVideo.mp4   — supplied match video (AV1 codec, ~2.3 GB)
  MatchAudio.mp3   — supplied commentary audio (~149 MB)
```

### 4. Create the combined playback file

Run this one-time command from the `project/` directory to mux video and audio into a single browser-playable MP4:

```bash
mkdir -p public/media
ffmpeg -i ../data/MatchVideo.mp4 -i ../data/MatchAudio.mp3 \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -movflags +faststart public/media/live-match.mp4
```

This copies the AV1 video stream as-is and encodes the MP3 audio to AAC. The `-movflags +faststart` flag moves metadata to the front of the file, enabling progressive playback (seeking without downloading the entire file).

> **Note:** If your browser does not support AV1 playback, replace `-c:v copy` with `-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p` to re-encode to H.264.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Hosting online (Vercel Deployment)

Because GitHub has a 100 MB file limit and Vercel has serverless/asset bundle limits, the 2.7 GB `live-match.mp4` is excluded from Git via `.gitignore`.

To enable video playback when hosted on Vercel:
1. Upload your generated `live-match.mp4` to any cloud object storage / CDN with public HTTP Range support:
   - **Cloudflare R2** (recommended, zero egress fees, 10 GB free storage)
   - **AWS S3 + CloudFront**
   - **Google Cloud Storage**
2. In your Vercel Project Settings under **Environment Variables**, set:
   ```bash
   NEXT_PUBLIC_VIDEO_SRC=https://your-cdn-domain.com/live-match.mp4
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. If `NEXT_PUBLIC_VIDEO_SRC` is not set, the player defaults to `/media/live-match.mp4` for local development. If the file is missing in production, the player displays a clear guidance screen.

## Running Tests & Validation

The project includes automated validation and unit test suites:

```bash
# 1. Validate the 6 curated events dataset and replay ranges
npm run validate:events

# 2. Run the 10 deterministic context retrieval acceptance tests
node scripts/test-context-retrieval.js

# 3. Run the /api/ask HTTP endpoint acceptance test suite
node scripts/test-api-ask.js

# 4. Run ESLint code checks
npm run lint

# 5. Verify production build
npm run build
```

## Mapping match minutes to video time (development only)

While running `npm run dev`, open **Developer: mark event** above the player. At each match-clock point you want to map:

1. Enter only the match-clock label, such as `12`, `45+2`, `HT`, `ET`, or `Penalties`.
2. Seek the player to the corresponding point in the broadcast and click **Save current time**.
3. The app immediately saves the label and exact `video.currentTime` to `project/data/match-minute-markers.json`. Marks remain after refresh and can be removed from the list.

## What's ignored by Git

| Path | Reason |
|---|---|
| `../data/MatchVideo.mp4` | Large copyrighted broadcast |
| `../data/MatchAudio.mp3` | Large copyrighted broadcast |
| `public/media/live-match.mp4` | Generated combined asset |
| `.env*` | Environment variables and secrets |

## Tech stack

- **Next.js 16** with App Router (JavaScript)
- **Google Gen AI SDK** (`@google/genai`)
- **Tailwind CSS v4**
- **FFmpeg** for media muxing
