#!/usr/bin/env node
// Builds a 1280x720 YouTube thumbnail for a day (logo + "Day N" + the three terms) and screenshots it with
// the headless Chrome that hyperframes already downloaded. No packages.
//   node scripts/thumbnail.mjs content/days/day-001.json   -> video/out/day-001-thumb.png
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) { console.error("usage: thumbnail.mjs <content/days/day-NNN.json>"); process.exit(1); }
const day = JSON.parse(readFileSync(resolve(file), "utf8"));
const pad = String(day.day).padStart(3, "0");

// headless Chrome installed by `hyperframes browser ensure`
const base = join(homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
const versions = existsSync(base) ? readdirSync(base).sort() : [];
const chrome = versions.length ? join(base, versions.at(-1), "chrome-headless-shell-mac-arm64", "chrome-headless-shell") : null;
if (!chrome || !existsSync(chrome)) { console.error("headless Chrome not found; run: cd video && npx hyperframes browser ensure"); process.exit(1); }

const fonts = join(root, "video", "template", "assets", "fonts");
const logo = join(root, "brand", "logo.png");
const colors = ["#f26b4f", "#5aa9ff", "#b692ff"];
const terms = day.terms.map((t, i) => `<div class="t" style="color:${colors[i]}">${t.term}</div>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:800;src:url(file://${fonts}/inter-latin-800-normal.woff2)}
@font-face{font-family:Inter;font-weight:600;src:url(file://${fonts}/inter-latin-600-normal.woff2)}
@font-face{font-family:JB;font-weight:600;src:url(file://${fonts}/jetbrains-mono-latin-600-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1280px;height:720px;overflow:hidden;background:#0b0f1a;color:#eef1f7;font-family:Inter,sans-serif}
.bg{position:absolute;inset:0;background:radial-gradient(800px 520px at 88% -10%,rgba(242,107,79,.22),transparent 70%),radial-gradient(700px 520px at -8% 112%,rgba(90,169,255,.18),transparent 70%)}
.logo{position:absolute;left:62px;top:61px;width:598px;height:598px;border-radius:120px;overflow:hidden;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.logo img{width:598px;height:598px;image-rendering:pixelated;display:block}
.col{position:absolute;left:720px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center}
.k{font-size:30px;font-weight:600;color:#f26b4f;letter-spacing:.08em;text-transform:uppercase}
.d{font-size:200px;font-weight:800;letter-spacing:-.05em;line-height:1;margin:6px 0 26px}
.t{font-family:JB,monospace;font-size:56px;font-weight:600;line-height:1.28;white-space:nowrap}
</style></head><body><div class="bg"></div>
<div class="logo"><img src="file://${logo}"></div>
<div class="col"><div class="k">iOS Daily English</div><div class="d">Day ${day.day}</div>${terms}</div>
</body></html>`;

const out = join(root, "video", "out");
mkdirSync(out, { recursive: true });
const htmlPath = join(out, `day-${pad}-thumb.html`);
const png = join(out, `day-${pad}-thumb.png`);
writeFileSync(htmlPath, html);
execFileSync(chrome, ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1280,720", "--allow-file-access-from-files", `--screenshot=${png}`, `file://${htmlPath}`], { stdio: "ignore" });
console.log(`${png} (${(statSync(png).size / 1024).toFixed(0)} KB)`);
