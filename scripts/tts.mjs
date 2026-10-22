#!/usr/bin/env node
// Text-to-speech clips for a day. Default engine: edge-tts (Microsoft neural voices, needs internet, no API key).
// Offline fallback: macOS `say` (--engine say). No npm packages either way.
//   node scripts/tts.mjs content/days/day-001.json [--engine edge|say] [--voice en-US-AvaNeural] [--rate 135]
//     [--example-voice en-US-GuyNeural] [--example-rate 160] [--only hook,outro-cta] [--force]
// Rates are words per minute for both engines (edge: converted to a % of its ~200 wpm default, see EDGE_BASE_WPM).
// Two voices: a narrator (term, definition, quiz) and a second voice for the example sentence, so it sounds like
// a teammate saying it.
// Writes video/audio/day-NNN/<key>.wav; the edge engine also keeps <key>.mp3 and reuses it on re-runs (use --force
// to regenerate) so a re-render never calls the service again. Keys match scripts/timing.mjs (intro, t1-term, t1-def, t1-ex, q1-q, ...).
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, statSync, existsSync } from "node:fs";
import { pickVoices } from "./voices.mjs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const file = argv.find((a) => a.endsWith(".json"));
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
if (!file) { console.error("usage: tts.mjs <day.json> [--engine edge|say] [--voice en-US-AvaNeural] [--rate 135]"); process.exit(1); }

const day = JSON.parse(readFileSync(resolve(file), "utf8"));
// voices rotate by day (scripts/voices.mjs); a day's choice is saved in its JSON so re-renders match
const engine = opt("engine", "edge");
if (!["edge", "say"].includes(engine)) { console.error("--engine must be edge or say"); process.exit(1); }
const force = argv.includes("--force");
// saved voices from a different engine (older days used `say`) are replaced by this engine's rotation
const saved = day.video?.voices && (day.video.voices.engine ?? "say") === engine ? day.video.voices : pickVoices(day.day, engine);
const voice = opt("voice", saved.narrator);
const rate = opt("rate", "135"); // words per minute; slower than natural speech (~160) for learners
const exVoice = opt("example-voice", saved.example);
const exRate = opt("example-rate", "160"); // first reading: natural speed
const exSlowVoice = opt("example-slow-voice", saved.exampleSlow ?? voice); // the narrator repeats it slowly, like a teacher
const exSlowRate = opt("example-slow-rate", "100"); // second reading: slow, word by word
const dir = join(root, "video", "audio", `day-${String(day.day).padStart(3, "0")}`);
mkdirSync(dir, { recursive: true });

const clips = { intro: `iOS Daily English. Day ${day.day}.`, "quiz-intro": "Quiz time. Three questions.", outro: "Not sure? Watch it again." };
day.terms.forEach((t, i) => {
  clips[`t${i + 1}-term`] = t.term;
  clips[`t${i + 1}-def`] = t.definition;
  clips[`t${i + 1}-ex`] = t.example;
  clips[`t${i + 1}-ex2`] = t.example; // same sentence again, slowly
});
// short format (video.cutQuizIndex set): cold-open hook and CTA outro replace intro, quiz-intro and outro
const short = day.video?.cutQuizIndex !== undefined;
if (short) {
  delete clips.intro; delete clips["quiz-intro"]; delete clips.outro;
  clips.hook = day.video.hook;
  clips["outro-cta"] = "Comment your answer. I reply to every comment.";
}
day.quizzes.forEach((q, i) => {
  if (short && i !== day.video.cutQuizIndex) return;
  clips[`q${i + 1}-q`] = q.question;
  // the answer options are never spoken: viewers read them on screen
});
// edge-tts is fed the text as written (no phonetic respelling). `say` needs Swift names spelled out.
const sayText = (s) => s.replace(/\biOS\b/g, "eye O S").replace(/\bSwiftUI\b/g, "Swift U I");
const EDGE_BASE_WPM = 200; // approximate default pace of the en-US neural voices; rate % = wpm / base - 1
const edgeRate = (wpm) => `${Math.round((Number(wpm) / EDGE_BASE_WPM - 1) * 100)}%`.replace(/^(\d)/, "+$1");
function edgeClip(voiceName, wpm, text, mp3) {
  let err;
  const tmp = `${mp3}.part`; // never leave an empty or half-written mp3 in the cache
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500 * attempt); // back off: the service rejects bursts
    try {
      execFileSync("edge-tts", ["--voice", voiceName, `--rate=${edgeRate(wpm)}`, "--text", text, "--write-media", tmp], { stdio: "pipe" });
      if (statSync(tmp).size > 0) { renameSync(tmp, mp3); return; }
    } catch (e) { err = e; }
  }
  rmSync(tmp, { force: true });
  console.error(`edge-tts failed for "${text.slice(0, 40)}": ${err?.stderr?.toString().trim().split('\n').pop() || err?.message}\nOffline? Re-run with --engine say.`);
  process.exit(1);
}

const only = opt("only", null)?.split(","); // e.g. --only hook,outro-cta renders just those clips
for (const [key, text] of Object.entries(clips)) {
  if (only && !only.includes(key)) continue;
  const isExample = /^t\d-ex2?$/.test(key);
  const slow = /^t\d-ex2$/.test(key);
  const v = slow ? exSlowVoice : isExample ? exVoice : voice;
  const r = slow ? exSlowRate : isExample ? exRate : rate;
  const wav = join(dir, `${key}.wav`);
  if (engine === "edge") {
    const mp3 = join(dir, `${key}.mp3`);
    if (force || !existsSync(mp3) || statSync(mp3).size === 0) edgeClip(v, r, text, mp3);
    // edge-tts pads ~0.5 s of silence at both ends; trim it so scene timing matches `say` clips (the mp3 stays untouched)
    const trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05";
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-af", `${trim},areverse,${trim},areverse`, "-ar", "44100", "-ac", "1", wav]);
  } else {
    const aiff = join(dir, `${key}.aiff`);
    // short pauses at commas so a definition can be followed
    execFileSync("say", ["-v", v, "-r", r, "-o", aiff, sayText(text).replace(/, /g, ", [[slnc 220]] ")]);
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", aiff, "-ar", "44100", "-ac", "1", wav]);
    rmSync(aiff);
  }
}
if (day.video?.voices !== saved) {
  day.video = { ...(day.video ?? {}), voices: { narrator: voice, example: exVoice, exampleSlow: exSlowVoice, pattern: saved.pattern, engine } };
  writeFileSync(resolve(file), JSON.stringify(day, null, 2) + "\n");
}
console.log(`wrote ${Object.keys(clips).length} clips to ${dir} (${engine}: narrator ${voice} ${rate} wpm, examples ${exVoice} ${exRate} wpm, then ${exSlowVoice} ${exSlowRate} wpm)`);
