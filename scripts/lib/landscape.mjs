// Shared helpers for the landscape long-form pilot and the vertical hook clips:
//   scripts/tts-landscape.mjs, scripts/timing-landscape.mjs, scripts/scaffold-landscape.mjs, scripts/scaffold-hooks.mjs
import { readFileSync, existsSync, mkdirSync, statSync, renameSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pickVoices } from "../voices.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const argv = process.argv.slice(2);
export const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
export const flag = (n) => argv.includes(`--${n}`);
export const r1 = (n) => Math.round(n * 10) / 10;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Loads the day JSON. `--extra file.json` is shallow-merged over it (used to test the format with a stub dialogue
// without touching the real day file). `--tag -test` keeps test outputs in separate dirs.
export function loadDay() {
  const file = argv.find((a) => a.endsWith(".json") && a !== opt("extra") && a !== opt("timing"));
  if (!file) { console.error("usage: <script> content/days/day-NNN.json [--extra extra.json] [--tag -test]"); process.exit(1); }
  let day = JSON.parse(readFileSync(resolve(file), "utf8"));
  const extra = opt("extra", null);
  if (extra) {
    // top-level keys replace the day's; `terms` entries are merged per index, so an extra file can add just `code`
    const x = JSON.parse(readFileSync(resolve(extra), "utf8"));
    const terms = x.terms ? day.terms.map((t, i) => ({ ...t, ...(x.terms[i] ?? {}) })) : day.terms;
    day = { ...day, ...x, terms };
  }
  const pad = String(day.day).padStart(3, "0");
  const tag = opt("tag", "");
  const paths = {
    pad, tag,
    audioDir: join(root, "video", "audio", `day-${pad}-landscape${tag}`),
    outDir: join(root, "video", `day${pad}-landscape${tag}`),
    timing: join(root, "video", "out", `day-${pad}.landscape${tag}.timing.json`),
    voiceover: join(root, "video", "out", `day-${pad}.landscape${tag}.voiceover.txt`),
  };
  return { day, paths };
}

// Speaker voices: from dialogue.speakers[].voice when it is an edge-tts voice, otherwise a distinct default pair.
const DEFAULT_SPEAKERS = ["en-US-AvaNeural", "en-US-AndrewNeural"];
export function voicesFor(day) {
  const base = pickVoices(day.day, "edge");
  const speakers = {};
  (day.dialogue?.speakers ?? []).forEach((s, i) => {
    const ok = /^[a-z]{2}-[A-Z]{2}-\w+Neural$/.test(s.voice ?? "");
    speakers[s.id] = ok ? s.voice : DEFAULT_SPEAKERS[i % 2];
  });
  if (speakers.A && speakers.A === speakers.B) speakers.B = DEFAULT_SPEAKERS.find((v) => v !== speakers.A);
  // The landscape video uses voices that are not dialogue speakers: a deep narrator and a separate example voice
  // (the vertical Shorts keep their rotation from scripts/voices.mjs). Override with day.video.landscapeVoices.
  const taken = new Set(Object.values(speakers));
  const pick = (pool, fallback) => pool.find((v) => !taken.has(v)) ?? fallback;
  const narrator = day.video?.landscapeVoices?.narrator ?? pick(["en-US-ChristopherNeural", "en-US-GuyNeural", "en-US-RogerNeural", "en-US-BrianNeural"], base.narrator);
  const example = day.video?.landscapeVoices?.example ?? pick(["en-US-JennyNeural", "en-US-AriaNeural", "en-US-MichelleNeural"], base.example);
  return { narrator, example, exampleSlow: narrator, speakers };
}

const termMatchers = (terms) =>
  [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length)
    .map((t) => ({ t, re: new RegExp(`(?<![\\w-])(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\w-])`, "gi") }));

// index of a term in day.terms (for its colour), 0 if it is not one of the day's three
const colorOf = (day, t) => Math.max(0, day.terms.findIndex((x) => x.term.toLowerCase() === t.toLowerCase()));

// Swift names inside a sentence (`backticked` words, types, keywords, camelCase, foo()) are shown as inline code, in a neutral style: only the day's terms get a colour.
const CODE_RE = /`[^`\n]+`|(?<![\w`])(?:Int|Double|Float|Bool|String|Character|Array|Dictionary|Void|URL|nil|var|func|struct|enum|protocol|extension|guard|init|print|let(?!\s+(?:me|us|you|him|her|them|it|the)\b))(?![\w])|\b[a-z]+(?:[A-Z][a-z0-9]+)+\b|\b\w+\(\)/g;
export function codify(text) {
  let out = "", i = 0;
  for (const m of text.matchAll(CODE_RE)) { out += esc(text.slice(i, m.index)) + `<span class="cd">${esc(m[0].replace(/^`|`$/g, ""))}</span>`; i = m.index + m[0].length; }
  return out + esc(text.slice(i));
}

// mode "plain": highlighted term spans; "blank": spans holding a blank and the hidden term (revealed by the timeline).
export function renderLine(day, line, mode = "plain") {
  const ms = termMatchers(line.terms ?? []);
  // tokenise so overlapping terms cannot double-wrap
  const spans = [];
  for (const m of ms) {
    for (const x of line.text.matchAll(m.re)) {
      const a = x.index, b = a + x[0].length;
      if (!spans.some((s) => a < s.b && b > s.a)) spans.push({ a, b, word: x[0], t: m.t });
    }
  }
  spans.sort((p, q) => p.a - q.a);
  let out = "", i = 0;
  for (const s of spans) {
    out += codify(line.text.slice(i, s.a));
    const c = colorOf(day, s.t);
    let el = mode === "blank"
      ? `<span class="tm c${c} bk"><span class="bl">${"_".repeat(Math.max(4, Math.min(10, s.word.length)))}</span><span class="rv">${esc(s.word)}</span></span>`
      : `<span class="tm c${c}">${esc(s.word)}</span>`;
    i = s.b;
    // keep trailing punctuation glued to the term/blank so it never wraps onto a line of its own
    const tail = line.text.slice(i).match(/^[.,!?;:)"']+/)?.[0] ?? "";
    if (tail) { el = `<span class="nb">${el}${esc(tail)}</span>`; i += tail.length; }
    out += el;
  }
  return out + codify(line.text.slice(i));
}

// lines used in the "Fill in the blank" replay: lines that have terms (the replay speaks them whole; the blank is only on screen), trimmed to max (default 3) while keeping every term covered
export function replayPicks(day, max = Number(opt("replay-max", 3))) {
  const lines = day.dialogue?.lines ?? [];
  const withTerms = lines.map((l, i) => ({ l, i })).filter(({ l }) => (l.terms ?? []).length);
  if (withTerms.length <= max) return withTerms.map(({ i }) => i);
  const picked = new Set();
  for (const t of day.terms) {
    const hit = withTerms.find(({ l }) => (l.terms ?? []).some((x) => x.toLowerCase() === t.term.toLowerCase()) && !picked.has(l));
    if (hit) picked.add(hit.i);
  }
  for (const { i } of withTerms) if (picked.size < max) picked.add(i);
  return [...picked].sort((a, b) => a - b);
}

// Cold-open line: video.landscape.hook, else video.hook, else a generic question naming the terms.
export function coldHook(day) {
  const n = day.terms.map((t) => t.term);
  return day.video?.landscape?.hook ?? day.video?.hook ?? `Can you explain ${n.slice(0, -1).join(", ")} and ${n.at(-1)} in English?`;
}
const two = (n) => String(n + 1).padStart(2, "0");
export const dKey = (i) => `d${two(i)}`;

// Every clip of a landscape video and of its hook shorts: key -> { text, voice, rate }
export function buildClips(day, voices) {
  const R = { narrator: 170, example: 175, slow: 100, dialogue: 180 };
  const clips = {};
  const add = (key, text, voice, rate) => (clips[key] = { text: text.replaceAll("`", ""), voice, rate });
  const names = day.terms.map((t) => t.term);
  add("cold-hook", coldHook(day), voices.narrator, R.narrator);
  add("cold-intro", `iOS Daily English. Day ${day.day}.`, voices.narrator, R.narrator);
  add("cold-preview", `Today: ${names.slice(0, -1).join(", ")} and ${names.at(-1)}. Then a short conversation, and a quiz.`, voices.narrator, R.narrator);
  day.terms.forEach((t, i) => {
    add(`t${i + 1}-term`, t.term, voices.narrator, R.narrator);
    add(`t${i + 1}-def`, t.definition, voices.narrator, R.narrator);
    add(`t${i + 1}-ex`, t.example, voices.speakers.B ?? voices.narrator, R.example); // male voice
    add(`t${i + 1}-ex2`, t.example, voices.example, R.example); // female voice (the male one is -ex), words lit one by one
    add(`t${i + 1}-turn`, "Now your turn.", voices.narrator, R.narrator);
  });
  (day.dialogue?.lines ?? []).forEach((l, i) => add(dKey(i), l.text, voices.speakers[l.speaker] ?? voices.narrator, R.dialogue));
  add("replay-intro", "Now you. Say the missing words.", voices.narrator, R.narrator); // the replay lines reuse the conversation clips dNN
  add("quiz-intro", "Quiz time. Three questions.", voices.narrator, R.narrator);
  day.quizzes.forEach((q, i) => add(`q${i + 1}-q`, q.question, voices.narrator, R.narrator)); // options are never spoken
  add("outro", "That's all for today. Not sure about the quiz? Watch it again. See you tomorrow.", voices.narrator, R.narrator);
  (day.hooks ?? []).forEach((h, k) => {
    const n = k + 1;
    h.lines.forEach((l, j) => add(`hook${n}-l${j + 1}`, l.text, l.speaker ? (voices.speakers[l.speaker] ?? voices.narrator) : voices.speakers.A ?? voices.example, h.type === "one-line-example" ? R.example : R.dialogue));
    if (h.type === "one-line-example") add(`hook${n}-slow`, h.lines[0].text, voices.exampleSlow, R.slow);
    add(`hook${n}-end`, "Full conversation on the channel.", voices.narrator, R.narrator);
  });
  return clips;
}

const EDGE_BASE_WPM = 200;
const edgeRate = (wpm) => `${Math.round((Number(wpm) / EDGE_BASE_WPM - 1) * 100)}%`.replace(/^(\d)/, "+$1");
export function edgeClip(voice, wpm, text, mp3) {
  let err;
  const tmp = `${mp3}.part`;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500 * attempt);
    try {
      execFileSync("edge-tts", ["--voice", voice, `--rate=${edgeRate(wpm)}`, "--text", text, "--write-media", tmp], { stdio: "pipe" });
      if (statSync(tmp).size > 0) { renameSync(tmp, mp3); return; }
    } catch (e) { err = e; }
  }
  rmSync(tmp, { force: true });
  console.error(`edge-tts failed for "${text.slice(0, 40)}": ${err?.stderr?.toString().trim().split("\n").pop() || err?.message}`);
  process.exit(1);
}

export function clipDurations(dir) {
  const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".wav")) continue;
    out[f.replace(/\.wav$/, "")] = Number(String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(dir, f)])).trim());
  }
  return out;
}

// plain-text Swift highlighter for the code panel (same classes as the vertical template)
const KW = new Set("func let var struct class enum protocol extension import return if else guard switch case default for in while do catch try throw throws rethrows async await self nil true false init private public static some any where as is defer".split(" "));
export function highlightSwift(line) {
  const ci = line.search(/\/\//);
  const code = ci >= 0 ? line.slice(0, ci) : line;
  const cm = ci >= 0 ? line.slice(ci) : "";
  let out = "";
  const re = /("(?:[^"\\]|\\.)*")|([A-Za-z_]\w*)(\()?|(\s+|[^\w\s"]+|\d+)/g;
  for (const m of code.matchAll(re)) {
    if (m[1]) out += `<span class="st">${esc(m[1])}</span>`;
    else if (m[2]) {
      if (KW.has(m[2])) out += `<span class="kw">${m[2]}</span>${m[3] ?? ""}`;
      else if (/^[A-Z]/.test(m[2])) out += `<span class="ty">${m[2]}</span>${m[3] ?? ""}`;
      else if (m[3]) out += `<span class="fn">${m[2]}</span>(`;
      else out += m[2];
    } else out += esc(m[0]);
  }
  if (cm) out += `<span class="cm${/error:/.test(cm) ? " e" : ""}">${esc(cm)}</span>`;
  return `<div class="ln${/\/\/ error:/.test(line) ? " bad" : ""}">${out}</div>`;
}

// Loud part of a track: seconds up to where the closing fade-out starts (last 1 s window within 6 dB of the median level).
function loudEnd(src, len) {
  const out = String(execFileSync("ffmpeg", ["-v", "error", "-i", src, "-af", "aresample=22050,asetnsamples=22050,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 }));
  const v = [...out.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => Number(m[1]));
  const sorted = v.filter(Number.isFinite).sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  let i = v.length - 1;
  while (i > 0 && !(v[i] >= med - 6)) i--;
  return Math.min(len, i + 1);
}

// Music: loop `src` to `total` seconds. The closing fade-out of the track is cut off and every seam is a `xf`-second
// crossfade of loud audio into the loud start, so there is neither a click nor a dip. Fades at the ends of the video are
// left to the data-fade-in / data-fade-out attributes on the <audio> element.
export function makeBgm(src, total, out, xf = 4) {
  const full = Number(String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src])).trim());
  const len = loudEnd(src, full);
  const n = Math.max(1, Math.ceil((total - len) / (len - xf)) + 1);
  const args = ["-y", "-v", "error"];
  let filter = "";
  for (let i = 0; i < n; i++) { args.push("-i", src); filter += `[${i}]atrim=0:${len},asetpts=N/SR/TB[s${i}];`; }
  let last = "[s0]";
  for (let i = 1; i < n; i++) { filter += `${last}[s${i}]acrossfade=d=${xf}:c1=qsin:c2=qsin[a${i}];`; last = `[a${i}]`; }
  filter += `${last}atrim=0:${total},asetpts=N/SR/TB[out]`;
  args.push("-filter_complex", filter, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "160k", out);
  execFileSync("ffmpeg", args);
  return Math.floor(Number(String(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out])).trim()) * 100) / 100;
}
