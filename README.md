# AI companion for live sports

## The fan problem

Suppose you want to watch an Olympic match and support your country. It could be fencing, wrestling or gymnastics, or a sport you have recently become interested in, like F1, boxing or golf.

As a new fan, you want to enjoy the match, understand what is happening and support your favourite athlete or team. But you may not know the rules, scoring, fouls, penalties or strategies. You might not understand why a referee made a decision, why a point was awarded or rejected, or why an athlete was disqualified.

Commentary does not always explain these moments in simple language. A new cricket fan, for example, might hear "Umpire's Call" on an LBW decision and still not know what it means. That can make a match hard to follow, even when you are keen to watch.

## The artifact

The artifact is the AI companion, not a new video player. The player labeled Live Lens is a demo surface that mimics watching a live match so you can try the companion in context.

The companion sits over the video as a small movable pet. Click it to open a compact chat window, ask a question, and get a simple explanation. When a moment may need explaining, the companion should show a brief note over the match, then return to the pet after about 20 seconds. The match should keep playing while the note appears.

## How the live version could work

As the match plays, the system could transcribe commentary and sample video frames. It could combine those clues with the current score, match records and the rules of the sport.

A decision model, such as Jev from TypeSafe AI, could decide whether the moment is worth interrupting for. If it is, the companion would show a short explanation. If the available evidence does not explain a referee's decision, it should say so instead of guessing. Fans could still open the pet and ask a question at any time.

Commentary transcription, frame analysis and the decision model are future work. The current prototype does not do them.

## Current demo

The demo uses the Argentina–Netherlands 2022 World Cup quarter-final. It answers questions using selected match moments, football rules and recorded match actions. It can also show automatic notes for preselected moments.

The prototype currently covers this football match; it does not understand every moment automatically or support other sports yet. Submitting a question pauses playback to keep the answer tied to the moment you asked about.

## Tech stack

- Next.js App Router and React, written in JavaScript
- Tailwind CSS
- Google Gemini API for answers, called by the server
- Cloudflare-hosted match video
- JSON files for match moments, match-clock markers, rules and recorded actions

## Run locally

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To enable Gemini answers, add a `.env.local` file with your API key:

```bash
GEMINI_API_KEY=your_api_key
```

The player uses the Cloudflare video by default. Set `NEXT_PUBLIC_VIDEO_SRC` in `.env.local` to use another video URL. Without a Gemini key, the companion answers from the saved match records and rules.
