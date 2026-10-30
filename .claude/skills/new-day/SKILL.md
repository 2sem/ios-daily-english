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
   the user asked for. It writes `content/days/day-NNN.json` (terms, quizzes, title, description, tags, plus `dialogue`, `hooks` and `terms[i].code` + `terms[i].output` (real printed result) and `dialogue.code` (the code the chat is about), all required for new days; the dialogue is 10-12 lines because the replay repeats it with blanks, see docs/channel-workflow.md) and
   registers the terms via `node scripts/day.mjs add` (duplicates are rejected there).
3. **Content.** The owner reviews only the video, not the text: do not stop to ask about content. Show it in the final report only.
   Wording rules: parallel definitions ("A control-flow statement that ..."), no lone singular like "an if" in examples (use "ifs").
   Re-run `node scripts/day.mjs add` after any edit (it cannot remove a term; fix `terms.json` carefully if a term is renamed).
4. **Voice.** `node scripts/tts.mjs content/days/day-NNN.json` (edge-tts neural voices; they rotate by day and are saved in the JSON; offline fallback `--engine say`).
   Optionally give the user the clips in `video/audio/day-NNN/` to audition before rendering.
5. **Video.** Spawn `video-artist` for the **landscape** video only (`video/out/dayNNN-landscape.mp4`, exactly 5:00). Do NOT render the vertical
   Short or hook Shorts unless the user asks. Copy it to `~/Downloads/dayNNN-landscape-review.mp4` and open it for the user.
6. **Thumbnail.** `node scripts/thumbnail.mjs content/days/day-NNN.json --landscape` (set `thumbnailHook` in the day JSON for a short hook as the
   big text); show `video/out/day-NNN-thumb-landscape.png`.
7. **Upload.** The user's approval of the video and thumbnail (or "approve" / "confirmed" / "publish") is the single publish
   approval. Do not ask again about caption, time or licence. Use the stated time, else the default 08:00 KST next
   day, and spawn `youtube-uploader` for the landscape video (private + `publishAt`, notifies subscribers, sets the landscape thumbnail
   through the API, joins the "iOS Daily English" playlist).
8. **Facebook.** Only when a vertical video exists (the user asked for one): spawn `facebook-uploader` with the same time. Skipped by default.
9. **Wrap up.** `node scripts/day.mjs list`; report status, URL and scheduled time. Commit the day files on a branch named for
   the goal (e.g. `day-002-content`), never on `main`. LinkedIn is separate: `/linkedin-newsletter` when asked.

## Notes
- `content/terms.json` is the duplicate registry; never edit it by hand.
- Steps 4-7 are optional: if the user only wants content, stop after step 3.
- Quiz options are never spoken; each example is read twice (natural, then slow); do not change these without asking.
- The saved Google token expires after 7 days in Testing mode; if upload fails with an auth error run
  `node scripts/youtube-auth.mjs` (needs the user's browser approval).
