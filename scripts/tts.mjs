#!/usr/bin/env node
// Text-to-speech clips for a day, using macOS `say` + ffmpeg (offline, no packages, no API keys).
//   node scripts/tts.mjs content/days/day-001.json [--voice Samantha] [--rate 135] [--example-voice "Reed (영어(미국))"] [--example-rate 140]
// Two voices: a narrator (term, definition, quiz) and a second voice for the example sentence, so it sounds like
// a teammate saying it.
// Writes video/audio/day-NNN/<key>.wav; keys match scripts/timing.mjs (intro, t1-term, t1-def, t1-ex, q1-q, ...).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { pickVoices } from "./voices.mjs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const file = argv.find((a) => a.endsWith(".json"));
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
if (!file) { console.error("usage: tts.mjs <day.json> [--voice Samantha] [--rate 155]"); process.exit(1); }

const day = JSON.parse(readFileSync(resolve(file), "utf8"));
// voices rotate by day (scripts/voices.mjs); a day's choice is saved in its JSON so re-renders match
const saved = day.video?.voices ?? pickVoices(day.day);
const voice = opt("voice", saved.narrator);
const rate = opt("rate", "135"); // words per minute; slower than natural speech (~160) for learners
const exVoice = opt("example-voice", saved.example);
const exRate = opt("example-rate", "140");
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
  // the answer options are never spoken: viewers read them on screen
});
// say reads "let" and "var" fine; spell out how Swift names are spoken
const speakable = (s) => s.replace(/\biOS\b/g, "eye O S").replace(/\bSwiftUI\b/g, "Swift U I");

for (const [key, text] of Object.entries(clips)) {
  const aiff = join(dir, `${key}.aiff`);
  const isExample = /^t\d-ex$/.test(key);
  // short pauses at commas so a definition can be followed
  const spoken = speakable(text).replace(/, /g, ", [[slnc 220]] ");
  execFileSync("say", ["-v", isExample ? exVoice : voice, "-r", isExample ? exRate : rate, "-o", aiff, spoken]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", aiff, "-ar", "44100", "-ac", "1", join(dir, `${key}.wav`)]);
  rmSync(aiff);
}
if (!day.video?.voices) {
  day.video = { ...(day.video ?? {}), voices: { narrator: voice, example: exVoice, pattern: saved.pattern } };
  writeFileSync(resolve(file), JSON.stringify(day, null, 2) + "\n");
}
console.log(`wrote ${Object.keys(clips).length} clips to ${dir} (narrator ${voice} ${rate} wpm, examples ${exVoice} ${exRate} wpm)`);
