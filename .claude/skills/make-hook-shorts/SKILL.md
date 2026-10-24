---
name: make-hook-shorts
description: Upload and schedule a day's 3 hook Shorts after that day's landscape long video is public. Use when asked to "make hook shorts", "hooks for Day N", or /make-hook-shorts [day].
---

# make-hook-shorts

Manager workflow. Hooks point viewers at the long video, so they go out only after it is public.
Full rules and commands: `docs/channel-workflow.md`.

## Steps

1. **Day.** Use the day number the user gives. With none, pick the lowest day whose long video is public and whose
   `hooks[i].youtubeId` are empty.
2. **Gate.** Spawn `youtube-uploader` to read the long video's `privacyStatus` (`video.landscape.youtubeId`).
   If it is not `public`, stop and report the scheduled `publishAt`. Do not upload hooks early.
3. **Render check.** `video/out/dayNNN-hook1..3.mp4` must exist. If not (or the day JSON `hooks` changed), render with
   `scripts/render-day-landscape.sh` via `video-artist`. Hooks must show the same code and lines as the long video.
4. **Upload.** Spawn `youtube-uploader`: `node scripts/youtube-upload.mjs content/days/day-NNN.json --kind hookK --publish-at <time>`
   for K = 1..3. Private + `publishAt` only, `notifySubscribers=false` (default for Shorts), no Facebook.
   Slots: 12:00, 18:00, 21:00 KST on the long video's publish date. Slots already in the past move to the next
   free slot (next day 12:00, 18:00, 21:00). `{{LONG_URL}}` is filled by the script.
5. **Record.** The script writes each `youtubeId` into the day JSON. Commit it with the plan progress line.
6. **Cover.** Shorts cover stays manual in Studio (not settable via API). Copy the day thumbnail to `~/Downloads/`.
7. **Report.** List the 3 URLs and their `publishAt`. No question to the user unless the gate in step 2 fails.
