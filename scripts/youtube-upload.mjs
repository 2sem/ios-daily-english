#!/usr/bin/env node
// Upload a day's video to YouTube (Data API v3, resumable upload). No packages.
//   node scripts/youtube-upload.mjs content/days/day-001.json [--publish-at 2026-10-12T08:00:00+09:00] [--public]
// Default privacy is "private" (safe): publish later in Studio. --publish-at schedules it (stays private until then).
// Needs ~/.config/ios-daily-english/{client_secret,token}.json (run scripts/youtube-auth.mjs once).
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const file = argv.find((a) => a.endsWith(".json"));
const opt = (n, d = null) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
if (!file) { console.error("usage: youtube-upload.mjs <day.json> [--publish-at ISO] [--public]"); process.exit(1); }

const dayPath = resolve(file);
const day = JSON.parse(readFileSync(dayPath, "utf8"));
const v = day.video ?? {};
if (day.youtube?.videoId || day.status?.youtube === "uploaded" || day.status?.youtube === "scheduled") {
  console.error(`Day ${day.day} is already uploaded (${day.youtube?.videoId ?? "no id"}). Refusing to upload twice.`);
  process.exit(1);
}
if (!v.title || !v.file) { console.error("missing video.title or video.file in the day JSON"); process.exit(1); }
if (v.title.length > 100) { console.error("title is over 100 characters"); process.exit(1); }
if (Buffer.byteLength(v.description ?? "") > 5000) { console.error("description is over 5000 bytes"); process.exit(1); }
const videoPath = resolve(root, v.file);
const size = statSync(videoPath).size;

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

const publishAt = opt("publish-at");
const status = { privacyStatus: argv.includes("--public") && !publishAt ? "public" : "private", selfDeclaredMadeForKids: false };
if (publishAt) status.publishAt = new Date(publishAt).toISOString();
const metadata = {
  snippet: { title: v.title, description: v.description ?? "", tags: v.tags ?? [], categoryId: "27", defaultLanguage: "en", defaultAudioLanguage: "en" },
  status,
};

const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
  method: "POST",
  headers: { ...auth, "content-type": "application/json; charset=UTF-8", "x-upload-content-length": String(size), "x-upload-content-type": "video/mp4" },
  body: JSON.stringify(metadata),
});
if (!init.ok) { console.error("could not start the upload:", init.status, await init.text()); process.exit(1); }
const location = init.headers.get("location");

console.log(`Uploading ${videoPath} (${(size / 1e6).toFixed(1)} MB) as ${status.privacyStatus}${publishAt ? `, scheduled ${status.publishAt}` : ""}...`);
const up = await fetch(location, {
  method: "PUT",
  headers: { "content-length": String(size), "content-type": "video/mp4" },
  body: readFileSync(videoPath),
});
const out = await up.json().catch(() => ({}));
if (!up.ok) { console.error("upload failed:", up.status, JSON.stringify(out)); process.exit(1); }

day.youtube = { videoId: out.id, url: `https://youtu.be/${out.id}`, privacy: status.privacyStatus, scheduledAt: status.publishAt ?? null, uploaded: new Date().toISOString() };
day.status = { ...(day.status ?? {}), youtube: publishAt ? "scheduled" : "uploaded" };
writeFileSync(dayPath, JSON.stringify(day, null, 2) + "\n");
console.log(`Done: https://youtu.be/${out.id}  (${status.privacyStatus}${publishAt ? ", scheduled" : ""})`);
console.log(`Studio: https://studio.youtube.com/video/${out.id}/edit`);
