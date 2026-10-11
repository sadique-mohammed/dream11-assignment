# Live Lens

An AI companion for understanding football moments. Watch the Argentina vs Netherlands 2022 World Cup quarter-final, ask questions about what's happening, and get evidence-grounded explanations.

## Prerequisites

- **Node.js** 20+ and npm
- **FFmpeg** (with FFprobe) — install via `brew install ffmpeg` on macOS

## Setup

### 1. Clone and install

```bash
cd project
npm install
```

### 2. Place source media

The match broadcast files are not committed. Place them in the `data/` directory at the repository root:

```
data/
  MatchVideo.mp4   — supplied match video (AV1 codec, ~2.3 GB)
  MatchAudio.mp3   — supplied commentary audio (~149 MB)
```

### 3. Create the combined playback file

Run this one-time command from the `project/` directory to mux video and audio into a single browser-playable MP4:

```bash
mkdir -p public/media
ffmpeg -i ../data/MatchVideo.mp4 -i ../data/MatchAudio.mp3 \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -movflags +faststart public/media/live-match.mp4
```

This copies the AV1 video stream as-is and encodes the MP3 audio to AAC. The `-movflags +faststart` flag moves metadata to the front of the file, enabling progressive playback (seeking without downloading the entire file).

> **Note:** If your browser does not support AV1 playback, replace `-c:v copy` with `-c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p` to re-encode to H.264. This will take significantly longer.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What's ignored by Git

| Path | Reason |
|---|---|
| `../data/MatchVideo.mp4` | Large copyrighted broadcast |
| `../data/MatchAudio.mp3` | Large copyrighted broadcast |
| `public/media/live-match.mp4` | Generated combined asset |
| `.env*` | Environment variables and secrets |

## Tech stack

- **Next.js 16** with App Router (JavaScript)
- **Tailwind CSS v4**
- **FFmpeg** for one-time media muxing
