# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **static GitHub Pages site** that turns a day's "iOS Daily English" study notes into
shareable card-news images. The user pastes a day's raw text, the app parses it into
structured fields (editable), renders a live preview of Instagram-portrait cards, and
exports them as a **PDF** (each card captured as PNG, then embedded page-by-page).

There is **no application code yet** — only the design handoff bundle (see below). The
first implementation task is to recreate that design as a real, shippable static site.

## Design source (the spec)

`design/project/Card News Generator.dc.html` is a **Claude Design handoff** — an
HTML/CSS/JS prototype, not shippable code. It is the authoritative visual + behavioral
spec. Read it top to bottom before implementing. `design/project/support.js` is the
Claude Design runtime (`x-dc` / `DCLogic` template engine) — a prototype-only harness;
**do not ship it**. Recreate the design in plain, dependency-light static web code.

> Naming note: the bundle folder says "png generator", but the UI ships a **Download PDF**
> button and exports PDF via jspdf. It captures each card as PNG, then packs them into a PDF.

`design/project/screens/*.png` are reference renders of the four card types.

## Architecture (derived from the design)

Two-pane layout:

- **Left — form.** A "Paste & auto-fill" textarea + parser, then editable sections:
  Header (day / emoji / title), Vocabulary (repeatable terms), Quizzes (repeatable,
  each with a/b/c options), Previous Day (answers + quick-review list).
- **Right — preview.** A live wall of cards rendered at true **1080×1350** (4:5), shown
  scaled to `0.32`. Card types, one section each in the design:
  - `cover` — dark gradient, big DAY number, title, term list, handle.
  - `vocab` — one card **per term**: term chip, definition, usage example.
  - `quiz` — one card **per quiz**: number, question, lettered options.
  - `answers` — single card: previous day's answers + quick review.

Card list is built as `[cover, ...vocab, ...quiz, answers]`; page footers show `i / total`.

### Parsing (`parsePaste` in the design)

Heuristic text → structured data. Key rules to preserve:
- **Header** from first non-empty line: leading emoji, `Title – Day N` pattern, `Day N`.
- **Sections** split by markers: `Quiz`, `Day N Answers`, `iOS note:`. Vocab is everything
  before the first of those.
- **Vocab** blocks split on blank lines; first line = term (`^[A-Za-z][\w.]+$`),
  `Example:` line → example, remaining lines → definition.
- **Quizzes** split on `Quiz` markers; option lines match `^([a-eA-E])[).:] text`.
- **Answers** use the same option-line regex; **Quick review** lines match `term - desc`.

### Export

- Capture: `html-to-image` `toPng(node, { width:1080, height:1350, pixelRatio:2 })`, after
  temporarily neutralizing the preview's `transform: scale()` so the node renders at full
  1080×1350, then restoring it.
- Assemble: `jspdf` with `format:[1080,1350]`, one page per card.
- Two entry points: per-card **PDF** button and header **Download PDF** (all cards).
- Filenames: `ios-day-<day>-cards.pdf`, `ios-day-<day>-page-NN.pdf`.

## Constraints

- **No build step / no npm / no axios.** Static site. Load `html-to-image` and `jspdf`
  from CDN (as the design does) or vendor them locally — do not add a package manager or
  bundler unless explicitly requested.
- Deploy target is **GitHub Pages** — everything must work as plain files served statically.
- Match the design **pixel-perfectly** (colors, spacing, fonts). The design uses system
  fonts (`-apple-system`, `ui-monospace`/`SF Mono`) and an Apple-style blue `#0071E3`.

## Status

- `design/` — Claude Design handoff bundle (spec). Present.
- Application source — **not started.**
- Build / lint / test tooling — **none yet.** Add this section once tooling exists.
