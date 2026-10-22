// Which TTS voices a day uses. Rotates so consecutive videos sound different:
//   day % 3 == 1 -> female narrator, male example
//   day % 3 == 2 -> male narrator, female example
//   day % 3 == 0 -> random (seeded by the day number, so a re-render keeps the same voices)
// Default engine is edge-tts (Microsoft neural voices, en-US). Offline fallback is macOS `say`, where
// Premium/Enhanced neural voices (System Settings > Accessibility > Spoken Content) are preferred when installed.
import { execFileSync } from "node:child_process";
const EDGE_F = ["en-US-AvaNeural", "en-US-JennyNeural", "en-US-AriaNeural"]; // EmmaNeural left out: intermittently rejects some --rate values
const EDGE_M = ["en-US-AndrewNeural", "en-US-GuyNeural", "en-US-BrianNeural"];
const PREMIUM_F = ["Ava (Premium)", "Zoe (Premium)"];
const PREMIUM_M = ["Evan (Enhanced)", "Tom (Enhanced)"];
const BASIC_F = ["Samantha", "Flo (영어(미국))", "Sandy (영어(미국))", "Shelley (영어(미국))", "Karen", "Moira"];
const BASIC_M = ["Reed (영어(미국))", "Eddy (영어(미국))", "Rocko (영어(미국))", "Daniel", "Rishi"];

let installed = "";
try { installed = execFileSync("say", ["-v", "?"], { encoding: "utf8" }); } catch {}
const have = (names) => names.filter((n) => installed.includes(n));
const SAY_F = have(PREMIUM_F).length ? have(PREMIUM_F) : BASIC_F;
const SAY_M = have(PREMIUM_M).length ? have(PREMIUM_M) : BASIC_M;

function rng(seed) {
  let a = seed * 2654435761 >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickVoices(day, engine = "edge") {
  const FEMALE = engine === "say" ? SAY_F : EDGE_F;
  const MALE = engine === "say" ? SAY_M : EDGE_M;
  const r = rng(day);
  const f = FEMALE[(day - 1) % FEMALE.length];
  const m = MALE[(day - 1) % MALE.length];
  const mode = day % 3;
  if (mode === 1) return { narrator: f, example: m, pattern: "female -> male", engine };
  if (mode === 2) return { narrator: m, example: f, pattern: "male -> female", engine };
  const narratorFemale = r() < 0.5;
  const fv = FEMALE[Math.floor(r() * FEMALE.length)];
  const mv = MALE[Math.floor(r() * MALE.length)];
  return narratorFemale
    ? { narrator: fv, example: mv, pattern: "random (female -> male)", engine }
    : { narrator: mv, example: fv, pattern: "random (male -> female)", engine };
}
