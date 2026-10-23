# iOS Daily English: channel workflow (current)

The authoritative end-to-end pipeline. `docs/video-workflow.md` is the original square, silent Day 371
reference; the layout rules and diagram guidance in its section 4 still apply, everything else below wins.

## What a day produces

| Output | Detail |
|---|---|
| Video | Vertical **1080x1920** YouTube Short, about 2 minutes, H.264 + AAC |
| Voice | edge-tts (Microsoft neural en-US voices), two voices that rotate by day. Offline fallback: macOS `say` |
| Music | Quiet background track under the voice |
| Thumbnail | Portrait **1080x1920**: logo, "Day N", the three terms |
| Metadata | Title, description, tags stored in the day JSON |
| Upload | YouTube: private upload, scheduled with `publishAt`. Facebook: Page Reel, cross-posted to Instagram |

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
cp video/out/day-NNN-thumb.png ~/Downloads/                  # after the upload succeeds
node scripts/facebook-upload.mjs content/days/day-NNN.json   # 6. Facebook Page Reel (--publish-at ISO | --draft)
```

`youtube-schedule.mjs <day.json> <ISO time>` reschedules an already uploaded day (needs the `youtube` scope).
`facebook-upload.mjs` publishes the same MP4 as a Facebook Page Reel; Meta shares it to Instagram.

## Team

| Member | Owns | Hands off to |
|---|---|---|
| Manager (Claude + the owner) | Day scope, review gates, approvals, publish time, music licence | everyone |
| `content-creator` | Terms, definitions, examples, quizzes, title, description, tags, duplicate check | video-artist |
| `video-artist` | Voice clips, timing, composition, music, render, snippet checks, thumbnail | youtube-uploader |
| `youtube-uploader` | Private upload, schedule, status in the day JSON | facebook-uploader |
| `facebook-uploader` | Facebook Page Reel from the same MP4 (Meta cross-posts to Instagram), friendly caption, status in the day JSON | manager |
| `marketer` (shared agent) | Weekly review of Studio analytics: best publish time, title and thumbnail tests | content-creator |

The owner approves: the content (step 3) and the video and thumbnail (step 6). That approval, or an explicit
"publish", also covers the YouTube upload and Facebook Reel: do not ask again about caption, time or licence.
Default time is 08:00 KST next day. Nothing is published before the step 6 approval. Subagents never commit or push; the manager does.

## Rules that came out of review

### Content
- 3 terms per day, one theme, easy to hard, never a term used before (`content/terms.json` is the registry).
- Definition: one plain sentence. Example: one realistic teammate sentence. Both appear verbatim in the video.
- Quizzes: 3 questions, order differs from the terms, each term correct exactly once, question never names its answer.

- Dialogue and hooks (pilot, landscape-dialogue-format): each day JSON also carries `dialogue`
  (title, setting, two speakers with edge-tts voice ids, 18-20 lines of about 2 minutes, each term used at
  least three times, per-line `terms`) for a long landscape video, and `hooks` (15-25 s Shorts: `one-line-example`
  with one sentence, `one-line-conversation` with an A/B exchange, max about 12 words per line).
  Each `terms[i]` may carry an optional `code` string (a 3-8 line Swift snippet, type-checked with
  `swiftc -typecheck`) shown in the landscape code panel; new days should include it.
  The vertical pipeline ignores these fields, so existing renders keep working.

### Voice
- Narrator voice reads intro, term, definition, quiz question and outro at 135 wpm, with short pauses at commas.
- A second voice reads the example. **Each example is read twice: natural speed (160 wpm), then slowly (100 wpm)**,
  and the on-screen label switches from "In a sentence" to "Again, slowly".
- Voices rotate by day (`scripts/voices.mjs`): female/male, male/female, random (seeded by day). Default engine is
  **edge-tts** (`en-US-Ava/Jenny/Aria` female, `en-US-Andrew/Guy/Brian` male; `edge-tts` is on PATH from `~/.local/bin`).
  A day's voices and engine are saved in its JSON (`video.voices`) so a re-render sounds the same. A day saved with
  another engine (older days used `say`) gets this engine's rotation when `tts.mjs` is re-run.
- The slow second reading uses the narrator voice.
- **Quiz options are never spoken.** They appear with the question so viewers can read ahead.

### Narration engine (edge-tts)
- Feed narration text as written. Keep English terms in English, no phonetic respelling (that was a `say` workaround;
  `--engine say` still applies it).
- Each clip is kept as `video/audio/day-NNN/<key>.mp3` and reused on re-runs, so a re-render never calls the service
  again. `--force` regenerates; `--only a,b` renders just those keys. The pipeline reads the `.wav` made from the mp3.
- Scene length = audio length (`timing.mjs` measures with ffprobe). edge clips run about 25-45% longer than `say`
  (the slow second reading most), so retime scenes and check the 180 s Shorts limit and the 60-75 s short-format band.
- Listen to the key terms (`throws`, `do-catch`, `SwiftUI`, `nil`) before the final render. Some voices, e.g.
  `en-US-EmmaNeural`, intermittently reject certain `--rate` values, so they are not in the pool.
- Offline fallback: `node scripts/tts.mjs <day.json> --engine say`. edge-tts needs internet and uses an unofficial Edge
  endpoint: fine while the channel has no ads or sponsors; switch to Azure Speech (licensed, free tier 500k
  chars/month) if the channel is monetized.

### Video
- Timing is derived from real clip lengths (`timing.mjs`), never fixed seconds. The example always gets its full reading time.
- Per term: term spoken, definition spoken (diagram plays), code card + example (read twice), pause.
- Quiz: question read, options on screen, then an 8 s countdown. The answer is never revealed ("Time's up. Got it?").
- Keep the right 250 px and bottom 200 px clear of important text (Shorts UI overlays them).
- Channel logo (white rounded tile) appears in the intro and the outro only.
- Code snippets are type-checked with `swiftc -typecheck`; real compiler messages are copied, never guessed. Plain `//` comments, no emoji.
- Total must stay under 180 s (Shorts limit). If it does not, shorten text, do not cut reading time.

### Music
- Pass `--bgm <file>` to `apply-timing.mjs`. Default pick: `Rio_Nights.mp3` from `~/Movies/Backgroumds` (steady, 131 s). Copyright-free, confirmed by the owner; no credit line needed.
- Confirm the license of any track before publishing. Add a credit line to the description if it requires one.

### Upload
- Always upload **private**, scheduled with `--publish-at`. Default slot: 08:00 KST (commute).
- Never upload the same day twice (the script refuses when `youtube.videoId` is set).
- No thumbnail API call. `thumbnails.set` only fills the 16:9 slot (watch page, search); the Shorts tab and feed show
  an auto-picked video frame and the API cannot change that. After the upload, copy the thumbnail to `~/Downloads/`.
- **Manual step, every day:** in the YouTube Studio mobile app, Content > the Short > Edit > Thumbnail, then upload
  `video/out/day-NNN-thumb.png`. Do this once the upload is processed; the report must remind the owner.

### Facebook / Instagram
- Reel goes to the Page "IOS Daily English" (Facebook Group has no API). Instagram receives it through Meta
  Accounts Center auto-sharing; the script never calls the Instagram API.
- Caption is stored in the day JSON as `facebook.caption`: friendly and natural, a greeting, the 3 terms in plain
  words, examples read twice, quiz invite, series line, 4 hashtags, no `#Shorts`, at most one emoji.
- Publish now by default; `--publish-at` schedules, `--draft` uploads without publishing. Never twice per day.
- Thumbnail: Facebook only accepts it while the Reel is unpublished, so the script sets `day-NNN-thumb.png` right after
  processing for `--publish-at` and `--draft`. Publishing now cannot set one; always schedule. YouTube's Shorts cover is
  a separate manual step (see Upload).
- Edit a live caption with `POST /{videoId}` `description=...`, then update `facebook.caption`.
- Day 1 (128 s) was accepted as a Reel.

## Credentials and safety
- `~/.config/ios-daily-english/client_secret.json` and `token.json`, mode 600, outside the repo. Never print or commit them.
- One-time login: `node scripts/youtube-auth.mjs`. Scope is `youtube` (needed to reschedule after upload).
  Upload and scheduling at upload time also work with the narrower `youtube.upload` scope.
- The Google Cloud project must have **YouTube Data API v3 enabled**. In Testing mode the token expires after 7 days.
- Revoke access any time: Google Account, Security, Third-party apps with account access.
- Facebook: `~/.config/ios-daily-english/facebook.json` (mode 600) holds `pageId`, `pageAccessToken`, `userAccessToken`.
  The Page token comes from `GET me/accounts`; `/me` with it must return the Page. Meta app `967380933077818`
  (use case: Manage everything on your Page; permissions `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`).

## Folder map

| Path | What |
|---|---|
| `content/` | `CURRICULUM.md`, `terms.json` (registry), `days/day-NNN.json` and `.post.txt` |
| `scripts/` | day registry, TTS, timing, apply-timing, thumbnail, YouTube auth/upload/schedule, Facebook upload |
| `video/template/` | vertical composition template, fonts, GSAP, logo (copy per day) |
| `video/out/`, `video/audio/`, `video/dayNNN/` | generated, gitignored |
| `brand/` | `logo.png`, avatar and banner renders |
| `.claude/agents/` | content-creator, video-artist, youtube-uploader, facebook-uploader |
| `.claude/skills/new-day/` | `/new-day` manager workflow |

## Open items
- edge voices are en-US only; other accents (en-GB, en-AU, en-IN) are available in edge-tts if wanted.
- Facebook: the user token expires (about 60 days if extended); refresh in Graph API Explorer and re-derive the Page token.
- Facebook: the app is in Development mode, so only app roles can publish; fine for our own Page.
- Day 1 was uploaded under the first Google Cloud project; the current OAuth client belongs to a second project.
