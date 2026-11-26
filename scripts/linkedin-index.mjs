// Builds linkedin-editions/index.html: one row per packaged day with a suggested 07:00 KST slot.
// Day 34 is scheduled for Fri 2026-11-27 07:00, so Day N goes out on 2026-11-27 + (N - 34) days.
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "linkedin-editions");
const days = readdirSync(root).filter((d) => /^day\d{3}$/.test(d)).sort();
const base = Date.UTC(2026, 10, 27);
const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rows = days.map((d) => {
  const n = Number(d.slice(3));
  const dt = new Date(base + (n - 34) * 86400000);
  const date = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")} ${wd[dt.getUTCDay()]} 07:00`;
  const title = readFileSync(join(root, d, "1-title.txt"), "utf8").trim();
  const video = existsSync(join(root, d, "cover-video.mp4"));
  return `<tr><td>${n}</td><td>${date}</td><td><img src="${d}/cover-thumbnail.png"></td><td><b>${esc(title)}</b><br>
<a href="${d}/2-body.html">body (copy rich)</a> · <a href="${d}/2-body.txt">body.txt</a> · <a href="${d}/3-post.txt">post text</a> · ${video ? `<a href="${d}/cover-video.mp4">video</a>` : "<i>no video yet</i>"}</td></tr>`;
});
writeFileSync(join(root, "index.html"), `<!doctype html><meta charset="utf-8"><title>iOS Daily English — LinkedIn editions</title>
<style>body{font:15px/1.45 -apple-system,sans-serif;margin:32px}table{border-collapse:collapse}td{border-bottom:1px solid #ddd;padding:10px;vertical-align:top}img{width:240px;border-radius:6px}ol{max-width:760px}</style>
<h1>iOS Daily English — LinkedIn editions</h1>
<p>Each morning, in LinkedIn: <b>글쓰기</b> (new edition) →</p>
<ol>
<li>Cover: upload <code>cover-video.mp4</code>, then add <code>cover-thumbnail.png</code> as its thumbnail.</li>
<li>Title: paste <code>1-title.txt</code>.</li>
<li>Body: open <code>2-body.html</code>, click the text, Cmd+A, Cmd+C, paste. Headings and bullets carry over. (The <code>2-body.txt</code> version needs headings set by hand.)</li>
<li>다음 → paste <code>3-post.txt</code> into the share box → 발행, or use the clock icon to schedule it.</li>
</ol>
<table>${rows.join("\n")}</table>`);
console.log(`${days.length} days -> ${join(root, "index.html")}`);
