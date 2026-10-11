#!/usr/bin/env node
// Set a day's custom thumbnail on its uploaded YouTube video (thumbnails.set). No packages.
//   node scripts/youtube-thumbnail.mjs content/days/day-001.json [image.png]
// Default image: video/out/day-NNN-thumb.png (see scripts/thumbnail.mjs). Max 2 MB, PNG or JPEG.
// Custom thumbnails need a verified channel (phone verification in YouTube Studio).
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [file, imgArg] = process.argv.slice(2);
if (!file) { console.error("usage: youtube-thumbnail.mjs <day.json> [image]"); process.exit(1); }
const dayPath = resolve(file);
const day = JSON.parse(readFileSync(dayPath, "utf8"));
const id = day.youtube?.videoId;
if (!id) { console.error("this day has no youtube.videoId; upload first"); process.exit(1); }
const img = imgArg ? resolve(imgArg) : join(root, "video", "out", `day-${String(day.day).padStart(3, "0")}-thumb.png`);
if (statSync(img).size > 2 * 1024 * 1024) { console.error("thumbnail is over 2 MB"); process.exit(1); }

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

const type = img.endsWith(".png") ? "image/png" : "image/jpeg";
const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}&uploadType=media`, {
  method: "POST",
  headers: { authorization: `Bearer ${tj.access_token}`, "content-type": type },
  body: readFileSync(img),
});
const body = await r.text();
if (!r.ok) {
  console.error("thumbnail upload failed:", r.status, body);
  if (r.status === 403) console.error("403 usually means the channel is not verified for custom thumbnails (YouTube Studio > Settings > Channel > Feature eligibility).");
  process.exit(1);
}
day.youtube = { ...day.youtube, thumbnail: img.replace(root + "/", ""), thumbnailSet: new Date().toISOString() };
writeFileSync(dayPath, JSON.stringify(day, null, 2) + "\n");
console.log(`thumbnail set for https://youtu.be/${id}`);
