# Difficulty Balancing: Par and Step Options, Not Years

**Date:** 2026-11-06
**Status:** Approved direction. Implementation: #52. Follow-ups: #79, #80, #81, #82.
**Reproduce:** `python3 docs/research/difficulty-analysis.py` (offline, fixed seed, a few minutes).

## Decision

A round's difficulty is set by two numbers the game can compute from its roster:

- **Par**: the fewest well-known people that connect the two targets. Par sets how long a round is.
- **Options per step**: for each step of a par-length chain, how many roster people could fill it. The narrowest step sets how much specific knowledge the round demands.

The year gap between the targets stays visible to players, but only as a guide. It predicts par at about 70 years per step and plays no further part in difficulty.

---

## What the data shows

Measured on the committed roster (1,752 people from Wikipedia's Level 4 vital people list, years from Wikidata), across 2,500 random pairs and every pair the current target pools can form.

### Par grows with the gap at about 70 years per step

| Gap between the targets' lives | Median par | Middle 80% of pairs |
|---|---|---|
| 0–50 years | 1 | 1 |
| 50–100 | 1 | 1–2 |
| 100–200 | 2 | 2–3 |
| 200–300 | 4 | 3–4 |
| 300–500 | 5 | 4–7 |
| 500–800 | 9 | 7–11 |
| 800–1200 | 15 | 11–17 |
| 1200–2000 | 23 | 18–28 |
| 2000+ | 32 | 30–35 |

Each step covers about 70 years from 1400 onwards and 55–60 years in earlier eras, where fewer famous people lived long enough to bridge further.

### The current year-gap difficulties make rounds far too long

| Difficulty now | Rule | Par range | Median par | Pairs that cannot be connected |
|---|---|---|---|---|
| Easy | 200–700 years apart | 2–9 | 4 | 0 |
| Medium | 600–1400 years apart | 7–19 | 9 | 0 |
| Hard | 1200+ years apart | 22–35 | 31 | 28 of 210 |

With no stroke cap, a Hard round asks for about 30 placements. Four pool names do not match a roster title ("Napoleon Bonaparte", "Machiavelli", "Richard the Lionheart", "Akbar the Great"), and Hammurabi and Ramesses II cannot be connected to anyone.

### The era decides how many answers each step has

How many roster people are alive in a typical year:

| Period | People alive |
|---|---|
| 800 BCE – 1000 CE | 2–12 |
| 1000–1400 | 17–22 |
| 1400–1800 | 46–63 |
| 1800–1950 | about 350 |

The median narrowest step for gaps of 100–400 years:

| Era of the gap | Options at the narrowest step |
|---|---|
| Before 1000 CE | 2–3 |
| 1000–1400 | 4 |
| 1400–1700 | 8 |
| 1700–1950 | 18 |

The same par plays very differently:

| Pair | Years apart | Par | Options per step | How it plays |
|---|---|---|---|---|
| Dante → Leonardo | 131 | 3 | 19, 19, 26 | Anyone who knows the period finds a chain |
| Julius Caesar → Marcus Aurelius | 165 | 3 | 4, 5, 2 | One step needs a specific person |
| Charlemagne → William the Conqueror | 214 | 4 | 2, 3, 6, 14 | Two narrow steps in the early medieval gap |
| Napoleon → Picasso | 60 | 1 | 44 | Trivial |
| Newton → Lincoln | 82 | 1 | 1 | Only Mir Taqi Mir (1723–1810) on the roster: a "name the one person" puzzle |

---

## Difficulty bands

These rules hold at every difficulty:

- Both targets come from the roster, so viewers recognise them. Difficulty never comes from obscure targets.
- Every step has at least 2 options, except in deliberate one-answer puzzles.

| Difficulty | Par | Narrowest step | Typical years apart | Where it tends to land |
|---|---|---|---|---|
| Easy | 2–3 | 8 or more options | 120–250 | 1400–1950 |
| Medium | 3–4 | 3–7 options | 200–300 | Any era |
| Hard | 4–6 | 1–2 options | 250–450 | Mostly before 1400 |
| Marathon (special mode) | 8 or more | Any | 600 or more | Socrates → Einstein, par 30 |

Why these numbers:

- **Round length.** Par 2–6 keeps a round to roughly 5–10 minutes at 30–60 seconds per placement, talking included. This is an estimate to check against play data, not a measurement.
- **Knowledge over length.** Hard is harder because one step has almost no famous answers, not because the chain is long. Sparse eras produce those steps naturally, which rewards the "dead zone specialist" flex the strategy is built on.
- **No stroke cap.** Capping par at 6 keeps Hard playable without the stroke cap the round spec ruled out.
- **Long chains stay available.** Par 8 or more becomes a Marathon mode for stream events, not a default difficulty.
- **One-answer puzzles.** Par 1–2 with a single-option step is its own puzzle type, a fit for the daily puzzle and occasional Hard rounds.

---

## How target selection should work

1. Pick the first target from the roster.
2. Shortlist second targets about 70 years per step away for the chosen band (55–60 before 1400).
3. Compute par and the options per step for each candidate pair. This uses the same interval method as `computePar` and needs no Wikimedia request.
4. Accept the first pair that fits the band. Show the years apart beside the difficulty in the menu ("about 200 years apart, par 3").

Options per step come from interval-graph distances: a person can fill step k when their distance from the earlier target is k and their distance to the later target is par + 1 − k. `docs/research/difficulty-analysis.py` computes this.

---

## Tuning after launch

These targets are starting points for tuning, not measurements. They need PostHog events (#43).

| Difficulty | Completion rate | Median result | Hints |
|---|---|---|---|
| Easy | 90% or more | Par or +1 | Rare |
| Medium | About 75% | +1 | Some |
| Hard | About 50% | +2 | Common |

Two further checks:

- **Birdies by era.** Beating par should happen in a meaningful share of Hard rounds. Because the roster is thin before 1400, birdies should come mostly from ancient and medieval rounds. This is a hypothesis to confirm with play data.
- **Adjust options before par.** When a band plays too hard, raise its minimum options per step first, and change its par range only if that is not enough.

---

## Limits of this analysis

- Options per step count roster people only. Players who know people outside the roster have more options, which is how they beat par.
- Round length per placement is estimated, not measured.
- Year 0 is not skipped (#53), so gaps crossing 1 BCE to 1 CE are one year high. This does not change any band.
- Lookups still accept impossible lifespans from century-precision Wikidata dates (Menander I came out as 350–130 BC). The roster excludes them, but a player can still place one as a bridge, skipping steps par assumes (#79).
