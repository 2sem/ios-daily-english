#!/usr/bin/env node
// Text-to-speech clips for a day, using macOS `say` + ffmpeg (offline, no packages, no API keys).
//   node scripts/tts.mjs content/days/day-001.json [--voice Samantha] [--rate 155]
// Writes video/audio/day-NNN/<key>.wav; keys match scripts/timing.mjs (intro, t1-term, t1-def, t1-ex, q1-q, ...).
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const file = argv.find((a) => a.endsWith(".json"));
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
if (!file) { console.error("usage: tts.mjs <day.json> [--voice Samantha] [--rate 155]"); process.exit(1); }

const day = JSON.parse(readFileSync(resolve(file), "utf8"));
const voice = opt("voice", "Samantha");
const rate = opt("rate", "155"); // words per minute
const dir = join(root, "video", "audio", `day-${String(day.day).padStart(3, "0")}`);
mkdirSync(dir, { recursive: true });

const clips = { intro: `iOS Daily English. Day ${day.day}.`, "quiz-intro": "Quiz time. Three questions.", outro: "Not sure? Watch it again." };
day.terms.forEach((t, i) => {
  clips[`t${i + 1}-term`] = t.term;
  clips[`t${i + 1}-def`] = t.definition;
  clips[`t${i + 1}-ex`] = t.example;
});
day.quizzes.forEach((q, i) => {
  clips[`q${i + 1}-q`] = q.question;
  clips[`q${i + 1}-opts`] = q.options.map((o, j) => `${"abc"[j]}. ${o}.`).join(" ");
});
// say reads "let" and "var" fine; spell out how Swift names are spoken
const speakable = (s) => s.replace(/\biOS\b/g, "eye O S").replace(/\bSwiftUI\b/g, "Swift U I");

for (const [key, text] of Object.entries(clips)) {
  const aiff = join(dir, `${key}.aiff`);
  execFileSync("say", ["-v", voice, "-r", rate, "-o", aiff, speakable(text)]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", aiff, "-ar", "44100", "-ac", "1", join(dir, `${key}.wav`)]);
  rmSync(aiff);
}
console.log(`wrote ${Object.keys(clips).length} clips to ${dir} (voice ${voice}, ${rate} wpm)`);
