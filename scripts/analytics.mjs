#!/usr/bin/env node
// Read-only channel analytics, per video and per format (landscape / hook / vertical).
//   node scripts/analytics.mjs [--days 28] [--day N] [--json] [--csv path] [--demo]
// Needs: node scripts/analytics-auth.mjs (once). Uses YouTube Analytics API v2 + Data API v3. No packages.
// Never writes to YouTube or to content/. Impressions/CTR are NOT exposed by the Analytics API: read them in Studio.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const val = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const DAYS = Number(val("days", 28));
const ONLY_DAY = val("day") ? Number(val("day")) : null;
const KST = (d) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

// ---- map video ids -> day/kind from content/days/day-*.json ----
function loadMap() {
  const map = new Map();
  const dayDir = join(root, "content", "days");
  if (!existsSync(dayDir)) return map;
  for (const f of readdirSync(dayDir).filter((x) => /^day-\d+\.json$/.test(x))) {
    let j; try { j = JSON.parse(readFileSync(join(dayDir, f), "utf8")); } catch { continue; }
    const day = j.day;
    if (j.video?.youtubeId) map.set(j.video.youtubeId, { day, kind: "vertical" });
    if (j.video?.landscape?.youtubeId) map.set(j.video.landscape.youtubeId, { day, kind: "landscape" });
    (j.hooks ?? []).forEach((h) => h?.youtubeId && map.set(h.youtubeId, { day, kind: "hook" }));
  }
  return map;
}
function classify(v, map) {
  if (map.has(v.id)) return map.get(v.id);
  const m = /Day\s*(\d+)/i.exec(v.title ?? "");
  if (!m) return { day: null, kind: "other" };
  const t = v.title.toLowerCase();
  const kind = /#shorts/.test(t) ? "hook" : /landscape/.test(t) ? "landscape" : "vertical"; // fallback guess
  return { day: Number(m[1]), kind };
}

// ---- API access ----
async function accessToken() {
  const dir = join(homedir(), ".config", "ios-daily-english");
  const tokFile = join(dir, "analytics-token.json");
  if (!existsSync(tokFile) || !existsSync(join(dir, "client_secret.json"))) {
    console.error("No analytics token found. Run `node scripts/analytics-auth.mjs` once (approve in the browser), then retry.");
    process.exit(2);
  }
  const { client_id, client_secret, token_uri } = Object.values(JSON.parse(readFileSync(join(dir, "client_secret.json"), "utf8")))[0];
  const { refresh_token } = JSON.parse(readFileSync(tokFile, "utf8"));
  const r = await fetch(token_uri, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(`Could not refresh the analytics token (${j.error ?? r.status}). Re-run \`node scripts/analytics-auth.mjs\` (Testing-mode tokens expire after 7 days).`);
    process.exit(2);
  }
  return j.access_token;
}
async function api(token, url) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j.error?.message ?? r.statusText;
    console.error(`API error ${r.status}: ${msg}`);
    if (r.status === 403) console.error("Hint: enable 'YouTube Analytics API' and 'YouTube Data API v3' in the Google Cloud project, and re-run analytics-auth.mjs.");
    process.exit(1);
  }
  return j;
}
async function listVideos(token) {
  const ch = await api(token, "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true");
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) { console.error("No uploads playlist found for this account."); process.exit(1); }
  const ids = []; let page = "";
  do {
    const p = await api(token, `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${page}`);
    ids.push(...p.items.map((i) => i.contentDetails.videoId));
    page = p.nextPageToken ? `&pageToken=${p.nextPageToken}` : "";
  } while (page);
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const v = await api(token, `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${ids.slice(i, i + 50).join(",")}`);
    for (const x of v.items) out.push({ id: x.id, title: x.snippet.title, published: x.status?.publishAt ?? x.snippet.publishedAt, privacy: x.status?.privacyStatus });
  }
  return out;
}
const METRICS = "views,averageViewDuration,averageViewPercentage,subscribersGained";
async function fetchStats(token, start, end) {
  const q = (dims, extra = "") => `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start}&endDate=${end}&dimensions=${dims}${extra}`;
  const main = await api(token, q("video", `&metrics=${METRICS}&sort=-views&maxResults=200`));
  const src = await api(token, q("video,insightTrafficSourceType", `&metrics=views&sort=-views&maxResults=200`));
  const stats = new Map(), sources = new Map();
  for (const [id, views, avd, avp, subs] of main.rows ?? []) stats.set(id, { views, avd, avp, subs });
  for (const [id, type, views] of src.rows ?? []) { if (!sources.has(id)) sources.set(id, {}); sources.get(id)[type] = views; }
  return { stats, sources };
}

// ---- demo ----
function demo() {
  const videos = [
    { id: "d10", title: "Swift ... | Day 10", published: "2026-10-10T23:00:00Z" },
    { id: "d11", title: "Swift ... | Day 11", published: "2026-10-11T23:00:00Z" },
    { id: "d12", title: "Swift ... | Day 12", published: "2026-10-12T23:00:00Z" },
    { id: "d13l", title: "Swift lazy ... in English | Day 13", published: "2026-10-14T23:00:00Z" },
    { id: "d13h", title: "Why is fullName always correct? #Shorts | Day 13", published: "2026-10-15T23:00:00Z" },
  ];
  const map = new Map([["d10", { day: 10, kind: "vertical" }], ["d11", { day: 11, kind: "vertical" }], ["d12", { day: 12, kind: "vertical" }], ["d13l", { day: 13, kind: "landscape" }], ["d13h", { day: 13, kind: "hook" }]]);
  const stats = new Map([["d10", { views: 41, avd: 38, avp: 52.1, subs: 1 }], ["d11", { views: 35, avd: 41, avp: 55.0, subs: 0 }], ["d12", { views: 52, avd: 36, avp: 48.3, subs: 2 }], ["d13l", { views: 63, avd: 112, avp: 61.4, subs: 1 }], ["d13h", { views: 210, avd: 9, avp: 78.0, subs: 0 }]]);
  const sources = new Map([["d10", { SHORTS: 30, EXT_URL: 11 }], ["d11", { SHORTS: 28, SUBSCRIBER: 7 }], ["d12", { SHORTS: 40, YT_SEARCH: 12 }], ["d13l", { YT_SEARCH: 20, RELATED_VIDEO: 25, EXT_URL: 18 }], ["d13h", { SHORTS: 200, RELATED_VIDEO: 10 }]]);
  return { videos, map, stats, sources, start: "2026-09-25", end: "2026-10-22" };
}

// ---- main ----
let data;
if (flag("demo")) data = demo();
else {
  const token = await accessToken();
  const end = KST(new Date(Date.now() - 24 * 3600e3)); // data lags ~1-2 days; today is incomplete
  const start = KST(new Date(Date.now() - DAYS * 24 * 3600e3));
  const videos = await listVideos(token);
  const { stats, sources } = await fetchStats(token, start, end);
  data = { videos, map: loadMap(), stats, sources, start, end };
}
const rows = data.videos.map((v) => {
  const c = classify(v, data.map);
  const s = data.stats.get(v.id) ?? { views: 0, avd: 0, avp: 0, subs: 0 };
  return { day: c.day, kind: c.kind, id: v.id, published: (v.published ?? "").slice(0, 10), views: s.views, ctr: null, avd: s.avd, avp: s.avp, subs: s.subs, sources: data.sources.get(v.id) ?? {} };
}).filter((r) => ONLY_DAY == null || r.day === ONLY_DAY).sort((a, b) => (a.day ?? 1e9) - (b.day ?? 1e9) || a.kind.localeCompare(b.kind));

// per-kind aggregate (views-weighted averages)
const agg = {};
for (const r of rows) {
  const a = (agg[r.kind] ??= { videos: 0, views: 0, avdW: 0, avpW: 0, subs: 0, sources: {} });
  a.videos++; a.views += r.views; a.avdW += r.avd * r.views; a.avpW += r.avp * r.views; a.subs += r.subs;
  for (const [k, v] of Object.entries(r.sources)) a.sources[k] = (a.sources[k] ?? 0) + v;
}
const aggRows = Object.entries(agg).map(([kind, a]) => ({
  kind, videos: a.videos, views: a.views, avgViewsPerVideo: +(a.views / a.videos).toFixed(1),
  avd: a.views ? +(a.avdW / a.views).toFixed(1) : 0, avp: a.views ? +(a.avpW / a.views).toFixed(1) : 0, subs: a.subs, sources: a.sources,
}));

if (flag("csv")) {
  const path = val("csv");
  if (!path) { console.error("--csv needs a path"); process.exit(1); }
  const lines = ["day,kind,videoId,published,views,ctr,avgViewDurationSec,avgViewPercentage,subscribersGained,sources"];
  for (const r of rows) lines.push([r.day ?? "", r.kind, r.id, r.published, r.views, "", r.avd, r.avp, r.subs, `"${Object.entries(r.sources).map(([k, v]) => `${k}:${v}`).join(" ")}"`].join(","));
  writeFileSync(path, lines.join("\n") + "\n");
  console.log("wrote " + path);
}
if (flag("json")) {
  console.log(JSON.stringify({ range: { start: data.start, end: data.end }, note: "ctr/impressions not available via API; read from Studio", rows, byKind: aggRows }, null, 2));
  process.exit(0);
}
const pad = (s, n) => String(s).padEnd(n), num = (s, n) => String(s).padStart(n);
console.log(`Range ${data.start}..${data.end}${flag("demo") ? "  [DEMO DATA]" : ""}`);
console.log(`${pad("day", 4)} ${pad("kind", 10)} ${pad("published", 10)} ${num("views", 6)} ${num("CTR", 5)} ${num("avgDur(s)", 9)} ${num("avg%", 6)} ${num("subs", 5)}  top sources`);
for (const r of rows) {
  const top = Object.entries(r.sources).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`${pad(r.day ?? "-", 4)} ${pad(r.kind, 10)} ${pad(r.published, 10)} ${num(r.views, 6)} ${num("n/a", 5)} ${num(r.avd, 9)} ${num(r.avp, 6)} ${num(r.subs, 5)}  ${top}`);
}
console.log("\nPer kind (duration/% weighted by views)");
console.log(`${pad("kind", 10)} ${num("videos", 6)} ${num("views", 6)} ${num("views/vid", 9)} ${num("avgDur(s)", 9)} ${num("avg%", 6)} ${num("subs", 5)}  sources`);
for (const a of aggRows) {
  const top = Object.entries(a.sources).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`${pad(a.kind, 10)} ${num(a.videos, 6)} ${num(a.views, 6)} ${num(a.avgViewsPerVideo, 9)} ${num(a.avd, 9)} ${num(a.avp, 6)} ${num(a.subs, 5)}  ${top}`);
}
console.log("\nCTR/impressions: not exposed by the API; copy them from YouTube Studio > Analytics > Reach into the report by hand.");
