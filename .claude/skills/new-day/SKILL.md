---
name: new-day
description: Create today's iOS Daily English content end to end - next day number, 3 non-duplicate terms, quizzes, title/description, voice, vertical Short video, thumbnail, then (after confirmation) private upload scheduled on YouTube. Use when asked to "create today's content", "new day", or "make Day N".
---

# new-day

Manager workflow. Delegate to the team; do not write the content or video yourself.
Full rules and commands: `docs/channel-workflow.md`.

## Steps

1. **Next day.** `node scripts/day.mjs next`. Use `nextDay` unless the user names a day.
   If that day already has a file, stop and ask before overwriting.
2. **Content.** Spawn `content-creator` with Day N, the phase hint from `content/CURRICULUM.md` and any theme
   the user asked for. It writes `content/days/day-NNN.json` (terms, quizzes, title, description, tags) and
   registers the terms via `node scripts/day.mjs add` (duplicates are rejected there).
3. **Review gate.** Show the user the terms, definitions, quizzes and title (from `day-NNN.post.txt` and the JSON).
   Wait for approval or edits. Re-run `node scripts/day.mjs add` after edits.
4. **Voice.** `node scripts/tts.mjs content/days/day-NNN.json` (voices rotate by day and are saved in the JSON).
   Optionally give the user the clips in `video/audio/day-NNN/` to audition before rendering.
5. **Video.** Spawn `video-artist` with the day file path. It builds the vertical composition, applies timing from the
   real clip lengths, adds music, renders `video/out/dayNNN.mp4`. Open the MP4 for the user.
6. **Thumbnail.** `node scripts/thumbnail.mjs content/days/day-NNN.json`; show `video/out/day-NNN-thumb.png`.
7. **Upload.** The user's approval of the video and thumbnail (or "confirmed" / "publish") is the single publish
   approval. Do not ask again about caption, time or licence. Use the stated time, else the default 08:00 KST next
   day, and spawn `youtube-uploader`. It uploads private with `publishAt`, then sets the thumbnail.
8. **Facebook.** Right after the YouTube upload, spawn `facebook-uploader` with the same time. It writes the
   friendly `facebook.caption` and runs `scripts/facebook-upload.mjs` (`--publish-at` by default) without asking.
   Show the caption in the final report. Meta cross-posts the Reel to Instagram.
9. **Wrap up.** `node scripts/day.mjs list`; report status, URL and scheduled time. Commit the day files on a branch
   named for the goal (e.g. `day-002-content`), never on `main`.

## Notes
- `content/terms.json` is the duplicate registry; never edit it by hand.
- Steps 4-7 are optional: if the user only wants content, stop after step 3.
- Quiz options are never spoken; each example is read twice (natural, then slow); do not change these without asking.
- The saved Google token expires after 7 days in Testing mode; if upload fails with an auth error run
  `node scripts/youtube-auth.mjs` (needs the user's browser approval).
