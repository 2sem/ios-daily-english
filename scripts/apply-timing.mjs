#!/usr/bin/env node
// Writes a timing plan (from scripts/timing.mjs) into a day's composition:
//   node scripts/apply-timing.mjs video/day001/index.html video/out/day-001.timing.json
// Rewrites data-start / data-duration on the header, root and every scene, and the `const PLAN = ...` line.
import { readFileSync, writeFileSync } from "node:fs";
const [htmlPath, planPath] = process.argv.slice(2);
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
writeFileSync(htmlPath, html);
console.log(`applied plan: ${plan.total}s total, ${Object.keys(scenes).length} scenes`);
