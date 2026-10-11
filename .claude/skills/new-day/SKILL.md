---
name: new-day
description: Create today's iOS Daily English content end to end - next day number, 3 non-duplicate terms, quizzes, title/description, then video and (after confirmation) YouTube upload. Use when asked to "create today's content", "new day", or "make Day N".
---

# new-day

Manager workflow. Delegate to the team; do not write the content or video yourself.

## Steps

1. **Next day.** Run `node scripts/day.mjs next`. Use `nextDay` unless the user names a day.
   If the user names a day that already has a file, stop and ask before overwriting.
2. **Content.** Spawn `content-creator` with: Day N, the phase hint from `content/CURRICULUM.md`,
   and any theme the user asked for. It writes `content/days/day-NNN.json` and registers the terms
   via `node scripts/day.mjs add` (duplicate terms are rejected there).
3. **Review gate.** Show the user the 3 terms, definitions, quizzes and title (from
   `content/days/day-NNN.post.txt` and the JSON). Wait for approval or edits. Re-run
   `node scripts/day.mjs add` after edits.
4. **Video.** Spawn `video-artist` with the day file path. It renders `video/out/dayNNN.mp4`.
   Open the contact sheet / MP4 for the user to review.
5. **Upload.** Only after the user approves the video, spawn `youtube-uploader` with the publish time.
   It confirms title/description/time once more before calling the API.
6. **Wrap up.** `node scripts/day.mjs list` and report the day's status. Commit the day files on a
   branch named for the goal (e.g. `day-001-content`), never directly on `main`.

## Notes
- `content/terms.json` is the duplicate registry; never edit it by hand.
- Steps 4–5 are optional: if the user only wants content, stop after step 3.
