#!/usr/bin/env node
// Timing plan for a day's video, driven by how long the voice needs to read the text.
//   node scripts/timing.mjs content/days/day-001.json [--wps 2.2] [--quiz-seconds 8] [--audio-dir video/audio/day-001]
// Voice lengths are estimated from word count. If --audio-dir holds real TTS clips, their ffprobe
// durations replace the estimates. Clip names: intro, t1-term, t1-def, t1-ex, t2-..., q1-q ...
// (any extension). Prints the plan as JSON and writes video/out/day-NNN.timing.json + .voiceover.txt.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const file = argv.find((a) => a.endsWith(".json"));
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
if (!file) {
  console.error("usage: timing.mjs <content/days/day-NNN.json> [--wps n] [--quiz-seconds n] [--audio-dir dir]");
  process.exit(1);
}
const day = JSON.parse(readFileSync(resolve(file), "utf8"));
const WPS = Number(opt("wps", 2.2)); // ~130 wpm: a learner-friendly pace
// short format (~60 s experiment): day.video.cutQuizIndex present -> cold-open hook, one quiz, CTA outro
const SHORT = day.video?.cutQuizIndex !== undefined;
const QUIZ_SECONDS = Number(opt("quiz-seconds", SHORT ? 4 : 8));
const audioDir = opt("audio-dir", null);
const r1 = (n) => Math.round(n * 10) / 10;

const clips = {};
if (audioDir && existsSync(resolve(audioDir))) {
  for (const f of readdirSync(resolve(audioDir))) {
    const key = f.replace(/\.[^.]+$/, "");
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(resolve(audioDir), f)]);
    clips[key] = Number(String(out).trim());
  }
}
// seconds to speak `text`, or the measured clip length when a clip exists
const speak = (key, text) => {
  if (clips[key]) return clips[key];
  const words = text.trim().split(/\s+/).length;
  const pauses = (text.match(/[,;:.?]/g) ?? []).length * 0.15;
  return Math.max(0.8, words / WPS + pauses);
};

const cues = []; // voiceover script with start times (absolute seconds)
let t = 0;

// intro: voice says the series name and day, then the three terms appear
const introVoice = `iOS Daily English. Day ${day.day}.`;
let intro, hook;
if (SHORT) {
  // cold open: the hook is on screen and spoken from the first frame, no logo
  const dHook = speak("hook", day.video.hook);
  hook = { start: 0, dur: r1(0.15 + dHook + 0.45) };
  cues.push({ at: 0.15, key: "hook", text: day.video.hook, seconds: r1(dHook) });
  t += hook.dur;
} else {
  const dIntro = speak("intro", introVoice);
  intro = { start: 0, dur: r1(Math.max(3.5, 0.5 + dIntro + 1.0)) };
  cues.push({ at: 0.5, key: "intro", text: introVoice, seconds: r1(dIntro) });
  t += intro.dur;
}
// short format trims the silent gaps only; every clip keeps its full length
const G = SHORT ? { term: 0.3, def: 0.3, code: 0.45, ex: 0.3, mid: 0.4, tail: 0.5 } : { term: 0.5, def: 0.4, code: 0.7, ex: 0.6, mid: 0.9, tail: 1.3 };

// term scene: term -> definition (diagram plays) -> code card + example (read aloud) -> breathing room
const terms = day.terms.map((term, i) => {
  const n = i + 1;
  const dTerm = speak(`t${n}-term`, term.term);
  const dDef = speak(`t${n}-def`, term.definition);
  const dEx = speak(`t${n}-ex`, term.example); // natural speed
  const dEx2 = clips[`t${n}-ex2`] ?? speak(`t${n}-ex2`, term.example) / 0.62; // again, slowly
  const termAt = G.term;
  const defAt = termAt + dTerm + G.def;
  const codeAt = defAt + dDef + G.code; // diagram ends, code card + example come in
  const exampleAt = codeAt + G.ex;
  const ex2At = exampleAt + 0.2 + dEx + G.mid;
  const dur = ex2At + dEx2 + G.tail;
  const scene = {
    term: term.term,
    start: r1(t),
    dur: r1(dur),
    termAt: r1(termAt),
    defAt: r1(defAt),
    diagramOut: r1(codeAt - 0.2),
    codeAt: r1(codeAt),
    exampleAt: r1(exampleAt),
    ex2At: r1(ex2At),
    out: r1(dur - 0.4),
  };
  cues.push({ at: r1(t + termAt), key: `t${n}-term`, text: term.term, seconds: r1(dTerm) });
  cues.push({ at: r1(t + defAt), key: `t${n}-def`, text: term.definition, seconds: r1(dDef) });
  cues.push({ at: r1(t + exampleAt + 0.2), key: `t${n}-ex`, text: term.example, seconds: r1(dEx) });
  cues.push({ at: r1(t + ex2At), key: `t${n}-ex2`, text: term.example + " (slow)", seconds: r1(dEx2) });
  t += dur;
  return scene;
});

// quiz title card (standard format only)
let quizIntro;
if (!SHORT) {
  quizIntro = { start: r1(t), dur: 2.5 };
  cues.push({ at: r1(t + 0.3), key: "quiz-intro", text: "Quiz time. Three questions.", seconds: 1.8 });
  t += quizIntro.dur;
}

// quiz: the question is read, options are shown (not spoken), THEN the countdown starts; answer is never revealed
const quizzes = day.quizzes.map((q, i) => ({ q, i })).filter(({ i }) => !SHORT || i === day.video.cutQuizIndex).map(({ q, i }) => {
  const n = i + 1;
  const dQ = speak(`q${n}-q`, q.question);
  // the question is read aloud; the options are NOT spoken, viewers read them (about 0.8 s each)
  const questionAt = SHORT ? 0.3 : 0.5;
  const optsAt = questionAt + dQ + 0.3;
  const countdownAt = SHORT ? optsAt + 0.5 : optsAt + 2.4; // short: options are already on screen while the question is read
  const dur = countdownAt + QUIZ_SECONDS + (SHORT ? 1.4 : 2.5); // countdown, "Time's up", fade
  const scene = {
    start: r1(t),
    dur: r1(dur),
    questionAt: r1(questionAt),
    optsAt: r1(optsAt),
    countdownAt: r1(countdownAt),
    quizSeconds: QUIZ_SECONDS,
  };
  cues.push({ at: r1(t + questionAt), key: `q${n}-q`, text: q.question, seconds: r1(dQ) });
  t += dur;
  return scene;
});

let outro;
if (SHORT) {
  // CTA with the logo, then the last ~0.9 s returns to the cold-open frame so the Short loops
  const dCta = speak("outro-cta", "Comment your answer. I reply to every comment.");
  outro = { start: r1(t), dur: r1(0.3 + dCta + 0.9), loopAt: r1(0.3 + dCta + 0.1) };
  cues.push({ at: r1(t + 0.3), key: "outro-cta", text: "Comment your answer. I reply to every comment.", seconds: r1(dCta) });
} else {
  outro = { start: r1(t), dur: 4.5 };
  cues.push({ at: r1(t + 1.2), key: "outro", text: "Not sure? Watch it again.", seconds: 1.8 });
}
t += outro.dur;

const plan = { day: day.day, wps: WPS, estimated: !Object.keys(clips).length, total: r1(t), ...(SHORT ? { short: true, hook } : { intro, quizIntro }), terms, quizzes, outro, cues };
if (!SHORT && plan.total > 180) console.error(`warning: ${plan.total}s is over the 3-minute Shorts limit; raise --wps or trim text`);

const pad = String(day.day).padStart(3, "0");
const outDir = join(root, "video", "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `day-${pad}.timing.json`), JSON.stringify(plan, null, 2) + "\n");
writeFileSync(
  join(outDir, `day-${pad}.voiceover.txt`),
  cues.map((c) => `${String(c.at.toFixed(1)).padStart(6)}s  [${c.key}] (~${c.seconds}s)  ${c.text}`).join("\n") + "\n",
);
console.log(JSON.stringify(plan, null, 2));
