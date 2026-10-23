#!/usr/bin/env node
// Upload a day's video to YouTube (Data API v3, resumable upload). No packages.
//   node scripts/youtube-upload.mjs content/days/day-001.json [--publish-at 2026-10-12T08:00:00+09:00] [--public]
//   --kind landscape|hook1|hook2|hook3   upload the Day's landscape video or a hook Short (always private + publishAt)
//   --dry-run  print title/description/tags/file/publishAt without calling the API;  --force  re-upload a kind that has a youtubeId
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
if (!file) { console.error("usage: youtube-upload.mjs <day.json> [--publish-at ISO] [--public] [--kind landscape|hook1..3] [--dry-run] [--force]"); process.exit(1); }

const dayPath = resolve(file);
const day = JSON.parse(readFileSync(dayPath, "utf8"));
const kind = opt("kind", "default");
const dry = argv.includes("--dry-run");
const force = argv.includes("--force");
const publishAt = opt("publish-at");
const pad = String(day.day).padStart(3, "0");

// "m:ss" (or "h:mm:ss") chapter stamp, floored to whole seconds
const stamp = (s) => { const t = Math.floor(s); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`; };
function chapters() {
  const tp = resolve(root, `video/out/day-${pad}.landscape.timing.json`);
  const t = JSON.parse(readFileSync(tp, "utf8"));
  const list = [["Intro", 0], ...t.terms.map((x) => [x.term, x.start])];
  if (t.conv) list.push(["Chat conversation", t.conv.start]);
  if (t.replay) list.push(["Fill the blank (replay)", t.replay.start]);
  list.push(["Quiz", t.quizIntro.start], ["See you tomorrow", t.outro.start]);
  for (let i = 0; i < list.length; i++) {
    const len = (i + 1 < list.length ? list[i + 1][1] : t.total) - list[i][1];
    if (len < 10) { console.error(`chapter "${list[i][0]}" is only ${len.toFixed(1)}s (YouTube needs >= 10s)`); process.exit(1); }
  }
  if (list.length < 3) { console.error("need at least 3 chapters"); process.exit(1); }
  return list.map(([n, at]) => `${stamp(at)} ${n}`).join("\n");
}

// holder = object that records youtubeId/publishAt for this kind (null = legacy day.youtube)
let holder = null, m;
if (kind === "default") {
  var v = day.video ?? {};
  var item = { title: v.title, description: v.description ?? "", tags: v.tags ?? [], file: v.file };
} else if (kind === "landscape") {
  const l = day.video?.landscape;
  if (!l) { console.error("missing video.landscape in the day JSON"); process.exit(1); }
  holder = l;
  var item = { title: l.title, description: (l.description ?? "").replace("{{CHAPTERS}}", chapters()), tags: l.tags ?? [], file: `video/out/day${pad}-landscape.mp4` };
} else if ((m = /^hook([1-9])$/.exec(kind))) {
  const h = day.hooks?.[Number(m[1]) - 1];
  if (!h) { console.error(`no hooks[${Number(m[1]) - 1}] in the day JSON`); process.exit(1); }
  holder = h;
  const longId = day.video?.landscape?.youtubeId;
  if (!longId && !dry) { console.error("upload the landscape video first: hooks link to its URL (video.landscape.youtubeId)"); process.exit(1); }
  var item = { title: h.title, description: (h.description ?? "").replace("{{LONG_URL}}", longId ? `https://youtu.be/${longId}` : "https://youtu.be/<landscape id, set after its upload>"), tags: h.tags ?? day.video?.tags ?? [], file: `video/out/day${pad}-hook${m[1]}.mp4` };
} else { console.error("--kind must be landscape, hook1, hook2 or hook3"); process.exit(1); }

if (kind === "default") {
  if (day.youtube?.videoId || day.status?.youtube === "uploaded" || day.status?.youtube === "scheduled") {
    console.error(`Day ${day.day} is already uploaded (${day.youtube?.videoId ?? "no id"}). Refusing to upload twice.`);
    process.exit(1);
  }
} else if (holder.youtubeId && !force) {
  console.error(`${kind} of day ${day.day} is already uploaded (${holder.youtubeId}). Use --force to upload again.`);
  process.exit(1);
}
if (!item.title || !item.file) { console.error("missing title or file for this kind"); process.exit(1); }
if (item.title.length > 100) { console.error("title is over 100 characters"); process.exit(1); }
if (Buffer.byteLength(item.description) > 5000) { console.error("description is over 5000 bytes"); process.exit(1); }
if (item.description.includes("{{")) { console.error("description still has an unfilled {{placeholder}}"); process.exit(1); }
const videoPath = resolve(root, item.file);
const size = statSync(videoPath).size;
const status = { privacyStatus: argv.includes("--public") && !publishAt && kind === "default" ? "public" : "private", selfDeclaredMadeForKids: false };
if (publishAt) {
  if (Number.isNaN(new Date(publishAt).getTime())) { console.error("bad --publish-at"); process.exit(1); }
  status.publishAt = new Date(publishAt).toISOString();
}

if (dry) {
  console.log(`[dry run] kind: ${kind}`);
  console.log(`title (${item.title.length}/100): ${item.title}`);
  console.log(`file: ${videoPath} (${(size / 1e6).toFixed(1)} MB)`);
  console.log(`privacy: ${status.privacyStatus}   publishAt: ${publishAt ?? "(none)"}${status.publishAt ? ` (UTC ${status.publishAt})` : ""}   madeForKids: false`);
  console.log(`tags (${item.tags.length}): ${item.tags.join(", ")}`);
  if (kind === "landscape") console.log(`chapters:\n${chapters()}`);
  console.log(`description (${Buffer.byteLength(item.description)} bytes):\n${item.description}`);
  process.exit(0);
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

const metadata = {
  snippet: { title: item.title, description: item.description, tags: item.tags, categoryId: "27", defaultLanguage: "en", defaultAudioLanguage: "en" },
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

if (kind === "default") {
  day.youtube = { videoId: out.id, url: `https://youtu.be/${out.id}`, privacy: status.privacyStatus, scheduledAt: status.publishAt ?? null, uploaded: new Date().toISOString() };
  day.status = { ...(day.status ?? {}), youtube: publishAt ? "scheduled" : "uploaded" };
} else {
  Object.assign(holder, { youtubeId: out.id, youtubeUrl: `https://youtu.be/${out.id}`, privacy: status.privacyStatus, publishAt: status.publishAt ?? null, uploaded: new Date().toISOString() });
}
writeFileSync(dayPath, JSON.stringify(day, null, 2) + "\n");
if (kind === "landscape") {
  // 16:9 video: thumbnails.set works (verified on Day 13). Not for hooks / Shorts (cover is not settable via API).
  const thumb = resolve(root, `video/out/day-${pad}-thumb-landscape.png`);
  const tp = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${out.id}&uploadType=media`, {
    method: "POST", headers: { ...auth, "content-type": "image/png" }, body: readFileSync(thumb),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  if (tp.ok) { holder.thumbnailSet = new Date().toISOString(); writeFileSync(dayPath, JSON.stringify(day, null, 2) + "\n"); console.log("Landscape thumbnail set via API."); }
  else console.error(`Landscape thumbnail NOT set (${tp.status}): ${await tp.text()}\nRetry: node scripts/youtube-thumbnail.mjs ${out.id} ${thumb}`);
}
console.log(`Done: https://youtu.be/${out.id}  (${status.privacyStatus}${publishAt ? ", scheduled" : ""})`);
console.log(`Studio: https://studio.youtube.com/video/${out.id}/edit`);
