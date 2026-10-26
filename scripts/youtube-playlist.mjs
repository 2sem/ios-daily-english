#!/usr/bin/env node
// Add a video to the "iOS Daily English" playlist (playlistItems.insert). No packages.
//   node scripts/youtube-playlist.mjs content/days/day-004.json     (adds video.landscape.youtubeId)
//   node scripts/youtube-playlist.mjs <videoId>
// Skips a video that is already in the playlist. Needs the "youtube" scope token.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const PLAYLIST_ID = "PLUB5sT2vMlgk"; // public playlist "iOS Daily English" (landscape videos only)
const arg = process.argv[2];
if (!arg) { console.error("usage: youtube-playlist.mjs <day.json | videoId>"); process.exit(1); }

let day = null, id = arg;
if (arg.endsWith(".json")) {
  day = JSON.parse(readFileSync(resolve(arg), "utf8"));
  id = day.video?.landscape?.youtubeId;
  if (!id) { console.error("this day has no video.landscape.youtubeId; upload the landscape video first"); process.exit(1); }
}

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
const auth = { authorization: `Bearer ${tj.access_token}` };

const dup = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=id&playlistId=${PLAYLIST_ID}&videoId=${id}`, { headers: auth });
const dj = await dup.json().catch(() => ({}));
if (dup.ok && dj.items?.length) { console.log(`${id} is already in the playlist`); process.exit(0); }

const r = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
  method: "POST",
  headers: { ...auth, "content-type": "application/json" },
  body: JSON.stringify({ snippet: { playlistId: PLAYLIST_ID, resourceId: { kind: "youtube#video", videoId: id } } }),
});
const out = await r.json().catch(() => ({}));
if (!r.ok) { console.error("add to playlist failed:", r.status, JSON.stringify(out.error?.errors ?? out)); process.exit(1); }
if (day) { day.video.landscape.playlistAdded = new Date().toISOString(); writeFileSync(resolve(arg), JSON.stringify(day, null, 2) + "\n"); }
console.log(`added https://youtu.be/${id} to https://www.youtube.com/playlist?list=${PLAYLIST_ID}`);
