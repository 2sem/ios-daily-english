#!/usr/bin/env node
// Builds video/dayNNN-landscape/ (1920x1080 long-form composition) from a day JSON, its timing plan and its audio.
//   node scripts/tts-landscape.mjs content/days/day-013.json
//   node scripts/timing-landscape.mjs content/days/day-013.json
//   node scripts/scaffold-landscape.mjs content/days/day-013.json [--bgm file.mp3] [--bgm-volume 0.10]
//   cd video/day013-landscape && npx hyperframes check && npx hyperframes render -q high -f 30 -o ../out/day013-landscape.mp4
// Test with a stub dialogue: add `--extra video/template-landscape/test-extra-day012.json --tag -test` to all three.
// Each term carries `output` (1-4 lines, the real printed result of `code`, shown in a console block under the code); the
// dialogue carries `code` (max 6 lines, shown in a card beside the chat in the conversation and the replay) and `codeFile`.
// The replay shows the whole conversation again; each day term (and each word in a line's optional `blanks`) is a blank.
// Missing output / dialogue.code only warn. Each term carries `code` (max 6 lines, ~48 chars) for the left panel, read from the day JSON (an --extra file can override
// it); without it the panel shows a visible placeholder and a warning is printed.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, cpSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { loadDay, coldHook, makeBgm, root, esc, opt, renderLine, codify, blankTerms, dKey, highlightSwift } from "./lib/landscape.mjs";

const { day, paths } = loadDay();
if (!existsSync(paths.timing)) { console.error(`missing ${paths.timing} (run scripts/timing-landscape.mjs)`); process.exit(1); }
const plan = JSON.parse(readFileSync(paths.timing, "utf8"));
const { cues, ...slim } = plan;

rmSync(paths.outDir, { recursive: true, force: true });
cpSync(join(root, "video", "template-landscape"), paths.outDir, { recursive: true });
rmSync(join(paths.outDir, "test-extra-day012.json"), { force: true });

const scene = (id, s, inner, cls = "") => `      <div class="scene clip${cls ? " " + cls : ""}" id="${id}" data-start="${s.start}" data-duration="${s.dur}" data-track-index="1">\n${inner}\n      </div>\n`;
// code panel text area is ~766 px wide and JetBrains Mono is 0.6 em wide: shrink the font for long lines instead of clipping them
const codeFont = (code) => { const m = Math.max(0, ...code.map((l) => l.length)); const px = Math.floor(Math.min(28, 760 / (m * 0.6))); return px < 28 ? ` style="font-size: ${px}px"` : ""; };
const koOf = (t) => (t.ko ?? "").replace(/^[^:]+:\s*/, "");
const isMono = (s) => /^[a-z][\w.()-]*$/i.test(s) && !/\s/.test(s) && s === s.toLowerCase();
// every word of an already-rendered line becomes a .w span (the read-along highlight animates them); tags are left alone
const wrapWords = (h) => h.split(/(<[^>]+>)/).map((p) => (p.startsWith("<") ? p : p.replace(/\S+/g, (w) => `<span class="w">${w}</span>`))).join("");
const warnings = [];
let html = "";

// cold open
html += scene("cold", plan.cold, `        <div class="cold-hook" id="cold-hook"><div>${renderLine(day, { text: coldHook(day), terms: day.terms.map((t) => t.term) })}</div></div>
        <div id="cold-intro">
          <div class="logo-tile"><img src="assets/logo.png" alt="iOS Daily English logo" /></div>
          <div>
            <div class="kicker">iOS Daily English</div>
            <div class="day">Day ${day.day}</div>
            <div class="intro-sub">${esc(day.theme ?? "")}</div>
            <div class="intro-terms">${day.terms.map((t, i) => `<div class="it c${i}">${esc(t.term)}</div>`).join("")}</div>
          </div>
        </div>`);

// terms
day.terms.forEach((t, i) => {
  const code = (t.code ?? "").split("\n").filter((l, k, a) => !(k === a.length - 1 && !l));
  if (!t.code) warnings.push(`term ${t.term}: no \`code\` field, placeholder shown`);
  if (code.length > 6) warnings.push(`term ${t.term}: code has ${code.length} lines (max 6)`);
  code.forEach((l) => { if (l.length > 45) warnings.push(`term ${t.term}: line over 45 chars (font shrunk to fit): ${l}`); });
  const lines = t.code ? code.map(highlightSwift).join("\n") : `<div class="ln"><span class="cm">// TODO: add a code snippet for ${esc(t.term)}</span></div>`;
  const fileName = `${(t.term.replace(/[^\w]/g, "") || "Snippet")}.swift`;
  const outLines = (t.output ?? "").split("\n").filter((l, k, a) => !(k === a.length - 1 && !l));
  if (!outLines.length) warnings.push(`term ${t.term}: no \`output\` field, no Output block shown`);
  if (outLines.length > 4) warnings.push(`term ${t.term}: output has ${outLines.length} lines (max 4)`);
  outLines.forEach((l) => { if (l.length > 48) warnings.push(`term ${t.term}: output line over 48 chars (font shrunk to fit): ${l}`); });
  const outPx = Math.floor(Math.min(28, 780 / (Math.max(0, ...outLines.map((l) => l.length)) * 0.6)));
  const outBlock = outLines.length ? `
        <div class="opanel" style="height: ${44 + outLines.length * 44 + 36}px"><div class="obar"><b>&gt;_</b>Output</div><div class="out"${outPx < 28 ? ` style="font-size: ${outPx}px"` : ""}>
${outLines.map((l) => `<div class="ol">${esc(l)}</div>`).join("\n")}
        </div></div>` : "";
  const ex = wrapWords(renderLine(day, { text: t.example, terms: [t.term] }));
  html += scene(`s${i + 1}`, plan.terms[i], `        <div class="num">0${i + 1} / 0${day.terms.length}</div>
        <div class="lpanel${outLines.length ? " wo" : ""}"><div class="wbar"><i></i><i></i><i></i><span>${esc(fileName)}</span></div><div class="code"${codeFont(code)}>
${lines}
        </div></div>${outBlock}
        <div class="rp">
          <div class="term${isMono(t.term) ? " mono" : ""}"${t.term.length > 14 ? ' style="font-size: 76px"' : ""}>${esc(t.term)}</div>
          <div class="def">${codify(t.definition)}</div>
          ${koOf(t) ? `<div class="ko">${esc(koOf(t))}</div>` : ""}
        </div>
        <div class="example"><div class="lbl"><span class="a">Male voice</span><span class="b">Female voice</span><span class="c">Your turn · say it</span></div><p>"${ex}"</p></div>`, `c${i}`);
});

// conversation + replay
const D = day.dialogue;
const data = { lines: [] };
if (D) {
  const sp = Object.fromEntries(D.speakers.map((s) => [s.id, s]));
  const colorIdx = (l) => (l.terms ?? []).map((x) => Math.max(0, day.terms.findIndex((t) => t.term.toLowerCase() === x.toLowerCase())));
  data.lines = D.lines.map((l) => ({ speaker: l.speaker, terms: [...new Set(colorIdx(l))] }));
  const ini = (id) => esc((sp[id]?.name ?? id)[0]);
  const chips = `<div class="chips"><span class="lab">Today's terms</span>${day.terms.map((t, i) => `<span class="chip c${i}">${esc(t.term)}</span>`).join("")}</div>`;
  const legend = `<div class="legend">${["A", "B"].map((id) => `<div class="lg"><div class="cav ${id}">${ini(id)}</div><div>${esc(sp[id]?.name ?? id)}<small>${id === "A" ? "writes in blue" : "writes in gray"}</small></div></div>`).join("")}</div>`;
  // code card beside the chat: the code under discussion stays visible in the conversation and the replay
  const dcode = (D.code ?? "").split("\n").filter((l, k, a) => !(k === a.length - 1 && !l));
  if (!dcode.length) warnings.push("no `dialogue.code`: the conversation has no code card (readers can lose track of names mentioned in the chat)");
  if (dcode.length > 6) warnings.push(`dialogue.code has ${dcode.length} lines (max 6)`);
  dcode.forEach((l) => { if (l.length > 48) warnings.push(`dialogue.code line over 48 chars (font shrunk to fit): ${l}`); });
  const codeCard = dcode.length ? `<div class="cc" style="height: ${60 + dcode.length * 49 + 40}px"><div class="wbar"><i></i><i></i><i></i><span>${esc(D.codeFile ?? "Chat.swift")}</span></div><div class="code"${codeFont(dcode)}>
${dcode.map(highlightSwift).join("\n")}
        </div></div>` : "";
  const header = `        <div class="cw-head"><div class="stack"><div class="cav A">${ini("A")}</div><div class="cav B">${ini("B")}</div></div><div><div class="ht">${esc(D.title)}</div><div class="hs">${esc(sp.A?.name ?? "A")} and ${esc(sp.B?.name ?? "B")} <span class="od"></span> online</div></div></div>`;
  const input = `        <div class="cw-input"><div class="field">Message</div><div class="send"></div></div>`;
  // rows grouped like a chat app: avatar on the first bubble of a run, tail and time on the last; A sends (right, blue), B receives (left, gray)
  const rows = (prefix, ids, mode) => {
    let g = 0;
    return ids.map((i, k) => {
      const l = D.lines[i], prev = D.lines[ids[k - 1]], next = D.lines[ids[k + 1]];
      const first = !prev || prev.speaker !== l.speaker, last = !next || next.speaker !== l.speaker;
      if (first && k) g++;
      const side = l.speaker === "A" ? "S" : "R";
      const ts = `9:${String(41 + g).padStart(2, "0")} AM`;
      const meta = last ? `<div class="meta">${ts}${side === "S" ? `<span class="rs"><b class="st1">&nbsp;· Delivered</b><b class="st2">&nbsp;· Read</b></span>` : ""}</div>` : "";
      return `          <div class="row ${side}${first ? " first" : ""}${last ? " last" : ""}" id="${prefix}${i}"><div class="cav ${l.speaker}${first ? "" : " sp"}">${ini(l.speaker)}</div><div class="col"><div class="bub">${renderLine(day, l, mode)}</div>${meta}</div><div class="typing"><i></i><i></i><i></i></div></div>`;
    }).join("\n");
  };
  const win = (prefix, ids, mode) => `        <div class="cw">\n${header}\n        <div class="cw-body"><div class="msgs">\n${rows(prefix, ids, mode)}\n        </div></div>\n${input}\n        </div>`;
  html += scene("conv", plan.conv, `        <div class="conv-kicker">Conversation</div>
        <div class="side-l"><div class="sl-title">${esc(D.title)}</div><div class="sl-set">${esc(D.setting ?? "")}</div>${codeCard}${chips}${legend}</div>
${win("cl", D.lines.map((_, i) => i), "plain")}`);
  // replay: the whole conversation again; every day term (and each line's `blanks`) is a blank
  const blankLine = (l) => ({ ...l, terms: blankTerms(day, l) });
  const saved = D.lines;
  const blankRows = (prefix, ids) => { D.lines = saved.map(blankLine); try { return win(prefix, ids, "blank"); } finally { D.lines = saved; } };
  html += scene("replay", plan.replay, `        <div class="rcard"><div class="kicker">Replay</div><div class="big">Fill in the blank</div><div class="intro-sub">Same chat again. Say the missing words out loud, then check.</div></div>
        <div class="conv-kicker" style="color: var(--quiz)">Fill in the blank</div>
        <div class="side-l"><div class="sl-title">Say the missing words</div><div class="sl-set">${esc(D.title)}. Listen to each line, say the missing words in the pause, then see them appear.</div>${codeCard}${legend}</div>
${blankRows("rl", plan.replay.lines.map((l) => l.i))}`);
} else warnings.push("no dialogue in the day JSON: conversation and replay scenes are skipped");

// quiz (an optional `code` shows a snippet under the question; `___` marks the blank)
const qcode = (q) => {
  if (!q.code) return "";
  const code = q.code.split("\n").filter((l, k, a) => !(k === a.length - 1 && !l));
  if (code.length > 8) warnings.push(`quiz code has ${code.length} lines (max 8)`);
  return `
        <div class="qcode"><div class="wbar"><i></i><i></i><i></i><span>Quiz.swift</span></div><div class="code"${codeFont(code)}>
${code.map(highlightSwift).join("\n")}
        </div></div>`;
};
html += scene("quiz-intro", plan.quizIntro, `        <div class="kicker">Your turn</div>
        <div class="qbig">Quiz time</div>
        <div class="intro-sub">${day.quizzes.length} questions · 8 seconds each</div>`);
day.quizzes.forEach((q, i) => {
  const clock = Array.from({ length: plan.quizzes[i].quizSeconds }, (_, k) => `<b>${plan.quizzes[i].quizSeconds - k}</b>`).join("") + `<b class="done">?</b>`;
  html += scene(`q${i + 1}`, plan.quizzes[i], `        <div class="qlabel">Quiz ${i + 1} of ${day.quizzes.length}</div>
        <div class="question${q.code ? " hc" : ""}">${codify(q.question)}</div>${qcode(q)}
        <div class="clock">${clock}</div>
        <div class="opts">
${q.options.map((o, k) => `          <div class="opt"><div class="letter">${"abc"[k]}</div><div class="name">${esc(o)}</div></div>`).join("\n")}
        </div>
        <div class="timer"><i></i></div>
        <div class="tlabel">Answer before the bar runs out</div>
        <div class="tlabel up">Time's up. Got it?</div>`);
});

// outro
html += scene("outro", plan.outro, `        <div class="logo-tile"><img src="assets/logo.png" alt="iOS Daily English logo" /></div>
        <div>
          <div class="cta1">See you tomorrow.</div>
          <div class="recap">${day.terms.map((t, i) => `<div class="row c${i}"><div class="k">${esc(t.term)}</div>${koOf(t) ? `<div class="v">${esc(koOf(t))}</div>` : ""}</div>`).join("")}</div>
          <div class="follow">Not sure? <span>Watch it again.</span></div>
        </div>`);

const header = `      <div class="header clip" id="header" data-start="0" data-duration="${plan.total}" data-track-index="0">
        <div class="brand"><div class="phone"></div>iOS Daily English · Day ${day.day}</div>
        <div class="dots">
          <div class="dot"><i id="p1" style="background: var(--swift)"></i></div>
          <div class="dot"><i id="p2" style="background: var(--blue)"></i></div>
          <div class="dot"><i id="p3" style="background: var(--violet)"></i></div>
          <div class="dot"><i id="p4" style="background: var(--ok)"></i></div>
          <div class="dot"><i id="p5" style="background: var(--quiz)"></i></div>
        </div>
      </div>
`;

// audio: one <audio> per cue, plus looped music
const dest = join(paths.outDir, "assets", "voice");
mkdirSync(dest, { recursive: true });
const tags = cues.map((c, k) => {
  const src = join(paths.audioDir, `${c.clip ?? c.key}.wav`);
  if (!existsSync(src)) { console.error(`missing clip ${src}`); process.exit(1); }
  copyFileSync(src, join(dest, `${c.clip ?? c.key}.wav`));
  return `      <audio id="v-${c.key}" src="assets/voice/${c.clip ?? c.key}.wav" data-start="${c.at}" data-duration="${c.seconds}" data-track-index="${20 + k}" data-volume="1"></audio>`;
});
const bgm = opt("bgm", join(homedir(), "Movies", "Backgroumds", "Rio_Nights.mp3"));
if (existsSync(bgm)) {
  const bgmLen = makeBgm(bgm, plan.total, join(dest, "bgm.mp3")); // looped with a crossfade at each seam
  tags.push(`      <audio id="bgm" src="assets/voice/bgm.mp3" data-start="0" data-duration="${bgmLen}" data-track-index="5" data-volume="${opt("bgm-volume", "0.08")}" data-timeline-role="music" data-fade-in="1.5" data-fade-out="3"></audio>`);
} else warnings.push(`music not found: ${bgm}`);

const file = join(paths.outDir, "index.html");
let out = readFileSync(file, "utf8");
out = out.replace(/<!-- SCENES:START -->[\s\S]*?<!-- SCENES:END -->/, () => `<!-- SCENES:START -->\n${header}\n${html}      <!-- SCENES:END -->\n      <!-- VOICE:START -->\n${tags.join("\n")}\n      <!-- VOICE:END -->`);
out = out.replace(/(<div id="root" data-composition-id="main" data-start="0" data-duration=")[\d.]+(")/, `$1${plan.total}$2`);
out = out.replace("const PLAN = /*PLAN*/ {};", () => `const PLAN = /*PLAN*/ ${JSON.stringify(slim)};`);
out = out.replace("const DATA = /*DATA*/ {};", () => `const DATA = /*DATA*/ ${JSON.stringify(data)};`);
writeFileSync(file, out);
console.log(`scaffolded ${paths.outDir} (${plan.total}s, ${cues.length} voice clips${existsSync(bgm) ? ", bgm" : ""})`);
warnings.forEach((w) => console.log(`warning: ${w}`));
