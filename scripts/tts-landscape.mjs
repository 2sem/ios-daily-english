#!/usr/bin/env node
// Multi-voice clips for the landscape long-form video and its vertical hook shorts (edge-tts, cached per clip).
//   node scripts/tts-landscape.mjs content/days/day-013.json [--extra extra.json] [--tag -test] [--only d01,d02] [--force]
// Writes video/audio/day-NNN-landscape<tag>/<key>.mp3 (cache) and <key>.wav (silence-trimmed).
// Keys: cold-hook cold-intro cold-preview, tN-term/def/ex/ex2, dNN (dialogue line, spoken by its own speaker voice),
// replay-intro, rNN (replay line with the terms replaced by the word "blank"), quiz-intro, qN-q, outro,
// hookK-lJ / hookK-slow / hookK-end (vertical hooks). Quiz options are never spoken.
// Does not write to the day JSON.
import { mkdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { loadDay, voicesFor, buildClips, edgeClip, opt, flag } from "./lib/landscape.mjs";

const { day, paths } = loadDay();
const voices = voicesFor(day);
const clips = buildClips(day, voices);
mkdirSync(paths.audioDir, { recursive: true });
const only = opt("only", null)?.split(",");
const force = flag("force");
const trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05";
let n = 0;
for (const [key, c] of Object.entries(clips)) {
  if (only && !only.includes(key)) continue;
  const mp3 = join(paths.audioDir, `${key}.mp3`);
  if (force || !existsSync(mp3) || statSync(mp3).size === 0) edgeClip(c.voice, c.rate, c.text, mp3);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-af", `${trim},areverse,${trim},areverse`, "-ar", "44100", "-ac", "1", join(paths.audioDir, `${key}.wav`)]);
  n++;
}
console.log(`wrote ${n} clips to ${paths.audioDir}`);
console.log(`voices: narrator ${voices.narrator}, example ${voices.example}, slow ${voices.exampleSlow}, speakers ${JSON.stringify(voices.speakers)}`);
