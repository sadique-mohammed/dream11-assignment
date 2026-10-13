# Live Lens

Live Lens is a football companion for new viewers. It explains selected moments from the Argentina–Netherlands 2022 World Cup quarter-final using match records and football rules. It does not analyze the video or audio, or explain every moment in the match.

## Run locally

Requirements: Node.js 20+ and FFmpeg.

Install dependencies:

```bash
npm install
```

Place the supplied files in the repository’s top-level `data/` folder, then create the local player file:

```bash
mkdir -p public/media
ffmpeg -i ../data/MatchVideo.mp4 -i ../data/MatchAudio.mp3 \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -movflags +faststart public/media/live-match.mp4
```

To enable Gemini answers, add this to `.env.local`:

```bash
GEMINI_API_KEY=your_api_key
```

Without a key, Live Lens answers from the saved match records and rules.

Start the app:

```bash
npm run dev
```

The large source and generated video files, and `.env.local`, are excluded from Git.

## Match data

- `data/events.json`: six sourced moments with replay ranges.
- `data/rules.json`: plain-language football rules and sources.
- `data/match-minute-markers.json`: maps the broadcast time to the match clock.
- `data/StatsBomb.json`: recorded actions used for match context.
- `data/significant-triggers.json`: moments that can open an automatic note.

After changing event or marker data, regenerate automatic notes with `node scripts/generate-triggers.js`.
