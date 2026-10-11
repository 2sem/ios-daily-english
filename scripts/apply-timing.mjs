#!/usr/bin/env node
// Writes a timing plan (from scripts/timing.mjs) into a day's composition:
//   node scripts/apply-timing.mjs video/day001/index.html video/out/day-001.timing.json [--audio-dir video/audio/day-001] [--voice examples|all|none] [--bgm file.mp3] [--bgm-volume 0.14]
// With --audio-dir, copies the TTS clips next to the page and adds <audio> elements at each cue
// (default --voice examples: the example sentence is spoken at the end of every term).
// Rewrites data-start / data-duration on the header, root and every scene, and the `const PLAN = ...` line.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const [htmlPath, planPath] = argv.filter((a) => !a.startsWith("--") && a !== opt("audio-dir") && a !== opt("voice") && a !== opt("bgm") && a !== opt("bgm-volume"));
if (!htmlPath || !planPath) {
  console.error("usage: apply-timing.mjs <index.html> <day-NNN.timing.json>");
  process.exit(1);
}
const plan = JSON.parse(readFileSync(planPath, "utf8"));
let html = readFileSync(htmlPath, "utf8");

const scenes = {
  intro: plan.intro,
  s1: plan.terms[0], s2: plan.terms[1], s3: plan.terms[2],
  "quiz-intro": plan.quizIntro,
  q1: plan.quizzes[0], q2: plan.quizzes[1], q3: plan.quizzes[2],
  outro: plan.outro,
};
for (const [id, s] of Object.entries(scenes)) {
  const re = new RegExp(`(<div class="scene clip" id="${id}" data-start=")[\\d.]+(" data-duration=")[\\d.]+(")`);
  if (!re.test(html)) { console.error(`error: scene #${id} not found`); process.exit(1); }
  html = html.replace(re, `$1${s.start}$2${s.dur}$3`);
}
html = html.replace(/(<div class="header clip" id="header" data-start="0" data-duration=")[\d.]+(")/, `$1${plan.total}$2`);
html = html.replace(/(<div id="root" data-composition-id="main" data-start="0" data-duration=")[\d.]+(")/, `$1${plan.total}$2`);
const { cues, ...slim } = plan;
html = html.replace(/const PLAN = \/\*PLAN\*\/ .*;/, () => `const PLAN = /*PLAN*/ ${JSON.stringify(slim)};`);

const audioDir = opt("audio-dir", null);
const mode = opt("voice", "examples");
html = html.replace(/\n *<!-- VOICE:START -->[\s\S]*?<!-- VOICE:END -->/, "");
if (audioDir && mode !== "none") {
  const want = (key) => mode === "all" || /^t\d-ex2?$/.test(key);
  const dest = join(dirname(resolve(htmlPath)), "assets", "voice");
  mkdirSync(dest, { recursive: true });
  const tags = [];
  for (const c of plan.cues.filter((c) => want(c.key))) {
    const src = join(resolve(audioDir), `${c.key}.wav`);
    if (!existsSync(src)) { console.error(`error: missing clip ${src} (run scripts/tts.mjs)`); process.exit(1); }
    copyFileSync(src, join(dest, `${c.key}.wav`));
    tags.push(`      <audio id="v-${c.key}" src="assets/voice/${c.key}.wav" data-start="${c.at}" data-duration="${(Math.ceil(c.seconds * 10) / 10 + 0.1).toFixed(1)}" data-track-index="${20 + tags.length}" data-volume="1"></audio>`);
  }
  const bgm = opt("bgm", null);
  if (bgm) {
    copyFileSync(resolve(bgm), join(dest, "bgm.mp3"));
    tags.push(`      <audio id="bgm" src="assets/voice/bgm.mp3" data-start="0" data-duration="${plan.total}" data-track-index="5" data-volume="${opt("bgm-volume", "0.14")}" data-timeline-role="music" data-fade-in="1.5" data-fade-out="3"></audio>`);
  }
  html = html.replace(/(\n    <\/div>\n\n    <script>)/, `\n      <!-- VOICE:START -->\n${tags.join("\n")}\n      <!-- VOICE:END -->$1`);
  console.log(`added ${tags.length} audio elements (voice ${mode}${bgm ? ", bgm" : ""})`);
}
writeFileSync(htmlPath, html);
console.log(`applied plan: ${plan.total}s total, ${Object.keys(scenes).length} scenes`);
