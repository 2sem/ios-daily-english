#!/usr/bin/env node
// Timing plan for the landscape long-form video, from the real clip lengths in video/audio/day-NNN-landscape<tag>/.
//   node scripts/timing-landscape.mjs content/days/day-013.json [--extra extra.json] [--tag -test] [--quiz-seconds 8]
// Writes video/out/day-NNN.landscape<tag>.timing.json (+ .voiceover.txt). Every clip keeps its full length.
// Scene order: cold open, term x3, conversation, replay, quiz intro, quiz x3, outro.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadDay, clipDurations, replayPicks, dKey, rKey, r1, opt } from "./lib/landscape.mjs";

const { day, paths } = loadDay();
const D = clipDurations(paths.audioDir);
const need = (k) => { if (!D[k]) { console.error(`missing clip ${k}.wav in ${paths.audioDir} (run scripts/tts-landscape.mjs)`); process.exit(1); } return D[k]; };
const QUIZ_SECONDS = Number(opt("quiz-seconds", 8));
const cues = [];
const cue = (at, key, text) => cues.push({ at: r1(at), key, text, seconds: Math.ceil(D[key] * 100) / 100 });
let t = 0;

// cold open: hook line big on screen, then logo + day + the three terms
const dHook = need("cold-hook"), dIntro = need("cold-intro"), dPrev = need("cold-preview");
const hookAt = 0.3, hookOut = hookAt + dHook + 1.6, introAt = hookOut + 0.5, previewAt = introAt + dIntro + 0.5;
const cold = { start: 0, dur: r1(previewAt + dPrev + 1.4), hookAt, hookOut: r1(hookOut), introAt: r1(introAt), previewAt: r1(previewAt) };
cue(hookAt, "cold-hook", day.video?.hook ?? "");
cue(introAt, "cold-intro", "intro"); cue(previewAt, "cold-preview", "preview");
t += cold.dur;

// terms: term -> definition (code panel builds) -> example natural -> again slowly -> "your turn" pause
const terms = day.terms.map((term, i) => {
  const n = i + 1;
  const dT = need(`t${n}-term`), dDf = need(`t${n}-def`), dEx = need(`t${n}-ex`), dEx2 = need(`t${n}-ex2`);
  const termAt = 0.5;
  const defAt = termAt + dT + 0.6;
  const exampleAt = defAt + dDf + 1.0;
  const ex2At = exampleAt + 0.2 + dEx + 1.0;
  const shadowAt = ex2At + dEx2 + 0.5;
  const shadowDur = Math.max(4, dEx2 + 1.2); // time for the viewer to say it out loud
  const dur = shadowAt + shadowDur + 1.0;
  cue(t + termAt, `t${n}-term`, term.term); cue(t + defAt, `t${n}-def`, term.definition);
  cue(t + exampleAt + 0.2, `t${n}-ex`, term.example); cue(t + ex2At, `t${n}-ex2`, term.example + " (slow)");
  const s = { term: term.term, start: r1(t), dur: r1(dur), termAt, defAt: r1(defAt), codeAt: r1(defAt), exampleAt: r1(exampleAt), ex2At: r1(ex2At), shadowAt: r1(shadowAt), shadowDur: r1(shadowDur), out: r1(dur - 0.4) };
  t += dur;
  return s;
});

// conversation: title card, then each line in its own voice (lines are consecutive, a beat between turns)
let conv = null, replay = null;
const lines = day.dialogue?.lines ?? [];
if (lines.length) {
  // each line: typing dots for 0.9 s, then the bubble appears and the voice starts together
  const TYPE = 0.9, lead = 1.2;
  let end = 0;
  const cl = lines.map((l, i) => {
    const d = need(dKey(i));
    const typeAt = i === 0 ? lead : end + 0.15;
    const at = typeAt + TYPE;
    end = at + d;
    cue(t + at, dKey(i), `${l.speaker}: ${l.text}`);
    return { i, typeAt: r1(typeAt), at: r1(at), dur: r1(d) };
  });
  conv = { start: r1(t), dur: r1(end + 1.4), lead, lines: cl };
  t += conv.dur;

  // replay: key lines with the terms blanked, then the term pops in after a beat
  const dRi = need("replay-intro");
  let r = 0.4;
  cue(t + r, "replay-intro", "Now you. Fill in the blank.");
  r += dRi + 1.4;
  const introDur = r;
  let prevReveal = null;
  const rl = replayPicks(day).map((i) => {
    const d = need(rKey(i));
    const typeAt = prevReveal === null ? r : prevReveal + 0.3;
    const at = typeAt + TYPE, revealAt = at + d + 1.5; // a beat to think
    cue(t + at, rKey(i), "(blank) " + lines[i].text);
    prevReveal = revealAt;
    return { i, typeAt: r1(typeAt), at: r1(at), dur: r1(d), revealAt: r1(revealAt) };
  });
  replay = { start: r1(t), dur: r1(prevReveal + 1.6), introDur: r1(introDur), lines: rl };
  t += replay.dur;
}

// quiz: title card, then per question: question read, options on screen from the start (never spoken), countdown, no reveal
const dQi = need("quiz-intro");
const quizIntro = { start: r1(t), dur: r1(Math.max(2.5, 0.3 + dQi + 0.8)) };
cue(t + 0.3, "quiz-intro", "Quiz time. Three questions.");
t += quizIntro.dur;
const quizzes = day.quizzes.map((q, i) => {
  const dQ = need(`q${i + 1}-q`);
  const questionAt = 0.4;
  const countdownAt = questionAt + dQ + 1.0;
  const dur = countdownAt + QUIZ_SECONDS + 2.5;
  cue(t + questionAt, `q${i + 1}-q`, q.question);
  const s = { start: r1(t), dur: r1(dur), questionAt, optsAt: questionAt, countdownAt: r1(countdownAt), quizSeconds: QUIZ_SECONDS };
  t += dur;
  return s;
});

const dOut = need("outro");
const outro = { start: r1(t), dur: r1(1.0 + dOut + 3.0), voiceAt: 1.0 };
cue(t + 1.0, "outro", "That's all for today. Not sure about the quiz? Watch it again. See you tomorrow.");
t += outro.dur;

const plan = { day: day.day, landscape: true, total: r1(t), cold, terms, conv, replay, quizIntro, quizzes, outro, cues };
mkdirSync(dirname(paths.timing), { recursive: true });
writeFileSync(paths.timing, JSON.stringify(plan, null, 2) + "\n");
writeFileSync(paths.voiceover, cues.map((c) => `${c.at.toFixed(1).padStart(6)}s  [${c.key}] (~${c.seconds}s)  ${c.text}`).join("\n") + "\n");
const m = (s) => `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, "0")}s`;
console.log(`total ${plan.total}s (${m(plan.total)}): cold ${cold.dur}, terms ${terms.map((x) => x.dur).join("+")}, conversation ${conv?.dur ?? 0}, replay ${replay?.dur ?? 0}, quiz ${r1(quizIntro.dur + quizzes.reduce((a, q) => a + q.dur, 0))}, outro ${outro.dur}`);
console.log(`wrote ${paths.timing}`);
