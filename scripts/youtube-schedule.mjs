#!/usr/bin/env node
// Schedule an already-uploaded day to go public at a given time (videos.update, status.publishAt). No packages.
//   node scripts/youtube-schedule.mjs content/days/day-001.json 2026-10-12T08:00:00+09:00
// Needs a token with the "youtube" scope (scripts/youtube-auth.mjs requests it).
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const [file, when] = process.argv.slice(2);
if (!file || !when) { console.error("usage: youtube-schedule.mjs <day.json> <ISO time with offset>"); process.exit(1); }
const at = new Date(when);
if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 15 * 60 * 1000) {
  console.error("time must be a valid ISO date at least 15 minutes in the future");
  process.exit(1);
}
const dayPath = resolve(file);
const day = JSON.parse(readFileSync(dayPath, "utf8"));
const id = day.youtube?.videoId;
if (!id) { console.error("this day has no youtube.videoId; upload first"); process.exit(1); }

const dir = join(homedir(), ".config", "ios-daily-english");
const { client_id, client_secret, token_uri } = Object.values(JSON.parse(readFileSync(join(dir, "client_secret.json"), "utf8")))[0];
const { refresh_token } = JSON.parse(readFileSync(join(dir, "token.json"), "utf8"));
const tr = await fetch(token_uri, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
});
const tj = await tr.json();
if (!tr.ok) { console.error("could not refresh the access token:", tj.error, tj.error_description ?? ""); process.exit(1); }

const r = await fetch("https://www.googleapis.com/youtube/v3/videos?part=status", {
  method: "PUT",
  headers: { authorization: `Bearer ${tj.access_token}`, "content-type": "application/json" },
  body: JSON.stringify({ id, status: { privacyStatus: "private", publishAt: at.toISOString(), selfDeclaredMadeForKids: false } }),
});
const out = await r.json().catch(() => ({}));
if (!r.ok) {
  console.error("schedule failed:", r.status, JSON.stringify(out.error?.errors ?? out));
  if (r.status === 403) console.error("403: the saved token only has the upload scope. Re-run: node scripts/youtube-auth.mjs");
  process.exit(1);
}
day.youtube = { ...day.youtube, privacy: "private", scheduledAt: out.status?.publishAt ?? at.toISOString() };
day.status = { ...(day.status ?? {}), youtube: "scheduled" };
writeFileSync(dayPath, JSON.stringify(day, null, 2) + "\n");
console.log(`scheduled https://youtu.be/${id} for ${day.youtube.scheduledAt}`);
