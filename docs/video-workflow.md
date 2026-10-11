# iOS Daily English — Video Workflow (HyperFrames)

Hand this file to Claude Code on any machine and say:
**"Read IOS_DAILY_ENGLISH_VIDEO.md and set up the workflow. Then make a video for Day N: <paste the post>."**

Everything needed is here: setup, the rules from past feedback, and the full reference composition (Day 371) at the bottom.

---

## 1. What we make

A 1080×1080 (square, LinkedIn feed) silent MP4, about 82 seconds:

| Time | Scene |
|---|---|
| 0–3.5s | Intro: "iOS Daily English", "Day N", a subtitle, the 3 terms |
| 3.5–16.5s | Term 1 (13s) |
| 16.5–29.5s | Term 2 (13s) |
| 29.5–42.5s | Term 3 (13s) |
| 42.5–45s | "Quiz time · 3 questions · 8 seconds each" |
| 45–78s | 3 quiz scenes, 11s each (8s countdown) |
| 78–82.5s | Recap + "Not sure? Watch it again." |

Each term scene: number ("01 / 03"), term title, the definition **verbatim** from the post,
then an animated diagram (~6s), then a code card replacing the diagram, then the example sentence **verbatim**.
A header shows "iOS Daily English · Day N" and a 4-segment progress bar (orange, blue, violet, yellow for the quiz).

Input from the user each day: the post (3 terms with definition + example) and usually 3 quiz questions with a/b/c options.

---

## 2. One-time setup (macOS or Linux)

Requirements: Node.js ≥ 22, FFmpeg, and HyperFrames' headless Chrome.

```sh
# macOS
brew install node ffmpeg
# Debian/Ubuntu
# sudo apt-get install -y ffmpeg   (and Node 22 from nodesource or nvm)

mkdir -p ~/ios-daily-video && cd ~/ios-daily-video
npm init -y
npm i hyperframes gsap@3.14.2 @fontsource/inter @fontsource/jetbrains-mono
export HYPERFRAMES_SKIP_SKILLS=1          # skip the skills download prompt
npx hyperframes telemetry disable
npx hyperframes browser ensure            # downloads Chrome Headless Shell
npx hyperframes doctor                    # FFmpeg + Chrome must be ✓
```

Create the shared project skeleton (all assets are local, because the render browser may not reach CDNs):

```sh
cd ~/ios-daily-video
npx hyperframes init template --example blank --resolution square --non-interactive
mkdir -p template/assets/fonts
cp node_modules/gsap/dist/gsap.min.js template/assets/
for w in 400 500 600 700 800; do cp node_modules/@fontsource/inter/files/inter-latin-$w-normal.woff2 template/assets/fonts/; done
cp node_modules/@fontsource/inter/files/inter-latin-400-italic.woff2 template/assets/fonts/
for w in 400 600; do cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-$w-normal.woff2 template/assets/fonts/; done
```

Then save the reference composition from section 6 as `template/index.html`.

## 3. Making a new day

```sh
cd ~/ios-daily-video
cp -r template dayNNN
# edit dayNNN/index.html (see "What to change" below)
cd dayNNN
HYPERFRAMES_SKIP_SKILLS=1 npx hyperframes check          # must say "Check passed"
npx hyperframes snapshot --at 8.3,15,21,26,34,40,47,80.5 --no-end --describe false
#   look at snapshots/contact-sheet.jpg; zoom with --zoom "#d1"
npx hyperframes render -q high -f 30 -o dayNNN.mp4
```

If render prints `Failed to run ffmpeg -version`, just run it again (transient).

### What to change in index.html
1. `/* ---- day NNN additions ---- */` CSS block: styles for this day's diagrams.
2. Intro: `#i-sub` subtitle and the 3 `.it` term lines.
3. The three `<!-- TERM n -->` scenes: term title (`.term`; wrap type names in `<code>`; shrink
   font-size for long names, e.g. 56–62px), `.def` (verbatim), `#dN` diagram, `#cN` code card, `.example` (verbatim).
4. Script section between `// ---------- term 1` and `// ---------- quiz`: the diagram animations.
   Keep the `termIn` / `termOut` calls; termOut swaps diagram → code at +6s and shows the example at +7.4s.
5. Quiz scenes `#q1..#q3`: `.question` and the three `.name` options, in the user's order.
6. Recap rows (`.row .k` / `.row .v`) and every "Day NNN".

---

## 4. Rules (from reviewer feedback — always follow)

### Quiz
- Countdown is 8 seconds per question (`QUIZ_SECONDS`; keep it 7–10s). Each quiz scene lasts `QUIZ_SECONDS + 3`.
- Labels read "Quiz 1 of 3" (circled ①②③ are not in the bundled fonts).
- **Never reveal the answer.** At the end the clock shows "?" and the line under the bar reads
  "Time's up. Got it?". The outro ends with "Not sure? Watch it again." so viewers rewatch.
- If no quiz is given, write 3 questions: a different order than the terms, each term correct exactly once,
  options reshuffled, and a question never names its own answer.

### Code snippets
- Comments the way a Swift developer writes them: plain `//` sentences. **No ✓ ✗ ✅ ❌ emoji, arrows, or marketing tone.**
  Example: `// Fetch only this document's changes.`
- Show compiler/sanitizer errors as their real text, e.g. `// error: 'tx' used after consume`, `// heap-use-after-free`.
- Mark good/bad lines with the row background (`.ln.good` / `.ln.bad`), not symbols.
- Max ~53 characters per line at 27px (code card is 864px wide), max 6 lines.
- Code font ligatures are disabled (`font-variant-ligatures: none`) so `<!--`, `->`, `==` render literally.
- Snippets are illustrations; tell the user they weren't compiled. Use real APIs only.

### Layout
- No overlaps: tags/badges never sit on a box border or another element; keep ≥ 8px clear space.
- Chips that sit on a line or wire need an opaque background (e.g. `#271a20` orange, `#152236` blue,
  `#122728` green, `#231722` red tints over the dark bg), or the line shows through the text.
- Faded elements must use `autoAlpha` (not `opacity`) so the checker ignores them,
  **except** on `.clip` scene/header elements, which must use `opacity`.
- Don't reuse class names already taken by the code highlighter: `.kw .ty .fn .cm .st .ln`.
- Snapshot each diagram at its busiest moment and check up close before rendering.

### Content
- Definitions and examples are verbatim from the user's post. If one is cut off, ask (or finish minimally and flag it).
- Colors: term 1 orange `--swift`, term 2 `--blue`, term 3 `--violet`, quiz `--quiz` yellow; green `--ok`, red `--err`.

---

## 5. Deliver

Send the MP4 and summarize: diagrams per term, code shown, anything to double-check (uncompiled code,
placeholders), and any glitches. Keep it short.

---

## 6. Reference composition (Day 371) — save as `template/index.html`

```html
<!doctype html>
<html lang="en" data-resolution="square">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1080" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: Inter; font-weight: 400; font-style: normal; src: url(assets/fonts/inter-latin-400-normal.woff2) format("woff2"); }
      @font-face { font-family: Inter; font-weight: 500; font-style: normal; src: url(assets/fonts/inter-latin-500-normal.woff2) format("woff2"); }
      @font-face { font-family: Inter; font-weight: 600; font-style: normal; src: url(assets/fonts/inter-latin-600-normal.woff2) format("woff2"); }
      @font-face { font-family: Inter; font-weight: 700; font-style: normal; src: url(assets/fonts/inter-latin-700-normal.woff2) format("woff2"); }
      @font-face { font-family: Inter; font-weight: 800; font-style: normal; src: url(assets/fonts/inter-latin-800-normal.woff2) format("woff2"); }
      @font-face { font-family: Inter; font-weight: 400; font-style: italic; src: url(assets/fonts/inter-latin-400-italic.woff2) format("woff2"); }
      @font-face { font-family: "JetBrains Mono"; font-weight: 400; src: url(assets/fonts/jetbrains-mono-latin-400-normal.woff2) format("woff2"); }
      @font-face { font-family: "JetBrains Mono"; font-weight: 600; src: url(assets/fonts/jetbrains-mono-latin-600-normal.woff2) format("woff2"); }
      :root {
        --bg: #0b0f1a;
        --panel: #131a2a;
        --line: #26304a;
        --text: #eef1f7;
        --muted: #9aa5bd;
        --swift: #f26b4f;
        --blue: #5aa9ff;
        --violet: #b692ff;
        --err: #ff5d6c;
        --ok: #43d68a;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 1080px; height: 1080px; overflow: hidden;
        background: var(--bg); color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      .bg-glow {
        position: absolute; inset: 0;
        background:
          radial-gradient(700px 500px at 85% -10%, rgba(242, 107, 79, 0.16), transparent 70%),
          radial-gradient(600px 500px at -10% 110%, rgba(90, 169, 255, 0.12), transparent 70%);
      }
      .scene { position: absolute; inset: 0; padding: 64px 72px; }

      /* persistent header */
      .header {
        position: absolute; top: 44px; left: 72px; right: 72px; height: 40px;
        display: flex; align-items: center; justify-content: space-between;
        font-size: 22px; font-weight: 600; color: var(--muted); letter-spacing: 0.02em;
        z-index: 5;
      }
      .header .brand { display: flex; align-items: center; gap: 12px; }
      .phone {
        width: 20px; height: 32px; border: 3px solid var(--swift); border-radius: 6px; position: relative;
      }
      .phone::after {
        content: ""; position: absolute; bottom: 3px; left: 50%; width: 6px; height: 2px;
        margin-left: -3px; background: var(--swift); border-radius: 2px;
      }
      .dots { display: flex; gap: 10px; }
      .dot { width: 44px; height: 6px; border-radius: 3px; background: var(--line); }
      .dot i { display: block; height: 100%; width: 100%; border-radius: 3px; transform-origin: left; transform: scaleX(0); }

      /* intro */
      #intro { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 96px; }
      .kicker { font-size: 30px; font-weight: 600; color: var(--swift); letter-spacing: 0.08em; text-transform: uppercase; }
      .day { font-size: 188px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; margin: 18px 0 30px; }
      .intro-sub { font-size: 38px; font-weight: 500; color: var(--muted); }
      .intro-terms { margin-top: 44px; display: flex; flex-direction: column; gap: 16px; }
      .intro-terms div { font-family: "JetBrains Mono", monospace; font-size: 36px; font-weight: 600; }

      /* term scenes */
      .num { margin-top: 70px; font-family: "JetBrains Mono", monospace; font-size: 26px; font-weight: 600; letter-spacing: 0.06em; }
      .term { font-size: 84px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; margin-top: 8px; }
      .term code { font-family: "JetBrains Mono", monospace; font-weight: 600; letter-spacing: -0.02em; }
      .def { margin-top: 20px; font-size: 31px; line-height: 1.38; color: #cfd6e4; max-width: 920px; }

      .slot { position: absolute; left: 72px; right: 72px; top: 452px; height: 330px; }
      .diagram, .code { position: absolute; inset: 0; }

      .box {
        position: absolute; top: 40px; width: 380px; height: 230px; border-radius: 22px;
        border: 2px solid var(--line); background: rgba(19, 26, 42, 0.8);
      }
      .box.left { left: 0; }
      .box.right { right: 0; }
      .box.dashed { border-style: dashed; }
      .box-label {
        position: absolute; top: 18px; left: 24px; font-size: 22px; font-weight: 600;
        color: var(--muted); font-family: "JetBrains Mono", monospace;
      }
      .chip {
        position: absolute; top: 130px; left: 70px; width: 240px; height: 82px; border-radius: 41px;
        display: flex; align-items: center; justify-content: center; gap: 12px;
        font-family: "JetBrains Mono", monospace; font-size: 26px; font-weight: 600; color: #0b0f1a;
      }
      .chip.ghost { background: transparent !important; border: 3px dashed; }
      .tag {
        position: absolute; font-size: 24px; font-weight: 700; padding: 8px 18px; border-radius: 999px;
        white-space: nowrap;
      }
      .tag.err { color: var(--err); background: rgba(255, 93, 108, 0.12); border: 2px solid rgba(255, 93, 108, 0.5); }
      .tag.ok { color: var(--ok); background: rgba(67, 214, 138, 0.12); border: 2px solid rgba(67, 214, 138, 0.5); }
      .arrow { position: absolute; top: 150px; left: 400px; width: 136px; height: 40px; }

      .code {
        display: flex; flex-direction: column; justify-content: center;
        background: #0e1422; border: 2px solid var(--line); border-radius: 22px;
        padding: 30px 36px; font-family: "JetBrains Mono", monospace; font-size: 27px; line-height: 1.62;
      }
      .ln { white-space: pre; position: relative; font-variant-ligatures: none; }
      .ln.bad { color: var(--err); }
      .ln.bad::before, .ln.good::before {
        content: ""; position: absolute; left: -20px; right: -20px; top: 2px; bottom: 2px; border-radius: 8px;
      }
      .ln.bad::before { background: rgba(255, 93, 108, 0.12); }
      .ln.good::before { background: rgba(67, 214, 138, 0.10); }
      .kw { color: #ff7ab2; }
      .ty { color: #6bdfff; }
      .fn { color: #67b7a4; }
      .cm { color: #7f8aa3; }
      .cm.e { color: var(--err); }
      .cm.o { color: var(--ok); }
      .st { color: #fc6a5d; }

      .example {
        position: absolute; left: 72px; right: 72px; top: 810px;
        border-left: 5px solid; padding: 6px 0 6px 26px;
      }
      .example .lbl { font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
      .example p { margin-top: 10px; font-size: 29px; line-height: 1.42; color: #dfe4ee; font-style: italic; }

      /* outro */
      #outro { display: flex; flex-direction: column; justify-content: center; padding: 0 96px; }
      .recap-title { font-size: 30px; font-weight: 600; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
      .recap { margin-top: 40px; display: flex; flex-direction: column; gap: 26px; }
      .row { display: flex; align-items: baseline; gap: 28px; }
      .row .k { font-family: "JetBrains Mono", monospace; font-size: 40px; font-weight: 600; width: 330px; flex: none; }
      .row .v { font-size: 34px; color: #dfe4ee; }
      .follow { margin-top: 72px; font-size: 32px; font-weight: 600; }
      .follow span { color: var(--swift); }
      /* ---- day 361 additions ---- */
      .term { font-size: 80px; }
      .node {
        position: absolute; height: 70px; border-radius: 16px; border: 2px solid var(--line);
        background: rgba(19, 26, 42, 0.9); display: flex; align-items: center; justify-content: center;
        font-family: "JetBrains Mono", monospace; font-size: 22px; font-weight: 600; color: var(--text);
      }
      .node.buf { border: 2px dashed var(--err); color: var(--err); }
      .lane { position: absolute; left: 0; width: 120px; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; color: var(--muted); }
      .wire { position: absolute; height: 3px; background: var(--line); }
      .pkt { position: absolute; width: 22px; height: 22px; border-radius: 50%; }

      .sub {
        position: absolute; left: 115px; width: 150px; height: 36px; border-radius: 8px;
        border: 2px solid rgba(90, 169, 255, 0.7); background: rgba(90, 169, 255, 0.18);
      }
      .bitmap {
        position: absolute; left: 90px; top: 110px; width: 200px; height: 64px; border-radius: 12px;
        background: var(--blue); color: #0b0f1a; display: flex; align-items: center; justify-content: center;
        font-family: "JetBrains Mono", monospace; font-size: 24px; font-weight: 600;
      }

      .ov {
        position: absolute; width: 420px; height: 170px; border-radius: 18px;
        border: 2px solid rgba(182, 146, 255, 0.8); background: rgba(182, 146, 255, 0.16);
      }
      .ov span { position: absolute; top: 8px; left: 16px; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; color: #d9c8ff; }
      .count { position: absolute; left: 690px; top: 70px; width: 246px; text-align: center; }
      .count b { position: absolute; left: 0; right: 0; top: 0; font-size: 120px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
      .count small { position: absolute; left: 0; right: 0; top: 136px; font-size: 22px; font-weight: 600; color: var(--muted); }

      .row { flex-direction: column; align-items: flex-start; gap: 6px; }
      .row .k { font-family: Inter, sans-serif; font-weight: 800; letter-spacing: -0.02em; width: auto; }
      .row .v { font-size: 30px; }
      .recap { gap: 30px; }
      /* ---- day 362 additions ---- */
      :root { --quiz: #ffc145; }
      .term { font-size: 84px; }
      .vwire { position: absolute; width: 3px; background: var(--line); }
      .node.rec { border-color: rgba(242, 107, 79, 0.6); }
      .share-card {
        position: absolute; left: 400px; top: 10px; width: 536px; height: 300px; border-radius: 22px;
        border: 2px solid var(--swift); background: rgba(242, 107, 79, 0.06);
      }
      .share-card .ttl { position: absolute; top: 16px; left: 24px; font-family: "JetBrains Mono", monospace; font-size: 24px; font-weight: 600; color: var(--swift); }
      .prow { position: absolute; left: 24px; right: 24px; height: 58px; display: flex; align-items: center; gap: 16px; border-radius: 14px; padding: 0 12px; }
      .avatar { width: 40px; height: 40px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #0b0f1a; }
      .pname { font-size: 26px; font-weight: 600; flex: 1; }
      .perm { font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; padding: 6px 14px; border-radius: 999px; border: 2px solid; }
      .link { position: absolute; left: 250px; top: 74px; width: 150px; height: 0; border-top: 3px dashed var(--swift); transform-origin: left; }

      .dbbox { position: absolute; left: 0; right: 0; top: 24px; height: 296px; border-radius: 22px; border: 2px solid var(--line); background: rgba(19, 26, 42, 0.6); }
      .dbbox .dblabel { position: absolute; right: 22px; bottom: 12px; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; color: var(--muted); }
      .zone { position: absolute; top: 46px; width: 420px; height: 196px; border-radius: 18px; border: 2px dashed rgba(90, 169, 255, 0.6); background: rgba(90, 169, 255, 0.05); }
      .zone .zl { position: absolute; top: 12px; left: 18px; font-family: "JetBrains Mono", monospace; font-size: 21px; font-weight: 600; color: var(--blue); }
      .rc { position: absolute; top: 90px; width: 112px; height: 60px; border-radius: 12px; border: 2px solid rgba(90, 169, 255, 0.7); background: rgba(90, 169, 255, 0.16); display: flex; align-items: center; justify-content: center; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; }

      .job { position: absolute; left: 40px; width: 300px; height: 32px; border-radius: 10px; display: flex; align-items: center; padding-left: 16px; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; color: var(--err); border: 2px solid rgba(255, 93, 108, 0.6); background: rgba(255, 93, 108, 0.1); }

      /* quiz */
      #quiz-intro { display: flex; flex-direction: column; justify-content: center; padding: 0 96px; }
      #quiz-intro .kicker { color: var(--quiz); }
      .qbig { font-size: 150px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; margin: 18px 0 30px; }
      .qlabel { margin-top: 70px; font-size: 28px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--quiz); }
      .question { margin-top: 14px; font-size: 40px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; max-width: 760px; }
      .clock { position: absolute; top: 128px; right: 72px; width: 120px; height: 120px; border-radius: 50%; border: 5px solid var(--quiz); }
      .clock b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 60px; font-weight: 800; color: var(--quiz); }
      .clock b.done { color: var(--ok); }
      .opts { position: absolute; left: 72px; right: 72px; top: 470px; display: flex; flex-direction: column; gap: 22px; }
      .opt { position: relative; height: 96px; border-radius: 20px; border: 2px solid var(--line); background: var(--panel); display: flex; align-items: center; gap: 26px; padding: 0 28px; }
      .opt .letter { width: 54px; height: 54px; border-radius: 50%; border: 2px solid var(--muted); display: flex; align-items: center; justify-content: center; font-family: "JetBrains Mono", monospace; font-size: 26px; font-weight: 600; color: var(--muted); }
      .opt .name { font-family: "JetBrains Mono", monospace; font-size: 36px; font-weight: 600; }
      .opt .mark { position: absolute; right: 28px; font-size: 26px; font-weight: 700; color: var(--ok); }
      .timer { position: absolute; left: 72px; right: 72px; top: 860px; height: 12px; border-radius: 6px; background: var(--line); }
      .timer i { position: absolute; inset: 0; border-radius: 6px; background: var(--quiz); transform-origin: left; }
      .tlabel { position: absolute; left: 72px; top: 896px; font-size: 24px; font-weight: 600; color: var(--muted); }
      /* ---- day 371 additions ---- */
      .term { font-size: 80px; }
      .tag.swift { color: var(--swift); background: rgba(242, 107, 79, 0.12); border: 2px solid rgba(242, 107, 79, 0.5); }
      .nd { position: absolute; border-radius: 16px; border: 2px solid var(--line); background: var(--panel); }
      .nd .nl { position: absolute; left: 18px; top: 12px; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; color: var(--muted); }
      .ver { position: absolute; left: 0; right: 0; top: 56px; text-align: center; font-family: "JetBrains Mono", monospace; font-size: 40px; font-weight: 600; }
      .chp { position: absolute; height: 52px; padding: 0 18px; border-radius: 12px; display: flex; align-items: center; font-family: "JetBrains Mono", monospace; font-size: 20px; font-weight: 600; white-space: nowrap; z-index: 2; border: 2px solid var(--line); background: var(--panel); }
      .slice { position: absolute; left: 30px; width: 500px; height: 52px; border-radius: 12px; display: flex; align-items: center; padding-left: 18px; font-family: "JetBrains Mono", monospace; font-size: 21px; font-weight: 600; color: var(--violet); border: 2px solid rgba(182, 146, 255, 0.6); background: #1d1830; z-index: 1; }
      .tgt { position: absolute; left: 650px; width: 286px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; border: 2px solid var(--line); background: var(--panel); z-index: 1; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="82.5" data-width="1080" data-height="1080">
      <div class="bg-glow"></div>

      <div class="header clip" id="header" data-start="0" data-duration="82.5" data-track-index="0">
        <div class="brand"><div class="phone"></div>iOS Daily English · Day 371</div>
        <div class="dots">
          <div class="dot"><i id="p1" style="background: var(--swift)"></i></div>
          <div class="dot"><i id="p2" style="background: var(--blue)"></i></div>
          <div class="dot"><i id="p3" style="background: var(--violet)"></i></div>
          <div class="dot"><i id="p4" style="background: var(--quiz)"></i></div>
        </div>
      </div>

      <div class="scene clip" id="intro" data-start="0" data-duration="3.5" data-track-index="1">
        <div class="kicker" id="i-kicker">iOS Daily English</div>
        <div class="day" id="i-day">Day 371</div>
        <div class="intro-sub" id="i-sub">3 terms on shipping dependencies</div>
        <div class="intro-terms">
          <div class="it" style="color: var(--swift)">Package.resolved</div>
          <div class="it" style="color: var(--blue)">Binary Target</div>
          <div class="it" style="color: var(--violet)">XCFramework</div>
        </div>
      </div>

      <!-- TERM 1: Package.resolved -->
      <div class="scene clip" id="s1" data-start="3.5" data-duration="13" data-track-index="1">
        <div class="num" style="color: var(--swift)">01 / 03</div>
        <div class="term"><code>Package.resolved</code></div>
        <div class="def">The file that records the exact version and commit of every dependency the package manager settled on, so every machine and CI run builds the same code.</div>

        <div class="slot">
          <div class="diagram" id="d1">
            <div class="chp" id="d1-file" style="left: 268px; top: 0px; color: var(--swift); border-color: rgba(242, 107, 79, 0.6); background: #271a20">Package.resolved: 5.2.1</div>
            <div class="nd" style="left: 0px; top: 110px; width: 400px; height: 150px"><span class="nl">your Mac</span><div class="ver" id="d1-mac">5.2.1</div></div>
            <div class="nd" id="d1-ci" style="left: 536px; top: 110px; width: 400px; height: 150px"><span class="nl">CI runner</span><div class="ver" id="d1-ci-bad" style="color: var(--err)">5.4.0</div><div class="ver" id="d1-ci-ok" style="color: var(--ok)">5.2.1</div></div>
            <div class="tag err" id="d1-err" style="top: 272px; left: 536px">file gitignored</div>
            <div class="tag ok" id="d1-ok" style="top: 272px; left: 536px">same code everywhere</div>
          </div>
          <div class="code" id="c1">
<div class="ln"><span class="cm">// Package.swift allows a range.</span></div>
<div class="ln">.<span class="fn">package</span>(url: <span class="st">".../Alamofire"</span>, from: <span class="st">"5.0.0"</span>)</div>
<div class="ln"><span class="cm">// Package.resolved pins one commit. Commit the file.</span></div>
<div class="ln"><span class="st">"identity"</span> : <span class="st">"alamofire"</span>,</div>
<div class="ln good"><span class="st">"version"</span> : <span class="st">"5.2.1"</span>,</div>
<div class="ln good"><span class="st">"revision"</span> : <span class="st">"a1b2c3d…"</span></div>
          </div>
        </div>

        <div class="example" style="border-color: var(--swift)">
          <div class="lbl" style="color: var(--swift)">In a sentence</div>
          <p>"The build broke only on CI because someone had gitignored Package.resolved and the runner picked up a newer minor version."</p>
        </div>
      </div>

      <!-- TERM 2: Binary Target -->
      <div class="scene clip" id="s2" data-start="16.5" data-duration="13" data-track-index="1">
        <div class="num" style="color: var(--blue)">02 / 03</div>
        <div class="term">Binary Target</div>
        <div class="def">A package target that points at a precompiled binary instead of source code, used for closed-source SDKs or to skip compiling a large dependency.</div>

        <div class="slot">
          <div class="diagram" id="d2">
            <div class="chp" id="d2-zip" style="left: 0px; top: 40px; color: var(--blue); border-color: rgba(90, 169, 255, 0.6); background: #152236">VendorSDK.xcframework.zip</div>
            <div class="nd" id="d2-pkg" style="left: 420px; top: 10px; width: 516px; height: 230px"><span class="nl">Package</span></div>
            <div class="chp" style="left: 450px; top: 60px">App · source</div>
            <div class="chp" id="d2-slot" style="left: 450px; top: 150px; color: var(--muted); border-style: dashed">VendorSDK · binary</div>
            <div class="tag err" id="d2-tag" style="top: 262px; left: 420px">no source, nothing to patch</div>
          </div>
          <div class="code" id="c2">
<div class="ln">.<span class="fn">binaryTarget</span>(</div>
<div class="ln">    name: <span class="st">"VendorSDK"</span>,</div>
<div class="ln good">    url: <span class="st">"https://example.com/SDK.xcframework.zip"</span>,</div>
<div class="ln good">    checksum: <span class="st">"6d2f…e91a"</span></div>
<div class="ln">)</div>
<div class="ln"><span class="cm">// Or use path: for a local .xcframework.</span></div>
          </div>
        </div>

        <div class="example" style="border-color: var(--blue)">
          <div class="lbl" style="color: var(--blue)">In a sentence</div>
          <p>"The vendor ships their SDK as a binary target, so we never see its source and cannot patch it ourselves."</p>
        </div>
      </div>

      <!-- TERM 3: XCFramework -->
      <div class="scene clip" id="s3" data-start="29.5" data-duration="13" data-track-index="1">
        <div class="num" style="color: var(--violet)">03 / 03</div>
        <div class="term"><code>XCFramework</code></div>
        <div class="def">A distribution bundle that packs the same framework built for several platforms and architectures, including simulator and device, into one artifact.</div>

        <div class="slot">
          <div class="diagram" id="d3">
            <div class="nd" id="d3-box" style="left: 0px; top: 0px; width: 560px; height: 300px"><span class="nl">Analytics.xcframework</span></div>
            <div class="wire d3-w" style="left: 530px; top: 85px; width: 120px"></div>
            <div class="wire d3-w" style="left: 530px; top: 161px; width: 120px"></div>
            <div class="wire d3-w" style="left: 530px; top: 237px; width: 120px"></div>
            <div class="slice" style="top: 60px">ios-arm64</div>
            <div class="slice" style="top: 136px">ios-arm64_x86_64-simulator</div>
            <div class="slice" style="top: 212px">macos-arm64_x86_64</div>
            <div class="tgt" style="top: 60px">iPhone</div>
            <div class="tgt" style="top: 136px">Simulator</div>
            <div class="tgt" style="top: 212px">Mac</div>
          </div>
          <div class="code" id="c3">
<div class="ln"><span class="fn">xcodebuild</span> -create-xcframework \</div>
<div class="ln">  -framework ios/Analytics.framework \</div>
<div class="ln">  -framework sim/Analytics.framework \</div>
<div class="ln">  -framework mac/Analytics.framework \</div>
<div class="ln good">  -output Analytics.xcframework</div>
          </div>
        </div>

        <div class="example" style="border-color: var(--violet)">
          <div class="lbl" style="color: var(--violet)">In a sentence</div>
          <p>"We publish our analytics library as an XCFramework so one download works for iOS, the simulator, and macOS."</p>
        </div>
      </div>

      <div class="scene clip" id="quiz-intro" data-start="42.5" data-duration="2.5" data-track-index="1">
        <div class="kicker">Your turn</div>
        <div class="qbig">Quiz time</div>
        <div class="intro-sub">3 questions · 8 seconds each</div>
      </div>

      <div class="scene clip" id="q1" data-start="45" data-duration="11" data-track-index="1">
        <div class="qlabel">Quiz 1 of 3</div>
        <div class="question">Which bundle packs one framework built for several platforms and architectures into a single artifact?</div>
        <div class="clock"><b>8</b><b>7</b><b>6</b><b>5</b><b>4</b><b>3</b><b>2</b><b>1</b><b class="done" style="color: var(--quiz)">?</b></div>
        <div class="opts">
          <div class="opt"><div class="letter">a</div><div class="name">Package.resolved</div></div>
          <div class="opt"><div class="letter">b</div><div class="name">XCFramework</div></div>
          <div class="opt"><div class="letter">c</div><div class="name">Binary Target</div></div>
        </div>
        <div class="timer"><i></i></div>
        <div class="tlabel">Answer before the bar runs out</div>
        <div class="tlabel up">Time's up. Got it?</div>
      </div>

      <div class="scene clip" id="q2" data-start="56" data-duration="11" data-track-index="1">
        <div class="qlabel">Quiz 2 of 3</div>
        <div class="question">Which target type points at precompiled code rather than source, as closed-source SDKs require?</div>
        <div class="clock"><b>8</b><b>7</b><b>6</b><b>5</b><b>4</b><b>3</b><b>2</b><b>1</b><b class="done" style="color: var(--quiz)">?</b></div>
        <div class="opts">
          <div class="opt"><div class="letter">a</div><div class="name">XCFramework</div></div>
          <div class="opt"><div class="letter">b</div><div class="name">Binary Target</div></div>
          <div class="opt"><div class="letter">c</div><div class="name">Package.resolved</div></div>
        </div>
        <div class="timer"><i></i></div>
        <div class="tlabel">Answer before the bar runs out</div>
        <div class="tlabel up">Time's up. Got it?</div>
      </div>

      <div class="scene clip" id="q3" data-start="67" data-duration="11" data-track-index="1">
        <div class="qlabel">Quiz 3 of 3</div>
        <div class="question">Which file records the exact resolved version of every dependency so builds are reproducible?</div>
        <div class="clock"><b>8</b><b>7</b><b>6</b><b>5</b><b>4</b><b>3</b><b>2</b><b>1</b><b class="done" style="color: var(--quiz)">?</b></div>
        <div class="opts">
          <div class="opt"><div class="letter">a</div><div class="name">Binary Target</div></div>
          <div class="opt"><div class="letter">b</div><div class="name">XCFramework</div></div>
          <div class="opt"><div class="letter">c</div><div class="name">Package.resolved</div></div>
        </div>
        <div class="timer"><i></i></div>
        <div class="tlabel">Answer before the bar runs out</div>
        <div class="tlabel up">Time's up. Got it?</div>
      </div>

      <div class="scene clip" id="outro" data-start="78" data-duration="4.5" data-track-index="1">
        <div class="recap-title">Recap</div>
        <div class="recap">
          <div class="row"><div class="k" style="color: var(--swift)">Package.resolved</div><div class="v">exact versions, so every build matches</div></div>
          <div class="row"><div class="k" style="color: var(--blue)">Binary Target</div><div class="v">a dependency shipped prebuilt, not as source</div></div>
          <div class="row"><div class="k" style="color: var(--violet)">XCFramework</div><div class="v">one bundle for every platform and simulator</div></div>
        </div>
        <div class="follow">Not sure? <span>Watch it again.</span></div>
      </div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const E = "power3.out";

      tl.fromTo("#header", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.5, ease: E }, 0);
      tl.fromTo("#i-kicker", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: E }, 0.1);
      tl.fromTo("#i-day", { autoAlpha: 0, y: 40, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: E }, 0.25);
      tl.fromTo("#i-sub", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: E }, 0.6);
      tl.fromTo("#intro .it", { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: E, stagger: 0.18 }, 0.9);
      tl.to("#intro", { opacity: 0, duration: 0.4 }, 3.1);

      function termIn(id, t0) {
        tl.fromTo(`${id} .num`, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t0);
        tl.fromTo(`${id} .term`, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: E }, t0 + 0.1);
        tl.fromTo(`${id} .def`, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: E }, t0 + 0.45);
      }
      function termOut(id, d, c, t0) {
        tl.to(d, { autoAlpha: 0, y: -16, duration: 0.4 }, t0 + 6);
        tl.fromTo(c, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: E }, t0 + 6.2);
        tl.fromTo(`${c} .ln`, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: E, stagger: 0.22 }, t0 + 6.4);
        tl.fromTo(`${id} .example`, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: E }, t0 + 7.4);
        tl.to(id, { opacity: 0, duration: 0.4 }, t0 + 12.6);
      }
      tl.set(["#c1", "#c2", "#c3", ".example"], { autoAlpha: 0 }, 0);

      // ---------- term 1: Package.resolved ----------
      let t = 3.5;
      tl.to("#p1", { scaleX: 1, duration: 13, ease: "none" }, t);
      termIn("#s1", t);
      tl.set(["#d1-file", "#d1-ci-ok", "#d1-ok", "#d1-err", "#d1-mac", "#d1-ci-bad"], { autoAlpha: 0 }, 0);
      tl.fromTo("#d1 .nd", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E, stagger: 0.12 }, t + 0.9);
      // without the file, each machine resolves the range on its own
      tl.to(["#d1-mac", "#d1-ci-bad"], { autoAlpha: 1, duration: 0.3, stagger: 0.3 }, t + 1.4);
      tl.to("#d1-ci", { borderColor: "#ff5d6c", duration: 0.3 }, t + 1.8);
      tl.fromTo("#d1-err", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: E }, t + 1.9);
      // with the committed file, both build the same commit
      tl.fromTo("#d1-file", { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t + 3.2);
      tl.to(["#d1-err", "#d1-ci-bad"], { autoAlpha: 0, duration: 0.2 }, t + 3.7);
      tl.to("#d1-ci-ok", { autoAlpha: 1, duration: 0.3 }, t + 3.8);
      tl.to("#d1-ci", { borderColor: "#43d68a", duration: 0.3 }, t + 3.8);
      tl.fromTo("#d1-ok", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: E }, t + 4.0);
      termOut("#s1", "#d1", "#c1", t);

      // ---------- term 2: Binary Target ----------
      t = 16.5;
      tl.to("#p2", { scaleX: 1, duration: 13, ease: "none" }, t);
      termIn("#s2", t);
      tl.set("#d2-tag", { autoAlpha: 0 }, 0);
      tl.fromTo("#d2 .nd, #d2 .chp", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: E, stagger: 0.12 }, t + 0.9);
      // the prebuilt zip drops into the binary slot
      tl.to("#d2-zip", { x: 450, y: 110, scale: 0.9, duration: 0.9, ease: "power2.inOut" }, t + 2.2);
      tl.to("#d2-zip", { autoAlpha: 0, duration: 0.2 }, t + 3.1);
      tl.to("#d2-slot", { color: "#5aa9ff", borderStyle: "solid", borderColor: "#5aa9ff", backgroundColor: "#152236", duration: 0.3 }, t + 3.1);
      tl.fromTo("#d2-tag", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: E }, t + 3.6);
      termOut("#s2", "#d2", "#c2", t);

      // ---------- term 3: XCFramework ----------
      t = 29.5;
      tl.to("#p3", { scaleX: 1, duration: 13, ease: "none" }, t);
      termIn("#s3", t);
      tl.set(".d3-w", { autoAlpha: 0 }, 0);
      tl.fromTo("#d3-box", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t + 0.9);
      tl.fromTo("#d3 .slice", { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: E, stagger: 0.2 }, t + 1.3);
      tl.fromTo("#d3 .tgt", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.1 }, t + 2.2);
      // each platform picks its own slice from the one bundle
      tl.to(".d3-w", { autoAlpha: 1, backgroundColor: "#43d68a", duration: 0.3, stagger: 0.35 }, t + 2.8);
      tl.to("#d3 .tgt", { color: "#43d68a", borderColor: "#43d68a", duration: 0.3, stagger: 0.35 }, t + 2.9);
      termOut("#s3", "#d3", "#c3", t);

      // ---------- quiz (no answer reveal, so viewers rewatch) ----------
      t = 42.5;
      tl.fromTo("#quiz-intro .kicker", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t);
      tl.fromTo("#quiz-intro .qbig", { autoAlpha: 0, y: 40, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: E }, t + 0.15);
      tl.fromTo("#quiz-intro .intro-sub", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t + 0.5);
      tl.to("#quiz-intro", { opacity: 0, duration: 0.35 }, t + 2.15);
      tl.to("#p4", { scaleX: 1, duration: 35.5, ease: "none" }, t);

      const QUIZ_SECONDS = 8; // countdown length per question
      function quiz(id, t0) {
        const q = (s) => `${id} ${s}`;
        tl.set([q(".clock b"), q(".tlabel.up")], { autoAlpha: 0 }, 0);
        tl.fromTo(q(".qlabel"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t0);
        tl.fromTo(q(".question"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: E }, t0 + 0.15);
        tl.fromTo(q(".clock"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, t0 + 0.3);
        tl.fromTo(q(".opt"), { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: E, stagger: 0.12 }, t0 + 0.5);
        tl.fromTo(q(".timer"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t0 + 0.9);
        tl.fromTo(q(".tlabel:not(.up)"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t0 + 0.9);
        const go = t0 + 1.2;
        tl.fromTo(q(".timer i"), { scaleX: 1 }, { scaleX: 0, duration: QUIZ_SECONDS, ease: "none" }, go);
        tl.to(q(".timer i"), { backgroundColor: "#ff5d6c", duration: 2 }, go + QUIZ_SECONDS - 2);
        for (let n = 0; n < QUIZ_SECONDS; n++) {
          const b = `${id} .clock b:nth-child(${n + 1})`;
          tl.fromTo(b, { autoAlpha: 1, scale: 1.25 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: E }, n === 0 ? t0 + 0.3 : go + n);
          tl.set(b, { autoAlpha: 0 }, go + n + 1);
        }
        // time's up: no answer shown
        const r = go + QUIZ_SECONDS;
        tl.fromTo(q(".clock b.done"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, r);
        tl.set(q(".tlabel:not(.up)"), { autoAlpha: 0 }, r);
        tl.fromTo(q(".tlabel.up"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, r);
        tl.to(id, { opacity: 0, duration: 0.35 }, r + 1.45);
      }
      quiz("#q1", 45);
      quiz("#q2", 56);
      quiz("#q3", 67);

      t = 78;
      tl.fromTo("#outro .recap-title", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: E }, t);
      tl.fromTo("#outro .row", { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: E, stagger: 0.2 }, t + 0.25);
      tl.fromTo("#outro .follow", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: E }, t + 1.2);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>

```
