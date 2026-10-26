#!/usr/bin/env bash
# Full landscape + hooks render for one or more days, strictly one after the other (renders use all CPU cores and Chrome).
#   scripts/render-day-landscape.sh 2 3 4      (day numbers; stops at the first failure)
# Per day: tts -> timing -> scaffold (landscape + hooks) -> check -> render -> thumbnail -> audio/size report.
# Never touches the old vertical files (video/dayNNN/, video/out/day-NNN*.mp4, day-NNN-thumb.png).
set -euo pipefail
cd "$(dirname "$0")/.."
for n in "$@"; do
  p=$(printf "%03d" "$n"); J=content/days/day-$p.json; short=$(printf "%03d" "$n")
  echo "=== Day $n ==="
  node scripts/tts-landscape.mjs "$J" | tail -1
  node scripts/timing-landscape.mjs "$J" | head -1
  node scripts/scaffold-landscape.mjs "$J"
  node scripts/scaffold-hooks.mjs "$J"
  node scripts/thumbnail.mjs "$J" --landscape
  for d in day$short-landscape day$short-hook1 day$short-hook2 day$short-hook3; do
    ( cd video/$d && npx hyperframes check 2>&1 | grep -E "✗ .*(Invalid|template_literal)|Check (passed|failed)" ; npx hyperframes check >/dev/null 2>&1 ) || { echo "check failed: $d"; exit 1; }
    ( cd video/$d && npx hyperframes render -q high -f 30 -o ../out/$d.mp4 2>&1 | grep rendered )
  done
  for f in day$short-landscape day$short-hook1 day$short-hook2 day$short-hook3; do
    printf "%s " "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 video/out/$f.mp4 | tr '\n' ' '
    ffmpeg -hide_banner -i video/out/$f.mp4 -af "volumedetect,silencedetect=n=-45dB:d=2" -vn -f null - 2>&1 | grep -E "mean_volume|max_volume|silence_duration" | awk '{printf "%s%s ", $(NF-1), $NF}'; echo "(silences >2s at -45 dB are listed after the two levels)"
  done
  node scripts/youtube-upload.mjs "$J" --kind landscape --dry-run | sed -n '/^chapters:/,/^description/p' | head -12
done
