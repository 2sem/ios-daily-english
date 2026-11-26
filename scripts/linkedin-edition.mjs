#!/usr/bin/env node
// Prepares one LinkedIn newsletter edition for a day: title, body blocks and the media files (English only, no digit-dot numbering).
//   node scripts/linkedin-edition.mjs content/days/day-003.json [--no-media] [--package]
// --package: also writes ~/Downloads/linkedin-editions/dayNNN/ (title, body .txt/.html, feed post text, thumbnail, video).
// Prints JSON { title, blocks[], files{} }. blocks: {type:"p"|"h2"|"ul", text|items[]}.
// Media: full video + LinkedIn thumbnail (built here with thumbnail.mjs --linkedin) copied to ~/Downloads (the owner attaches them), and a small review cover
// video/out/dayNNN-linkedin-small.mp4 (720p, under 9.5 MB, because the browser file-upload tool caps at 10 MB).
import { readFileSync, copyFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const jsonPath = resolve(process.argv[2] ?? "");
if (!existsSync(jsonPath)) { console.error("usage: linkedin-edition.mjs content/days/day-NNN.json"); process.exit(1); }
const day = JSON.parse(readFileSync(jsonPath, "utf8"));
const root = resolve(jsonPath, "..", "..", "..");
const n3 = String(day.day).padStart(3, "0");
const names = day.terms.map((t) => t.term);
const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
const D = day.dialogue;
const sp = Object.fromEntries((D?.speakers ?? []).map((s) => [s.id, s.name]));

const title = `Day ${day.day} · ${list} in English`;
const theme = (day.theme ?? "").replace(/^\d+ terms on /, "");
const blocks = [
  { type: "p", text: `Today's ${names.length} terms: ${theme}. ${D ? `Watch ${sp.A} and ${sp.B} in a chat-style code review: ${/[.?!]$/.test(D.title) ? D.title : D.title + "."} ` : ""}(5 minutes, Swift code on screen).` },
  ...day.terms.flatMap((t, i) => [
    { type: "h2", text: t.term }, // bare term, no "Term N:" prefix (owner preference)
    { type: "ul", items: [t.definition, `"${t.example}"`] },
  ]),
  { type: "p", text: "Your turn: say each example out loud after the video, then try the 3-question quiz at the end. Comment your answers (1/2/3), I reply to every comment!" },
];

// Share text shown above the edition in the feed ("인맥에게 뉴스레터 소개…").
const hookLine = D?.title ?? day.thumbnailHook ?? "";
const post = [
  `Day ${day.day} of iOS Daily English is out 📱`,
  "",
  ...(hookLine ? [hookLine, ""] : []),
  `Today: ${list}. A 5-minute chat-style code review with real Swift on screen, so you learn the words the way teammates actually use them.`,
  "",
  "Watch it, say each example out loud, then drop your quiz answers (1/2/3) in the comments. I reply to every one.",
  "",
  "#Swift #iOSDevelopment #EnglishForDevelopers #CodeReview",
].join("\n");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const bodyText = blocks.map((b) => (b.type === "ul" ? b.items.map((i) => `- ${i}`).join("\n") : b.text)).join("\n\n");
const bodyHtml = `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:17px/1.5 -apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px}.hint{color:#888;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:12px}</style>
<p class="hint">Click inside the text below, Cmd+A, Cmd+C, then paste into the LinkedIn body. Headings and bullets carry over.</p>
<div contenteditable="true">
${blocks.map((b) => (b.type === "ul" ? `<ul>${b.items.map((i) => `<li>${rich(i)}</li>`).join("")}</ul>` : `<${b.type}>${rich(b.text)}</${b.type}>`)).join("\n")}
</div>`;

const out = { title, blocks, post, files: {} };
if (!process.argv.includes("--no-media")) {
  const video = join(root, "video/out", `day${n3}-landscape.mp4`), thumb = join(root, "video/out", `day-${n3}-thumb-linkedin.png`);
  execFileSync("node", [join(root, "scripts/thumbnail.mjs"), jsonPath, "--linkedin"], { stdio: "ignore" });
  for (const f of [video, thumb]) if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(1); }
  const dl = join(homedir(), "Downloads");
  copyFileSync(video, join(dl, `day${n3}-landscape.mp4`)); copyFileSync(thumb, join(dl, `day${n3}-thumb-linkedin.png`));
  const small = join(root, "video/out", `day${n3}-linkedin-small.mp4`);
  const dur = Number(String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video])).trim());
  const kbps = Math.floor((9.3 * 8192) / dur) - 56; // total budget under ~9.5 MB, minus 48k audio and overhead
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", video, "-vf", "scale=1280:720", "-c:v", "libx264", "-preset", "slow", "-b:v", `${kbps}k`, "-maxrate", `${Math.round(kbps * 1.4)}k`, "-bufsize", `${kbps * 3}k`, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "48k", "-ac", "1", "-movflags", "+faststart", small]);
  out.files = { fullVideo: join(dl, `day${n3}-landscape.mp4`), thumbnail: join(dl, `day${n3}-thumb-linkedin.png`), smallCover: small, smallMB: +(statSync(small).size / 1048576).toFixed(1), thumbForUpload: thumb };
}
if (process.argv.includes("--package")) {
  // One folder per day with everything needed to schedule the edition by hand in a couple of minutes.
  const pkg = join(homedir(), "Downloads", "linkedin-editions", `day${n3}`);
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, "1-title.txt"), title + "\n");
  writeFileSync(join(pkg, "2-body.txt"), bodyText + "\n");
  writeFileSync(join(pkg, "2-body.html"), bodyHtml);
  writeFileSync(join(pkg, "3-post.txt"), post + "\n");
  const thumb = join(root, "video/out", `day-${n3}-thumb-linkedin.png`), video = join(root, "video/out", `day${n3}-landscape.mp4`);
  if (!existsSync(thumb)) execFileSync("node", [join(root, "scripts/thumbnail.mjs"), jsonPath, "--linkedin"], { stdio: "ignore" });
  copyFileSync(thumb, join(pkg, "cover-thumbnail.png"));
  if (existsSync(video)) copyFileSync(video, join(pkg, "cover-video.mp4"));
  out.package = pkg;
}
console.log(JSON.stringify(out, null, 2));
