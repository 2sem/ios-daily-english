#!/usr/bin/env node
// Set a custom thumbnail on an uploaded YouTube video (thumbnails.set). No packages.
//   node scripts/youtube-thumbnail.mjs <videoId> <image.png|jpg>     set it, then list snippet.thumbnails
//   node scripts/youtube-thumbnail.mjs <videoId> --show               only list snippet.thumbnails
// Max 2 MB, PNG or JPEG, 16:9 (1280x720). Only useful for 16:9 videos: it does NOT set the Shorts cover.
// Custom thumbnails need a verified channel (phone verification in YouTube Studio).
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const [id, imgArg] = process.argv.slice(2);
if (!id || !imgArg) { console.error("usage: youtube-thumbnail.mjs <videoId> <image> | <videoId> --show"); process.exit(1); }
const show = imgArg === "--show";
const img = show ? null : resolve(imgArg);
if (img && statSync(img).size > 2 * 1024 * 1024) { console.error("thumbnail is over 2 MB"); process.exit(1); }

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

async function list() {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}`, { headers: auth });
  const j = await r.json();
  if (!r.ok) { console.error("videos.list failed:", r.status, JSON.stringify(j.error ?? j)); process.exit(1); }
  const t = j.items?.[0]?.snippet?.thumbnails ?? {};
  for (const [k, v] of Object.entries(t)) console.log(`  ${k}: ${v.width}x${v.height} ${v.url}`);
}

if (!show) {
  const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}&uploadType=media`, {
    method: "POST",
    headers: { ...auth, "content-type": img.endsWith(".png") ? "image/png" : "image/jpeg" },
    body: readFileSync(img),
  });
  const body = await r.text();
  if (!r.ok) {
    console.error("thumbnail upload failed:", r.status, body);
    if (r.status === 403) console.error("403 usually means the channel is not verified for custom thumbnails (YouTube Studio > Settings > Channel > Feature eligibility) or the token lacks the youtube scope.");
    process.exit(1);
  }
  console.log(`thumbnails.set OK (HTTP ${r.status}) for https://youtu.be/${id}`);
}
console.log("snippet.thumbnails:");
await list();
