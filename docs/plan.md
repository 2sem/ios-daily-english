# Plan: relaunch Days 1–12 in the landscape + hooks format

Decided 2026-10-23. Delete this file when the plan is done.

## Decisions
- New Day 1 publishes **2026-10-25 08:00 KST**; one new day every day after that.
- Days 1–12 are **recreated** in the new format (same 3 terms and quizzes per day; new chat dialogue,
  hooks and code snippets). Old vertical Days 1–12 videos **stay on the channel** (keep both).
- Day 13 (already uploaded, private) moves to **2026-11-06**, right after Day 12.
- Day 14 onward: one new day per day, made just in time with the new format.
- Shorts (hooks) upload with `notifySubscribers=false`; the landscape long video notifies.
- **Hooks follow the long video** (changed 2026-10-24): from Day 8 on, only the long video is uploaded up front.
  Its 3 hooks are made and scheduled with `/make-hook-shorts [day]` once the long video is public
  (`.claude/skills/make-hook-shorts/SKILL.md`). Days 1-7 hooks were already uploaded and stay as scheduled.
- Facebook/IG Reels are paused for the relaunch; decide later whether hooks go there.

## Schedule (KST)
Day N long video: 08:00 on date D(N) = 2026-10-24 + N. The 3 hooks go out the same day at 12:00, 18:00, 21:00
(Days 1-7 already scheduled that way; Day 8+ via `/make-hook-shorts` after the long video is public, so slots
that have already passed move to the next day).

| Day | Date | | Day | Date |
|---|---|---|---|---|
| 1 | 10-25 | | 7 | 10-31 |
| 2 | 10-26 | | 8 | 11-01 |
| 3 | 10-27 | | 9 | 11-02 |
| 4 | 10-28 | | 10 | 11-03 |
| 5 | 10-29 | | 11 | 11-04 |
| 6 | 10-30 | | 12 | 11-05 |
| | | | 13 | 11-06 |

## Work
1. **Content** (content-creator): add `dialogue`, `hooks`, `terms[i].code`, `video.landscape` and hook
   titles/descriptions to `day-001..012.json`. Keep terms, quizzes and the old `video` block unchanged.
2. **Render** (video-artist): per day 1 landscape video, 3 hooks, 1 landscape thumbnail. Do Day 1 first.
3. **Upload and schedule** (youtube-uploader): private + `publishAt`, in publish order.
   - YouTube API quota is 10,000 units/day and an upload costs about 1,600, so about 6 uploads per day.
     Each day needs 4 uploads (48 in total), so upload a few days ahead on a rolling basis, never all at once.
   - Day 1's long video must be uploaded before 10-25 08:00.
4. **Day 13** (youtube-uploader): reschedule the 4 uploaded videos to 11-06 (long 08:00, hooks 12:00, 18:00, 21:00).
5. **Review gates** (owner): approve the Day 1 render before any recreated day is uploaded; PR #27 must be reviewed first.
6. **Analyst**: baseline run after the owner runs `scripts/analytics-auth.mjs`; first verdict about 2026-11-01.

## Risks
- Rendering 12 days (about 48 videos) takes hours; uploads are limited by quota.
- Old and new videos both say "Day N"; new titles carry "Real Code Review Chat" to tell them apart.
- Whether `notifySubscribers=false` is honoured at scheduled go-live is unverified.
- PR #27 is not merged yet; this work stacks on it.

## Progress (2026-10-24)
- Uploaded private + scheduled: Days 1-7 long video + 3 hooks each; Day 13 (moved to 11-06).
- 2026-10-24: schedules removed from the 21 hooks of Days 1-7 (still uploaded, private, unscheduled). Long videos of Days 1-7 and Day 13 stay scheduled.
  Reschedule each day's hooks with `/make-hook-shorts` after its long video is public (`videos.update` with `publishAt`).
- Day 8 long video uploaded (aECniF9cRwY, 11-01 08:00), custom thumbnail set.
- 2026-10-24 16:55: Days 9-12 long videos uploaded (private, scheduled 11-02..11-05 08:00), thumbnails set via API.
- Left: hooks of Days 1-12 via `/make-hook-shorts` after each long video is public (Day 1 first, 10-25 08:00).
- The default YouTube quota (10,000/day, about 1,600 per upload) did not bind: 28 uploads went through in one sitting.
