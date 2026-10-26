#!/usr/bin/env node
// Prepares one LinkedIn newsletter edition for a day: title, body blocks and the media files (English only, no digit-dot numbering).
//   node scripts/linkedin-edition.mjs content/days/day-003.json [--no-media]
// Prints JSON { title, blocks[], files{} }. blocks: {type:"p"|"h2"|"ul", text|items[]}.
// Media: full video + landscape thumbnail copied to ~/Downloads (the owner attaches them), and a small review cover
// video/out/dayNNN-linkedin-small.mp4 (720p, under 9.5 MB, because the browser file-upload tool caps at 10 MB).
import { readFileSync, copyFileSync, existsSync, statSync } from "node:fs";
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
  { type: "p", text: `Today's ${names.length} terms: ${theme}. ${D ? `Watch ${sp.A} and ${sp.B} in a chat-style code review: ${D.title}. ` : ""}(5 minutes, Swift code on screen).` },
  ...day.terms.flatMap((t, i) => [
    { type: "h2", text: `Term ${i + 1}: ${t.term}` }, // never "1. Term": LinkedIn turns digit-dot lines into a numbered list
    { type: "ul", items: [t.definition, `"${t.example}"`] },
  ]),
  { type: "p", text: "Your turn: say each example out loud after the video, then try the 3-question quiz at the end. Comment your answers (1/2/3), I reply to every comment!" },
];

const out = { title, blocks, files: {} };
if (!process.argv.includes("--no-media")) {
  const video = join(root, "video/out", `day${n3}-landscape.mp4`), thumb = join(root, "video/out", `day-${n3}-thumb-landscape.png`);
  for (const f of [video, thumb]) if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(1); }
  const dl = join(homedir(), "Downloads");
  copyFileSync(video, join(dl, `day${n3}-landscape.mp4`)); copyFileSync(thumb, join(dl, `day${n3}-thumb-landscape.png`));
  const small = join(root, "video/out", `day${n3}-linkedin-small.mp4`);
  const dur = Number(String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video])).trim());
  const kbps = Math.floor((9.3 * 8192) / dur) - 56; // total budget under ~9.5 MB, minus 48k audio and overhead
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", video, "-vf", "scale=1280:720", "-c:v", "libx264", "-preset", "slow", "-b:v", `${kbps}k`, "-maxrate", `${Math.round(kbps * 1.4)}k`, "-bufsize", `${kbps * 3}k`, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "48k", "-ac", "1", "-movflags", "+faststart", small]);
  out.files = { fullVideo: join(dl, `day${n3}-landscape.mp4`), thumbnail: join(dl, `day${n3}-thumb-landscape.png`), smallCover: small, smallMB: +(statSync(small).size / 1048576).toFixed(1), thumbForUpload: thumb };
}
console.log(JSON.stringify(out, null, 2));
