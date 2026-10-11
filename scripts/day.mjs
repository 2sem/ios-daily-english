#!/usr/bin/env node
// Day registry for the iOS Daily English channel. No dependencies.
//   node scripts/day.mjs next                 -> next day number + phase hint
//   node scripts/day.mjs check "Term" ...     -> exit 1 if any term was already used
//   node scripts/day.mjs add content/days/day-NNN.json
//                                             -> validate, reject duplicates, register terms, render post
//   node scripts/day.mjs list                 -> all days and their pipeline status
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const daysDir = join(root, "content", "days");
const indexPath = join(root, "content", "terms.json");

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");
const pad = (n) => String(n).padStart(3, "0");

function loadIndex() {
  return existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) : { terms: {} };
}
function dayFiles() {
  return existsSync(daysDir)
    ? readdirSync(daysDir).filter((f) => /^day-\d+\.json$/.test(f)).sort()
    : [];
}
function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function validate(d) {
  const errs = [];
  if (!Number.isInteger(d.day) || d.day < 1) errs.push("day must be a positive integer");
  if (!Array.isArray(d.terms) || d.terms.length !== 3) errs.push("exactly 3 terms required");
  if (!Array.isArray(d.quizzes) || d.quizzes.length !== 3) errs.push("exactly 3 quizzes required");
  (d.terms ?? []).forEach((t, i) => {
    for (const k of ["term", "definition", "example"]) if (!t[k]) errs.push(`terms[${i}].${k} missing`);
  });
  const tn = (d.terms ?? []).map((t) => norm(t.term ?? ""));
  if (new Set(tn).size !== tn.length) errs.push("duplicate term inside the same day");
  const answers = [];
  (d.quizzes ?? []).forEach((q, i) => {
    if (!q.question) errs.push(`quizzes[${i}].question missing`);
    if (!Array.isArray(q.options) || q.options.length !== 3) errs.push(`quizzes[${i}] needs 3 options`);
    else {
      const key = "abc".indexOf(q.answer);
      if (key < 0) errs.push(`quizzes[${i}].answer must be a, b or c`);
      else {
        const correct = norm(q.options[key]);
        answers.push(correct);
        if (!tn.includes(correct)) errs.push(`quizzes[${i}] correct option is not one of today's terms`);
        if (norm(q.question).includes(correct)) errs.push(`quizzes[${i}] question names its own answer`);
      }
    }
  });
  if (answers.length === 3 && new Set(answers).size !== 3) errs.push("each term must be the correct answer exactly once");
  return errs;
}

function renderPost(d) {
  const circled = ["①", "②", "③"];
  const terms = d.terms.map((t) => `${t.term}\n- ${t.definition}\n- Example: "${t.example}"`).join("\n\n");
  const quiz = d.quizzes
    .map((q, i) => `Quiz ${circled[i]}\n${q.question}\n${q.options.map((o, j) => `${"abc"[j]}) ${o}`).join("\n")}`)
    .join("\n\n");
  return `📱 iOS Daily English - Day ${d.day}\n\n${terms}\n\n\n${quiz}\n`;
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "next") {
  const files = dayFiles();
  const n = files.length ? Number(files.at(-1).match(/\d+/)[0]) + 1 : 1;
  const used = Object.values(loadIndex().terms).map((v) => v.term);
  console.log(JSON.stringify({ nextDay: n, file: `content/days/day-${pad(n)}.json`, usedTermCount: used.length, usedTerms: used }, null, 2));
} else if (cmd === "check") {
  if (!args.length) fail("usage: check <term> [term...]");
  const idx = loadIndex().terms;
  const dups = args.filter((t) => idx[norm(t)]);
  dups.forEach((t) => console.error(`duplicate: "${t}" (Day ${idx[norm(t)].day})`));
  if (dups.length) process.exit(1);
  console.log("ok: no duplicates");
} else if (cmd === "add") {
  const file = args[0];
  if (!file) fail("usage: add <content/days/day-NNN.json>");
  const d = JSON.parse(readFileSync(resolve(file), "utf8"));
  const errs = validate(d);
  const index = loadIndex();
  for (const t of d.terms ?? []) {
    const hit = index.terms[norm(t.term ?? "")];
    if (hit && hit.day !== d.day) errs.push(`"${t.term}" already used on Day ${hit.day}`);
  }
  if (errs.length) fail(errs.join("\n       "));
  for (const t of d.terms) index.terms[norm(t.term)] = { term: t.term, day: d.day };
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
  const postPath = join(daysDir, `day-${pad(d.day)}.post.txt`);
  writeFileSync(postPath, renderPost(d));
  console.log(`registered Day ${d.day}: ${d.terms.map((t) => t.term).join(", ")}\nwrote ${postPath}`);
} else if (cmd === "list") {
  for (const f of dayFiles()) {
    const d = JSON.parse(readFileSync(join(daysDir, f), "utf8"));
    const s = d.status ?? {};
    console.log(`Day ${d.day}  ${d.terms.map((t) => t.term).join(" / ")}  video:${s.video ?? "todo"}  youtube:${s.youtube ?? "todo"}`);
  }
} else {
  fail("commands: next | check | add | list");
}
