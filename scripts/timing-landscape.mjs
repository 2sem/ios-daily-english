#!/usr/bin/env node
// Timing plan for the landscape long-form video, from the real clip lengths in video/audio/day-NNN-landscape<tag>/.
//   node scripts/timing-landscape.mjs content/days/day-013.json [--extra extra.json] [--tag -test] [--quiz-seconds 8]
// Writes video/out/day-NNN.landscape<tag>.timing.json (+ .voiceover.txt). Every clip keeps its full length.
// Scene order: cold open, term x3 (code, output, example), conversation, replay (the whole conversation again, with blanks), quiz intro, quiz x3, outro.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadDay, coldHook, clipDurations, replayPicks, hasBlank, dKey, r1, opt } from "./lib/landscape.mjs";

const { day, paths } = loadDay();
const D = clipDurations(paths.audioDir);
const need = (k) => { if (!D[k]) { console.error(`missing clip ${k}.wav in ${paths.audioDir} (run scripts/tts-landscape.mjs)`); process.exit(1); } return D[k]; };
// One full plan for a set of knobs: quiz seconds per question, the pause scale, the outro tail, and (legacy days only) which replay lines are kept.
function build(K) {
  const cues = [];
  const cue = (at, key, text, clip = key) => cues.push({ at: r1(at), key, clip, text, seconds: Math.ceil(D[clip] * 100) / 100 });
  let t = 0;

  // cold open: hook line big on screen, then logo + day + the three terms
  const dHook = need("cold-hook"), dIntro = need("cold-intro"), dPrev = need("cold-preview");
  const hookAt = 0.3, hookOut = hookAt + dHook + 1.6, introAt = hookOut + 0.5, previewAt = introAt + dIntro + 0.5;
  const cold = { start: 0, dur: r1(previewAt + dPrev + 1.4), hookAt, hookOut: r1(hookOut), introAt: r1(introAt), previewAt: r1(previewAt) };
  cue(hookAt, "cold-hook", coldHook(day));
  cue(introAt, "cold-intro", "intro"); cue(previewAt, "cold-preview", "preview");
  t += cold.dur;

  // terms: term -> definition (code panel builds) -> output (console block, if any) -> example read by a male voice -> by a female voice -> "now your turn" -> silent read (the words are lit one by one in all three)
  const terms = day.terms.map((term, i) => {
    const n = i + 1;
    const dT = need(`t${n}-term`), dDf = need(`t${n}-def`), dEx = need(`t${n}-ex`), dEx2 = need(`t${n}-ex2`), dTurn = need(`t${n}-turn`);
    const termAt = 0.5;
    const g = K.g ?? 1; // pause scale (1 = relaxed)
    const defAt = termAt + dT + 0.6 * g;
    // with an `output`, the console block appears after the definition, and stays on screen ~2 s before the example is read
    const outAt = term.output ? defAt + dDf + 0.3 * g : null;
    const exampleAt = outAt !== null ? outAt + 2.2 * g : defAt + dDf + 1.0 * g;
    const maleAt = exampleAt + 0.2;
    const femaleAt = maleAt + dEx + 0.9 * g;
    const turnAt = femaleAt + dEx2 + 0.8 * g;
    const hlAt = turnAt + dTurn + 0.4;
    const hlDur = Math.max(3.5 * g, dEx * 1.2); // silent: the viewer says the sentence along with the highlight
    const dur = hlAt + hlDur + 1.4 * g;
    cue(t + termAt, `t${n}-term`, term.term); cue(t + defAt, `t${n}-def`, term.definition);
    cue(t + exampleAt + 0.2, `t${n}-ex`, term.example); cue(t + femaleAt, `t${n}-ex2`, term.example + " (female voice)"); cue(t + turnAt, `t${n}-turn`, "Now your turn.");
    const s = { term: term.term, start: r1(t), dur: r1(dur), termAt, defAt: r1(defAt), codeAt: r1(defAt), ...(outAt !== null ? { outAt: r1(outAt) } : {}), exampleAt: r1(exampleAt), maleAt: r1(maleAt), maleDur: r1(dEx), femaleAt: r1(femaleAt), femaleDur: r1(dEx2), turnAt: r1(turnAt), hlAt: r1(hlAt), hlDur: r1(hlDur), out: r1(dur - 0.4) };
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

    // replay: the WHOLE conversation again as a chat. Each line is read whole in its speaker's voice (the conversation clip dNN).
    // Lines with a blank (a day term or a `blanks` word) get a silent pause (0.5 x clip, min 1.2 s) to say the missing words,
    // then the blanked words pop in at the end of the pause. Lines without a blank play straight through.
    const dRi = need("replay-intro");
    let r = 0.4;
    cue(t + r, "replay-intro", "Now you. Say the missing words.");
    r += dRi + 1.4;
    const introDur = r;
    let prevEnd = null;
    const g = K.g ?? 1;
    const rl = (K.picks ?? lines.map((_, i) => i)).map((i) => {
      const d = need(dKey(i)), blank = hasBlank(day, lines[i]), pause = blank ? (K.picks ? Math.max(2, 0.9 * d) : Math.max(1.2, 0.5 * d) * g) : 0; // K.picks = legacy 3-line replay keeps its longer pause
      const typeAt = prevEnd === null ? r : prevEnd + 0.3;
      const at = typeAt + TYPE;
      cue(t + at, `rp-${dKey(i)}`, `${lines[i].speaker}: ${lines[i].text}`, dKey(i));
      prevEnd = at + d + pause;
      return { i, typeAt: r1(typeAt), at: r1(at), dur: r1(d), ...(blank ? { pauseAt: r1(at + d), pause: r1(pause), revealAt: r1(at + d + pause - 0.3) } : {}) };
    });
    replay = { start: r1(t), dur: r1(prevEnd + 1.2), introDur: r1(introDur), lines: rl };
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
    const countdownAt = questionAt + dQ + 1.0 * (K.g ?? 1);
    const dur = countdownAt + K.quiz + 2.5 * (K.g ?? 1);
    cue(t + questionAt, `q${i + 1}-q`, q.question);
    const s = { start: r1(t), dur: r1(dur), questionAt, optsAt: questionAt, countdownAt: r1(countdownAt), quizSeconds: K.quiz };
    t += dur;
    return s;
  });

  const dOut = need("outro");
  const outro = { start: r1(t), dur: r1(1.0 + dOut + K.tail), voiceAt: 1.0 };
  cue(t + 1.0, "outro", "That's all for today. Not sure about the quiz? Watch it again. See you tomorrow.");
  t += outro.dur;


  const plan = { day: day.day, landscape: true, total: r1(t), cold, terms, conv, replay, quizIntro, quizzes, outro, cues };
  return plan;
}

// Series rule: every long video is exactly TARGET seconds (5:00). Content is trimmed in steps (quiz seconds, pause scale) until
// it fits with a minimum outro tail, then the outro tail absorbs the rest so the total lands on TARGET. --target 0 = natural length.
// The replay is the whole conversation. Legacy days (no dialogue.code, 18-20 line dialogues) that cannot fit that fall back to the old
// 3-line replay (or force it with --replay picks); new days get a warning instead: shorten the dialogue.
const TARGET = Number(opt("target", 300)), MIN_TAIL = 3, MAX_TAIL = 14;
const lines = day.dialogue?.lines ?? [];
const legacy = !day.dialogue?.code;
const picks = replayPicks(day, 3);
const ladder = [[8], [7], [6], [5], [5, 0.85], [5, 0.7], [5, 0.6]]; // [quiz seconds, pause scale], most content first
let plan;
if (!TARGET) plan = build({ quiz: Number(opt("quiz-seconds", 8)), picks: opt("replay", "full") === "picks" ? picks : null, tail: MIN_TAIL });
else {
  const attempt = (p) => {
    for (const [quiz, g] of ladder) {
      const k = { quiz, picks: p, tail: MIN_TAIL, g };
      if (build(k).total <= TARGET) return k;
    }
    return null;
  };
  let K = opt("replay", "full") === "picks" ? attempt(picks) : attempt(null);
  if (!K && legacy && opt("replay", "full") === "full" && lines.length) {
    K = attempt(picks);
    if (K) console.log(`note: legacy day, the full replay does not fit ${TARGET}s: replay trimmed to ${picks.length} key lines (${picks.join(",")})`);
  }
  if (!K) K = { quiz: 5, picks: null, tail: MIN_TAIL, g: 0.6 };
  // too short even with the longest outro tail: relax the pauses (term, quiz, replay) up to 1.6x instead of padding silence
  while (build(K).total + (MAX_TAIL - MIN_TAIL) < TARGET && (K.g ?? 1) < 1.6) K.g = r1(((K.g ?? 1) + 0.1) * 10) / 10;
  const natural = build(K).total;
  if (natural > TARGET) console.error(`warning: ${natural}s even with the shortest settings; cut content, e.g. fewer dialogue lines (the conversation plays twice) (target ${TARGET}s)`);
  K.tail = Math.min(MAX_TAIL, MIN_TAIL + Math.max(0, TARGET - natural));
  plan = build(K);
  if (plan.total > TARGET + 0.05 || plan.total < TARGET - 0.05) console.error(`warning: total ${plan.total}s, not ${TARGET}s (outro tail capped at ${MAX_TAIL}s: add content or lower quiz seconds)`);
  else { plan.outro.dur = r1(TARGET - plan.outro.start); plan.total = TARGET; }
  console.log(`knobs: quiz ${K.quiz}s, replay ${K.picks ? `${K.picks.length} key lines` : `all ${lines.length} lines`}, pause scale ${K.g ?? 1}, outro tail ${r1(K.tail)}s`);
}
const { cold, terms, conv, replay, quizIntro, quizzes, outro, cues } = plan;
mkdirSync(dirname(paths.timing), { recursive: true });
writeFileSync(paths.timing, JSON.stringify(plan, null, 2) + "\n");
writeFileSync(paths.voiceover, cues.map((c) => `${c.at.toFixed(1).padStart(6)}s  [${c.key}] (~${c.seconds}s)  ${c.text}`).join("\n") + "\n");
const m = (s) => `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, "0")}s`;
console.log(`total ${plan.total}s (${m(plan.total)}): cold ${cold.dur}, terms ${terms.map((x) => x.dur).join("+")}, conversation ${conv?.dur ?? 0}, replay ${replay?.dur ?? 0}, quiz ${r1(quizIntro.dur + quizzes.reduce((a, q) => a + q.dur, 0))}, outro ${outro.dur}`);
console.log(`wrote ${paths.timing}`);
