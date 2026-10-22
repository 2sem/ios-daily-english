#!/usr/bin/env node
// Publish a day's video as a Facebook Page Reel (Graph API). No packages.
//   node scripts/facebook-upload.mjs content/days/day-001.json [--publish-at ISO] [--draft] [--caption "text"]
// Default publishes now. --publish-at schedules it (10 min to 30 days ahead). --draft keeps it unpublished.
// The thumbnail (video/out/day-NNN-thumb.png, or --thumbnail path) is set while the Reel is still unpublished;
// Facebook rejects thumbnail changes after publish, so prefer --publish-at over publishing now.
// Instagram gets the Reel through Meta's Accounts Center cross-posting, not through this script.
// Needs ~/.config/ios-daily-english/facebook.json = { pageId, pageAccessToken }.
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const file = argv.find((a) => a.endsWith(".json"));
const opt = (n, d = null) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
if (!file) { console.error("usage: facebook-upload.mjs <day.json> [--publish-at ISO] [--draft] [--caption text]"); process.exit(1); }

const API = "https://graph.facebook.com/v26.0";
const dayPath = resolve(file);
const day = JSON.parse(readFileSync(dayPath, "utf8"));
const v = day.video ?? {};
if (day.facebook?.videoId) { console.error(`Day ${day.day} is already on Facebook (${day.facebook.videoId}). Refusing to upload twice.`); process.exit(1); }
if (!v.file) { console.error("missing video.file in the day JSON"); process.exit(1); }
const videoPath = resolve(root, v.file);
const size = statSync(videoPath).size;

const caption = opt("caption") ?? day.facebook?.caption ?? (v.description ?? v.title ?? "").replace(/\s*#Shorts\b/g, "").trim();
if (caption.length > 2200) { console.error("caption is over 2200 characters"); process.exit(1); }

const { pageId, pageAccessToken } = JSON.parse(readFileSync(join(homedir(), ".config", "ios-daily-english", "facebook.json"), "utf8"));
const call = async (path, body) => {
  const r = await fetch(`${API}/${path}`, { method: "POST", body: new URLSearchParams({ ...body, access_token: pageAccessToken }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path}: ${j.error?.code} ${j.error?.message}`);
  return j;
};

const mode = argv.includes("--draft") ? "DRAFT" : opt("publish-at") ? "SCHEDULED" : "PUBLISHED";
const finish = { upload_phase: "finish", description: caption, video_state: mode };
if (mode === "SCHEDULED") finish.scheduled_publish_time = String(Math.floor(new Date(opt("publish-at")).getTime() / 1000));

console.log(`Day ${day.day}: ${(size / 1e6).toFixed(1)} MB, ${mode}`);
const start = await call(`${pageId}/video_reels`, { upload_phase: "start" });
const up = await fetch(start.upload_url, {
  method: "POST",
  headers: { Authorization: `OAuth ${pageAccessToken}`, offset: "0", file_size: String(size) },
  body: readFileSync(videoPath),
});
const upj = await up.json();
if (!up.ok || upj.success === false) { console.error("upload failed:", JSON.stringify(upj), "video_id", start.video_id); process.exit(1); }
const fin = await call(`${pageId}/video_reels`, { ...finish, video_id: start.video_id });
console.log("finish:", JSON.stringify(fin));

let status = null;
for (let i = 0; i < 30; i++) {
  const r = await fetch(`${API}/${start.video_id}?fields=status,permalink_url&access_token=${pageAccessToken}`);
  status = await r.json();
  const s = status.status?.video_status;
  console.log("status:", s, status.status?.processing_progress ?? "");
  if (["ready", "error", "expired"].includes(s)) break;
  await new Promise((r) => setTimeout(r, 10000));
}

// Facebook only accepts a thumbnail while the Reel is unpublished, so set it now for SCHEDULED/DRAFT.
const thumbPath = resolve(root, opt("thumbnail") ?? join("video", "out", `day-${String(day.day).padStart(3, "0")}-thumb.png`));
let thumbnailSet = null;
if (mode === "PUBLISHED") {
  console.warn("WARNING: publishing now; Facebook cannot set a thumbnail after publish. Use --publish-at or --draft.");
} else {
  const fd = new FormData();
  fd.append("source", new Blob([readFileSync(thumbPath)], { type: "image/png" }), "thumb.png");
  fd.append("is_preferred", "true");
  const tr = await fetch(`${API}/${start.video_id}/thumbnails?access_token=${pageAccessToken}`, { method: "POST", body: fd });
  const tj = await tr.json();
  if (tr.ok && tj.success) {
    thumbnailSet = new Date().toISOString();
    console.log("thumbnail set:", thumbPath);
  } else {
    console.error("WARNING: thumbnail not set:", JSON.stringify(tj.error ?? tj));
  }
}

day.facebook = {
  ...day.facebook,
  videoId: start.video_id,
  mode,
  uploaded: new Date().toISOString(),
  ...(thumbnailSet ? { thumbnail: thumbPath.replace(root + "/", ""), thumbnailSet } : {}),
  ...(mode === "SCHEDULED" ? { scheduledAt: new Date(opt("publish-at")).toISOString() } : {}),
  ...(status?.permalink_url ? { url: `https://www.facebook.com${status.permalink_url}` } : {}),
};
day.status = { ...day.status, facebook: mode === "PUBLISHED" ? "published" : mode.toLowerCase() };
writeFileSync(dayPath, JSON.stringify(day, null, 2) + "\n");
console.log("recorded in", file, JSON.stringify(day.facebook));
