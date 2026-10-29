#!/usr/bin/env node
// Builds a portrait 1080x1920 (9:16) YouTube thumbnail for a day for the vertical Shorts (logo + "Day N" + the three terms) and screenshots it with
// the headless Chrome that hyperframes already downloaded. No packages.
// Landscape: if the day JSON has `thumbnailHook` (short hook sentence), it is the big text with a "Day N" badge instead of the big Day number.
//   node scripts/thumbnail.mjs content/days/day-001.json   -> video/out/day-001-thumb.png
//   node scripts/thumbnail.mjs content/days/day-013.json --linkedin    -> video/out/day-013-thumb-linkedin.png (1280x720, newsletter cover)
//   node scripts/thumbnail.mjs content/days/day-013.json --landscape   -> video/out/day-013-thumb-landscape.png (1280x720)
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

const landscape = process.argv.includes("--landscape"); // 1280x720 for the long-form video
const linkedin = process.argv.includes("--linkedin"); // 1280x720 cover for the LinkedIn newsletter (professional tone, code panel)
const W = landscape || linkedin ? 1280 : 1080, H = landscape || linkedin ? 720 : 1920;
const lterms = day.terms.map((t, i) => `<div class="lt" style="color:${colors[i]}">${t.term}</div>`).join("");
const landscapeHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:800;src:url(file://${fonts}/inter-latin-800-normal.woff2)}
@font-face{font-family:Inter;font-weight:600;src:url(file://${fonts}/inter-latin-600-normal.woff2)}
@font-face{font-family:JB;font-weight:600;src:url(file://${fonts}/jetbrains-mono-latin-600-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1280px;height:720px;overflow:hidden;background:#0b0f1a;color:#eef1f7;font-family:Inter,sans-serif}
.bg{position:absolute;inset:0;background:radial-gradient(800px 500px at 92% -10%,rgba(242,107,79,.24),transparent 70%),radial-gradient(700px 500px at -6% 112%,rgba(90,169,255,.2),transparent 70%)}
.wrap{position:absolute;inset:0;display:flex;align-items:center;padding:0 70px;gap:64px}
.logo{width:340px;height:340px;flex:none;border-radius:76px;overflow:hidden;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.55)}
.logo img{width:100%;height:100%;image-rendering:pixelated;display:block}
.k{font-size:30px;font-weight:600;color:#f26b4f;letter-spacing:.08em;text-transform:uppercase}
.d{font-size:150px;font-weight:800;letter-spacing:-.05em;line-height:1;margin:6px 0 22px}
.lt{font-family:JB,monospace;font-size:62px;font-weight:600;line-height:1.28;white-space:nowrap}
.cv{margin-top:18px;font-size:34px;font-weight:700;color:#ffc145}
.badge{display:inline-block;font-size:34px;font-weight:800;color:#0b0f1a;background:#f26b4f;border-radius:14px;padding:6px 20px;margin:12px 0 18px}
.h{font-size:112px;font-weight:800;letter-spacing:-.04em;line-height:1.02;margin-bottom:26px}
.sub{font-family:JB,monospace;font-size:40px;font-weight:600;line-height:1.3}
</style></head><body><div class="bg"></div>
<div class="wrap"><div class="logo"><img src="file://${logo}"></div>${day.thumbnailHook
  ? `<div><div class="k">iOS Daily English</div><div class="badge">Day ${day.day}</div><div class="h">${day.thumbnailHook}</div><div class="sub">${day.terms.map((t, i) => `<span style="color:${colors[i]}">${t.term}</span>`).join(" · ")}</div></div>`
  : `<div><div class="k">iOS Daily English</div><div class="d">Day ${day.day}</div>${lterms}${day.dialogue ? `<div class="cv">+ a real conversation</div>` : ""}</div>`}</div>
</body></html>`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const linkedinHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:800;src:url(file://${fonts}/inter-latin-800-normal.woff2)}
@font-face{font-family:Inter;font-weight:600;src:url(file://${fonts}/inter-latin-600-normal.woff2)}
@font-face{font-family:JB;font-weight:600;src:url(file://${fonts}/jetbrains-mono-latin-600-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1280px;height:720px;overflow:hidden;background:#0b0f1a;color:#eef1f7;font-family:Inter,sans-serif}
.bg{position:absolute;inset:0;background:radial-gradient(800px 500px at 95% -10%,rgba(242,107,79,.22),transparent 70%),radial-gradient(700px 500px at -6% 112%,rgba(90,169,255,.18),transparent 70%)}
.top{position:absolute;left:64px;top:52px;display:flex;align-items:center;gap:18px}
.top img{width:64px;height:64px;border-radius:15px;background:#fff;image-rendering:pixelated}
.k{font-size:26px;font-weight:600;color:#f26b4f;letter-spacing:.08em;text-transform:uppercase}
.badge{font-size:26px;font-weight:800;color:#0b0f1a;background:#f26b4f;border-radius:10px;padding:4px 14px}
.l{position:absolute;left:64px;top:210px;width:600px}
.h{font-size:96px;font-weight:800;letter-spacing:-.04em;line-height:1.02}
.sub{margin-top:30px;font-family:JB,monospace;font-size:44px;font-weight:600;line-height:1.3}
.chat{position:absolute;right:56px;top:150px;width:540px;display:flex;flex-direction:column;gap:26px}
.m{display:flex;flex-direction:column;gap:8px}
.m.r{align-items:flex-end}
.who{font-size:22px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8b97b3}
.b{font-size:36px;font-weight:600;line-height:1.28;padding:22px 28px;border-radius:26px;background:#18223a;border:2px solid #243049;box-shadow:0 18px 44px rgba(0,0,0,.45)}
.m .b{border-bottom-left-radius:8px}.m.r .b{border-bottom-right-radius:8px;background:#1f2c4d}
.hl{font-weight:800;border-bottom:4px solid currentColor}
</style></head><body><div class="bg"></div>
<div class="top"><img src="file://${logo}"><div class="k">iOS Daily English</div><div class="badge">Day ${day.day}</div></div>
<div class="l"><div class="h">${day.linkedinHook || "Code review English"}</div><div class="sub">${day.terms.map((t, i) => `<span style="color:${colors[i]}">${t.term}</span>`).join(" · ")}</div></div>
<div class="chat">${[[day.terms[0], "Mina", ""], [day.terms[2], "Jake", " r"]].map(([t, who, cls], i) => `<div class="m${cls}"><div class="who">${who}</div><div class="b">${esc(t.example).replace(new RegExp(`\\b(${t.term}s?)\\b`, "gi"), (m) => `<span class="hl" style="color:${colors[i * 2]}">${m}</span>`)}</div></div>`).join("")}</div>
</body></html>`;
const html = linkedin ? linkedinHtml : landscape ? landscapeHtml : `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:800;src:url(file://${fonts}/inter-latin-800-normal.woff2)}
@font-face{font-family:Inter;font-weight:600;src:url(file://${fonts}/inter-latin-600-normal.woff2)}
@font-face{font-family:JB;font-weight:600;src:url(file://${fonts}/jetbrains-mono-latin-600-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#0b0f1a;color:#eef1f7;font-family:Inter,sans-serif}
.bg{position:absolute;inset:0;background:radial-gradient(900px 700px at 90% -4%,rgba(242,107,79,.22),transparent 70%),radial-gradient(800px 700px at -10% 108%,rgba(90,169,255,.18),transparent 70%)}
.wrap{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;padding-top:250px}
.logo{width:598px;height:598px;border-radius:120px;overflow:hidden;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.logo img{width:598px;height:598px;image-rendering:pixelated;display:block}
.k{margin-top:80px;font-size:40px;font-weight:600;color:#f26b4f;letter-spacing:.08em;text-transform:uppercase}
.d{font-size:300px;font-weight:800;letter-spacing:-.05em;line-height:1;margin:10px 0 40px}
.t{font-family:JB,monospace;font-size:78px;font-weight:600;line-height:1.3;white-space:nowrap;text-align:center}
</style></head><body><div class="bg"></div>
<div class="wrap"><div class="logo"><img src="file://${logo}"></div><div class="k">iOS Daily English</div><div class="d">Day ${day.day}</div>${terms}</div>
</body></html>`;

const out = join(root, "video", "out");
mkdirSync(out, { recursive: true });
const sfx = linkedin ? "-thumb-linkedin" : landscape ? "-thumb-landscape" : "-thumb";
const htmlPath = join(out, `day-${pad}${sfx}.html`);
const png = join(out, `day-${pad}${sfx}.png`);
writeFileSync(htmlPath, html);
execFileSync(chrome, ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${W},${H}`, "--allow-file-access-from-files", `--screenshot=${png}`, `file://${htmlPath}`], { stdio: "ignore" });
console.log(`${png} (${(statSync(png).size / 1024).toFixed(0)} KB)`);
