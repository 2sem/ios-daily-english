# iOS Daily English: channel workflow (current)

The authoritative end-to-end pipeline. `docs/video-workflow.md` is the original square, silent Day 371
reference; the layout rules and diagram guidance in its section 4 still apply, everything else below wins.

## What a day produces

| Output | Detail |
|---|---|
| Video | Vertical **1080x1920** YouTube Short, about 2 minutes, H.264 + AAC |
| Voice | Offline TTS (macOS `say`), two voices that rotate by day |
| Music | Quiet background track under the voice |
| Thumbnail | Portrait **1080x1920**: logo, "Day N", the three terms |
| Metadata | Title, description, tags stored in the day JSON |
| Upload | Private upload, scheduled with `publishAt` |

## Pipeline (one command per step, run from the repo root)

```sh
node scripts/day.mjs next                                   # 1. next day number + terms already used
#  content-creator writes content/days/day-NNN.json         # 2. 3 terms, 3 quizzes, title/description/tags
node scripts/day.mjs add content/days/day-NNN.json          #    validates, rejects duplicate terms, renders post text
node scripts/tts.mjs content/days/day-NNN.json              # 3. voice clips -> video/audio/day-NNN/
node scripts/timing.mjs content/days/day-NNN.json --audio-dir video/audio/day-NNN
cp -r video/template video/dayNNN                           # 4. video-artist edits diagrams/code in index.html
node scripts/apply-timing.mjs video/dayNNN/index.html video/out/day-NNN.timing.json \
     --audio-dir video/audio/day-NNN --voice all --bgm "<track.mp3>"
(cd video/dayNNN && npx hyperframes check && npx hyperframes render -q high -f 30 -o ../out/dayNNN.mp4)
node scripts/thumbnail.mjs content/days/day-NNN.json        # 5. video/out/day-NNN-thumb.png
node scripts/youtube-upload.mjs content/days/day-NNN.json --publish-at 2026-10-12T08:00:00+09:00
node scripts/youtube-thumbnail.mjs content/days/day-NNN.json
```

`youtube-schedule.mjs <day.json> <ISO time>` reschedules an already uploaded day (needs the `youtube` scope).

## Rules that came out of review

### Content
- 3 terms per day, one theme, easy to hard, never a term used before (`content/terms.json` is the registry).
- Definition: one plain sentence. Example: one realistic teammate sentence. Both appear verbatim in the video.
- Quizzes: 3 questions, order differs from the terms, each term correct exactly once, question never names its answer.

### Voice
- Narrator voice reads intro, term, definition, quiz question and outro at 135 wpm, with short pauses at commas.
- A second voice reads the example. **Each example is read twice: natural speed (160 wpm), then slowly (100 wpm)**,
  and the on-screen label switches from "In a sentence" to "Again, slowly".
- Voices rotate by day (`scripts/voices.mjs`): female/male, male/female, random (seeded by day). Premium and Enhanced
  voices are used when installed (System Settings, Accessibility, Spoken Content, Manage Voices).
  A day's voices are saved in its JSON (`video.voices`) so a re-render sounds the same.
- The slow second reading uses the narrator voice.
- **Quiz options are never spoken.** They appear with the question so viewers can read ahead.

### Video
- Timing is derived from real clip lengths (`timing.mjs`), never fixed seconds. The example always gets its full reading time.
- Per term: term spoken, definition spoken (diagram plays), code card + example (read twice), pause.
- Quiz: question read, options on screen, then an 8 s countdown. The answer is never revealed ("Time's up. Got it?").
- Keep the right 250 px and bottom 200 px clear of important text (Shorts UI overlays them).
- Channel logo (white rounded tile) appears in the intro and the outro only.
- Code snippets are illustrations; real APIs, plain `//` comments, no emoji. Tell the owner they were not compiled.
- Total must stay under 180 s (Shorts limit). If it does not, shorten text, do not cut reading time.

### Music
- Pass `--bgm <file>` to `apply-timing.mjs`. Default pick: `Rio_Nights.mp3` from `~/Movies/Backgroumds` (steady, 131 s).
- Confirm the license of any track before publishing. Add a credit line to the description if it requires one.

### Upload
- Always upload **private**, scheduled with `--publish-at`. Default slot: 08:00 KST (commute).
- Never upload the same day twice (the script refuses when `youtube.videoId` is set).
- Thumbnail is set right after the upload (`youtube-thumbnail.mjs`).

## Credentials and safety
- `~/.config/ios-daily-english/client_secret.json` and `token.json`, mode 600, outside the repo. Never print or commit them.
- One-time login: `node scripts/youtube-auth.mjs`. Scope is `youtube` (needed to reschedule after upload).
  Upload, thumbnail and scheduling at upload time also work with the narrower `youtube.upload` scope.
- The Google Cloud project must have **YouTube Data API v3 enabled**. In Testing mode the token expires after 7 days.
- Revoke access any time: Google Account, Security, Third-party apps with account access.

## Folder map

| Path | What |
|---|---|
| `content/` | `CURRICULUM.md`, `terms.json` (registry), `days/day-NNN.json` and `.post.txt` |
| `scripts/` | day registry, TTS, timing, apply-timing, thumbnail, YouTube auth/upload/schedule/thumbnail |
| `video/template/` | vertical composition template, fonts, GSAP, logo (copy per day) |
| `video/out/`, `video/audio/`, `video/dayNNN/` | generated, gitignored |
| `brand/` | `logo.png`, avatar and banner renders |
| `.claude/agents/` | content-creator, video-artist, youtube-uploader |
| `.claude/skills/new-day/` | `/new-day` manager workflow |

## Open items
- Music license for `Rio_Nights.mp3` unconfirmed.
- Premium voices cover US English only; the standard pool adds GB, AU, IE, IN, ZA accents.
- Day 1 was uploaded under the first Google Cloud project; the current OAuth client belongs to a second project.
