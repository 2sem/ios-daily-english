#!/usr/bin/env node
// Builds one vertical hook Short (1080x1920, 15-25 s) per entry of the day JSON's `hooks` array:
//   node scripts/tts-landscape.mjs content/days/day-013.json          (also makes hookK-* clips)
//   node scripts/scaffold-hooks.mjs content/days/day-013.json [--bgm file.mp3] [--bgm-volume 0.12]
//   cd video/day013-hook1 && npx hyperframes check && npx hyperframes render -q high -f 30 -o ../out/day013-hook1.mp4
// Test: add `--extra video/template-landscape/test-extra-day012.json --tag -test` (output video/day012-hook1-test, ...).
// one-line-example: term + sentence (term highlighted), read at natural speed, then slowly, then a "your turn" pause.
// one-line-conversation: two bubbles, each line in its own voice, then a pause. Both end with the end card.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, cpSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadDay, makeBgm, root, esc, opt, renderLine, clipDurations, r1 } from "./lib/landscape.mjs";

const { day, paths } = loadDay();
const D = clipDurations(paths.audioDir);
const hooks = day.hooks ?? [];
if (!hooks.length) { console.error("no `hooks` in the day JSON"); process.exit(1); }
const sp = Object.fromEntries((day.dialogue?.speakers ?? []).map((s) => [s.id, s]));
const bgm = opt("bgm", join(homedir(), "Movies", "Backgroumds", "Rio_Nights.mp3"));
const ceil2 = (n) => Math.ceil(n * 100) / 100;

hooks.forEach((h, k) => {
  const n = k + 1;
  const dir = join(root, "video", `day${paths.pad}-hook${n}${paths.tag}`);
  const need = (key) => { if (!D[key]) { console.error(`missing clip ${key}.wav (run scripts/tts-landscape.mjs)`); process.exit(1); } return D[key]; };
  const ci = Math.max(0, day.terms.findIndex((t) => t.term.toLowerCase() === h.term.toLowerCase()));
  const cues = [];
  const cue = (at, key) => cues.push({ at: r1(at), key, seconds: ceil2(need(key)) });
  let t = 1.0, lines = [], slow = null, shadow;
  if (h.type === "one-line-example") {
    const d1 = need("hook" + n + "-l1");
    lines = [{ at: r1(t), dur: d1 }]; cue(t, `hook${n}-l1`);
    t += d1 + 0.9;
    const dS = need(`hook${n}-slow`);
    slow = { at: r1(t), dur: dS }; cue(t, `hook${n}-slow`);
    t += dS + 0.5;
  } else {
    t = 0.7;
    h.lines.forEach((l, j) => {
      const d = need(`hook${n}-l${j + 1}`);
      const at = t + 0.9; // typing dots for 0.9 s, then the bubble and the voice start together
      lines.push({ typeAt: r1(t), at: r1(at), dur: d }); cue(at, `hook${n}-l${j + 1}`);
      t = at + d + 0.25;
    });
    t += 0.4;
  }
  // "your turn" pause; stretched so the whole Short is at least 15 s
  const dEnd = need(`hook${n}-end`);
  const endDur = 0.5 + dEnd + 1.6;
  const shadowDur = Math.max(3.5, 15 - (t + 0.4 + endDur));
  shadow = { at: r1(t), dur: r1(shadowDur) };
  const mainDur = r1(t + shadowDur + 0.4);
  const end = { start: mainDur, dur: r1(endDur) };
  cue(end.start + 0.5, `hook${n}-end`);
  const total = r1(mainDur + end.dur);
  const plan = { type: h.type, term: h.term, total, main: { dur: mainDur }, lines: lines.map((l) => ({ typeAt: l.typeAt, at: l.at, dur: r1(l.dur) })), slow: slow && { at: slow.at, dur: r1(slow.dur) }, shadow, end };

  const body = h.type === "one-line-example"
    ? `        <div class="brandline">iOS Daily English · Day ${day.day}</div>
        <div class="col c${ci}">
          <div class="kicker">Word of the day</div>
          <div class="hk-term"${h.term.length > 10 ? ' style="font-size: 96px"' : ""}>${esc(h.term)}</div>
          <div class="lbl"><span class="a">In a sentence</span><span class="b">Again, slowly</span></div>
          <div class="sentence">"${renderLine(day, { text: h.lines[0].text, terms: [h.term] })}"</div>
          <div class="shadow"><b>Your turn. Say it out loud.</b><div class="bar"><i></i></div></div>
        </div>`
    : (() => {
      const ini = (id) => esc((sp[id]?.name ?? id)[0]);
      const rows = h.lines.map((l, j) => {
        const s = l.speaker ?? (j % 2 ? "B" : "A");
        const side = s === "A" ? "S" : "R";
        return `          <div class="row ${side}" id="hr${j}"><div class="cav ${s}">${ini(s)}</div><div class="mc"><div class="bub">${renderLine(day, { text: l.text, terms: [h.term] })}</div><div class="meta">9:4${1 + j} AM</div></div><div class="typing"><i></i><i></i><i></i></div></div>`;
      }).join("\n");
      return `        <div class="brandline">iOS Daily English · Day ${day.day}</div>
        <div class="hk-top c${ci}"><div class="kicker">Word of the day</div><div class="hk-term"${h.term.length > 10 ? ' style="font-size: 96px"' : ""}>${esc(h.term)}</div></div>
        <div class="col2 c${ci}">
          <div class="cw"><div class="cw-head"><div class="stack"><div class="cav A">${ini("A")}</div><div class="cav B">${ini("B")}</div></div><div><div class="ht">Code review</div><div class="hs">${esc(sp.A?.name ?? "A")} and ${esc(sp.B?.name ?? "B")} <span class="od"></span> online</div></div></div>
          <div class="msgs">
${rows}
          </div>
          <div class="cw-input"><div class="field">Message</div><div class="send"></div></div></div>
          <div class="shadow"><b>Your turn. Say it out loud.</b><div class="bar"><i></i></div></div>
        </div>`;
    })();

  const scenes = `      <div class="scene clip" id="hk" data-start="0" data-duration="${mainDur}" data-track-index="1">\n${body}\n      </div>
      <div class="scene clip" id="hk-end" data-start="${end.start}" data-duration="${end.dur}" data-track-index="1">
        <div class="end-main">
          <div class="logo-tile"><img src="assets/logo.png" alt="iOS Daily English logo" /></div>
          <div class="end1">Full conversation on the channel</div>
          <div class="end2">iOS Daily English · Day ${day.day}</div>
        </div>
      </div>\n`;

  rmSync(dir, { recursive: true, force: true });
  cpSync(join(root, "video", "template-hook"), dir, { recursive: true });
  const dest = join(dir, "assets", "voice");
  mkdirSync(dest, { recursive: true });
  const tags = cues.map((c, i) => {
    copyFileSync(join(paths.audioDir, `${c.key}.wav`), join(dest, `${c.key}.wav`));
    return `      <audio id="v-${c.key}" src="assets/voice/${c.key}.wav" data-start="${c.at}" data-duration="${c.seconds}" data-track-index="${20 + i}" data-volume="1"></audio>`;
  });
  if (existsSync(bgm)) {
    const len = makeBgm(bgm, total, join(dest, "bgm.mp3"));
    tags.push(`      <audio id="bgm" src="assets/voice/bgm.mp3" data-start="0" data-duration="${len}" data-track-index="5" data-volume="${opt("bgm-volume", "0.12")}" data-timeline-role="music" data-fade-in="0.5" data-fade-out="1.5"></audio>`);
  }
  const file = join(dir, "index.html");
  let out = readFileSync(file, "utf8");
  out = out.replace(/<!-- SCENES:START -->[\s\S]*?<!-- SCENES:END -->/, () => `<!-- SCENES:START -->\n${scenes}      <!-- SCENES:END -->\n      <!-- VOICE:START -->\n${tags.join("\n")}\n      <!-- VOICE:END -->`);
  out = out.replace(/(<div id="root" data-composition-id="main" data-start="0" data-duration=")[\d.]+(")/, `$1${total}$2`);
  out = out.replace("const PLAN = /*PLAN*/ {};", () => `const PLAN = /*PLAN*/ ${JSON.stringify(plan)};`);
  writeFileSync(file, out);
  console.log(`hook ${n} (${h.type}, "${h.term}"): ${dir} ${total}s`);
});
