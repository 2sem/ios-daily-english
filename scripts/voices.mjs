// Which TTS voices a day uses. Rotates so consecutive videos sound different:
//   day % 3 == 1 -> female narrator, male example
//   day % 3 == 2 -> male narrator, female example
//   day % 3 == 0 -> random (seeded by the day number, so a re-render keeps the same voices)
export const FEMALE = ["Samantha", "Flo (영어(미국))", "Sandy (영어(미국))", "Shelley (영어(미국))", "Karen", "Moira"];
export const MALE = ["Reed (영어(미국))", "Eddy (영어(미국))", "Rocko (영어(미국))", "Daniel", "Rishi"];

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

export function pickVoices(day) {
  const r = rng(day);
  const f = FEMALE[(day - 1) % FEMALE.length];
  const m = MALE[(day - 1) % MALE.length];
  const mode = day % 3;
  if (mode === 1) return { narrator: f, example: m, pattern: "female -> male" };
  if (mode === 2) return { narrator: m, example: f, pattern: "male -> female" };
  const narratorFemale = r() < 0.5;
  const fv = FEMALE[Math.floor(r() * FEMALE.length)];
  const mv = MALE[Math.floor(r() * MALE.length)];
  return narratorFemale
    ? { narrator: fv, example: mv, pattern: "random (female -> male)" }
    : { narrator: mv, example: fv, pattern: "random (male -> female)" };
}
