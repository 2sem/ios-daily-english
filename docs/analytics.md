# Analytics (read-only)

Measures the landscape + hook pilot (Day 13 on) against vertical Shorts (Days 1-12). Owned by the `analyst` agent
(`.claude/agents/analyst.md`); it never uploads or edits content.

## One-time setup
1. Google Cloud project behind `~/.config/ios-daily-english/client_secret.json`: enable **YouTube Analytics API**
   (and YouTube Data API v3, already on for uploads) at APIs & Services > Library.
2. If the OAuth consent screen is in Testing mode, make sure the channel's Google account is a test user.
3. `node scripts/analytics-auth.mjs` and approve in the browser. The token goes to
   `~/.config/ios-daily-english/analytics-token.json` (mode 600). The upload token (`token.json`) is untouched.
   Testing-mode tokens expire after 7 days: re-run the command.

## Use
```
node scripts/analytics.mjs                 # last 28 days, table + per-kind aggregate
node scripts/analytics.mjs --days 7 --day 13
node scripts/analytics.mjs --json | --csv reports/data-YYYY-MM-DD.csv
node scripts/analytics.mjs --demo          # sample data, no credentials
```
Exit codes: 0 ok, 1 API error, 2 missing/expired token.

## Limits
- Impressions and CTR are not in the YouTube Analytics API. Read them in Studio (Analytics > Reach) and paste into the report.
- Data lags 1-2 days; the script ends the range at yesterday (KST).
- Day/kind mapping uses `video.youtubeId`, `video.landscape.youtubeId`, `hooks[i].youtubeId`; otherwise the title
  "Day N" (guess: `#Shorts` = hook, else vertical). Unmapped videos show as `other`.
- Only the Analytics scope is read-only; the script makes GET requests only.
