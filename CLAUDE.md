# CLAUDE.md - AI Assistant Guide for History Links

Start with these documents:

- `STRATEGY.md`: what the game should become (streamer-first, score the overlap). Check proposed work against it.
- `ROADMAP.md` / GitHub issue #37: the prioritised work, as GitHub issues under four epics (#38–#41).
- `docs/audits/2026-11-02-current-state-audit.md`: the as-built baseline, verified defects, and the design levers still open.

## Project overview

**History Links** (repo `timeline-game`) is a history puzzle. The player gets two target figures and adds people whose lifespans overlap until a chain connects the targets. Each placed person is a stroke, scored like golf against par: the shortest chain the game can build from its roster of well-known people. Lifespans stay hidden until a person is placed.

- The original design intent is in `Gameplay-loop.md`.
- The current round rules are specified in `docs/plans/2026-11-05-2214-feat-core-loop-v2-round-plan.md` (Product Contract). The 2026-11-02 audit describes the game before that round shipped.

## Repository layout

This is a single Next.js app. It is not a monorepo; older docs that mention `game-core/` or `timeline-project/` are out of date.

```
src/
├── app/
│   ├── page.tsx          # Owns all game state: targets, figures, par, strokes, hints, reveal, win, difficulty screen
│   ├── layout.tsx
│   └── globals.css       # Design tokens (CSS variables) + component classes
└── lib/                  # Imported as '@/lib' (barrel: src/lib/index.ts)
    ├── components/
    │   ├── Timeline.tsx  # Pan/zoom canvas, bubbles, hover cards, status colours
    │   └── ui/           # SearchBar, SearchInput, DetailPanel, PlacementReveal, HintButton, WinModal (end screen vs par), SplashScreen
    ├── services/
    │   ├── wikimediaClient.ts        # The only app module that fetches Wikimedia: throttle, retry, cache
    │   ├── WikipediaService.ts       # lookupPerson (Wikidata-backed), searchPerson (dateless descriptions)
    │   ├── personData.ts             # Pure parsing: Wikidata claims, category fallback, living, summary, datelessDescription
    │   ├── rosterBuild.ts            # Pure roster building from SPARQL rows (BCE year shift, ambiguity, coverage gaps)
    │   ├── roster.capture.test.ts    # Network builder for data/roster.json (skipped unless CAPTURE_ROSTER=1)
    │   ├── __fixtures__/             # Recorded Wikimedia and SPARQL responses for offline tests
    │   └── TargetSelectionService.ts # 58 hard-coded names in 4 era pools; difficulty by birth-year gap; playable pairs only
    ├── data/
    │   ├── roster.json       # ~1,750 people from Wikipedia's Level 4 vital people list, Wikidata years (committed)
    │   └── roster.ts         # Roster row type and lazy loader (own client chunk)
    ├── utils/
    │   ├── ChainAnalyzer.ts  # areContemporaries + BFS shortest path between targets (Timeline colouring)
    │   ├── par.ts            # computePar (greedy furthest-reach over the roster) and nextHint
    │   ├── overlap.ts        # sharedYears, gapYears, revealPlacement, clutch / long-life thresholds
    │   ├── style.ts          # finalChain: shortest chain with the most style, plus its badges
    │   └── GameLogic.ts      # formatYear, formatLifespan, countStrokes, hintPolicy, describeResult
    ├── hooks/useGameState.ts # localStorage persistence (hint count and current hint), 2 s debounced autosave
    ├── constants/zIndex.ts   # Token list (not referenced; components use literal z-[..] classes)
    └── types/HistoricalFigure.ts
docs/
├── audits/               # Dated snapshots of the as-built game
└── research/             # Inputs to strategy (streamer research)
```

## Stack and commands

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 3.4, lodash (`debounce`) and Vitest. Data comes only from Wikimedia (Wikipedia + Wikidata) at runtime; there is no backend or database. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every PR.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass before committing
npm test           # Vitest, offline (replays __fixtures__, checks the committed roster)
npm run lint       # ESLint CLI (Next 16 removed `next lint`); warnings only, tracked in #44
npx tsc --noEmit

# Re-record Wikimedia fixtures after changing request URLs (slow; Wikimedia rate-limits):
CAPTURE_WIKIMEDIA=1 npx vitest run src/lib/services/wikimedia.capture.test.ts

# Rebuild src/lib/data/roster.json (about 3 minutes; fails if any stretch from 500 BCE to 1950 has no chain):
CAPTURE_ROSTER=1 npx vitest run src/lib/services/roster.capture.test.ts --silent=false
```

## Data flow

1. `page.tsx` loads the roster (`loadRoster`), then calls `TargetSelectionService.selectRandomTargets(difficulty, isPlayable)`. Each attempt makes 2 `lookupPerson` calls (each is 4 HTTP requests: 1 Wikipedia query + 3 Wikidata `wbgetclaims`, before retries and cache hits), and a pair counts only when `computePar` can connect it. Up to 10 attempts, then the Alexander and Caesar fallback, which must also be playable.
2. Par and the par chain come from `computePar(roster, targetA, targetB)`; par and hints never call Wikimedia.
3. The player submits a name. `handleAddFigure` locks input, calls `WikipediaService.lookupPerson(name)`, shows the typed rejection reason or appends with a functional update, and opens the reveal (`revealPlacement`, against the board before the placement).
4. Strokes are `countStrokes(figures, hintsUsed, difficulty)`: every placed person, plus hints on Hard. A hint is `nextHint(roster, ...)`; the hinted name is saved with the round.
5. An effect runs `finalChain`; a complete chain sets `hasWon`, and `WinModal` shows `describeResult(strokes, par)`, both chains and the badges.
6. `Timeline` runs `analyzeChain` to colour bubbles.

## Conventions

- **BCE years are negative integers** (`-356` is 356 BCE). Keep this. Sorting and overlap maths depend on it. Wikidata JSON uses the same numbering (`-0069` = 69 BCE). Year 0 is not skipped anywhere yet (#53).
- **Figure identity**: `id` is the Wikidata QID; `name` is the canonical Wikipedia title. Living people have `isLiving: true` and `deathYear` = current year.
- **Network**: app code never calls `fetch` for Wikimedia outside `wikimediaClient.ts`. The exceptions are the two capture tests, `wikimedia.capture.test.ts` and `roster.capture.test.ts`, which inject a throttled `fetchImpl` into the client; neither runs in CI.
- **Par and hints** come only from the committed roster. A roster row's years must match what `lookupPerson` returns for the same QID, so the builder parses claims with the same `personData.ts` functions.
- **Shared years** are the earlier death minus the later birth; 0 means the lives shared part of one calendar year and still count as overlapping.
- **Contemporaries**: `a.birthYear <= b.deathYear && b.birthYear <= a.deathYear` (`ChainAnalyzer.ts`).
- **Imports**: code in `src/app` imports library code from `@/lib`. Inside `src/lib`, modules import each other by relative path; never import the `@/lib` barrel from inside `src/lib` (it re-exports everything and would create cycles).
- **Client components**: anything with hooks or browser APIs starts with `'use client'`.
- **Styling**: Tailwind utilities first. Colours and shadows come from CSS variables in `globals.css`, mapped in `tailwind.config.ts`.
- **Logging**: emoji-prefixed `console.*` (🚀 start, ✅ success, ⚠️ warn, ❌ error, 📊 data, 🔍 search). `WikipediaService` logs one line per resolved figure and each lookup error.
- **Naming**: PascalCase for components, services and types. camelCase for functions. kebab-case for CSS classes and JSON data files.

## Gotchas

- **Wikimedia rate-limits hard.** Shared or scripted IPs get HTTP 429 with a plain-text body. The client retries with backoff; scripts also need a `User-Agent`. Tests must stay offline.
- **CirrusSearch reads `-123` as "exclude 123".** Never put negative (BCE) years in a `srsearch` or `gsrsearch` string.
- **SPARQL BCE years are one off.** Wikidata Query Service returns RDF times in astronomical numbering (Caesar's birth is `-0099`); the JSON API and the game use historical numbering (-100). `rosterBuild.toHistoricalTime` converts. Unbounded SPARQL over all humans (for example a sitelinks threshold) times out; query by `VALUES` batches.
- **Century-precision dates make impossible lives.** Wikidata stores them as century midpoints (Menander I came out 350–130 BC). The roster drops lives over 110 years with an approximate date and over 122 years in any case; lookups do not yet.
- **Full Wikidata entities are ~300 KB.** Fetch single properties with `wbgetclaims`, not `wbgetentities&props=claims`.
- **Changing a request URL invalidates fixtures.** Tests replay by exact URL; re-record with the capture command above.
- **The `Timeline` snap effect depends on `zoom`**, so zooming re-centres the view. `ProfileImage` is declared inside render and remounts every render (#63).

## Working rules for AI assistants

- Check `STRATEGY.md` (when present) before adding features. Shape new gameplay ideas with `ce-brainstorm` before `ce-plan`.
- Keep game rules in `src/lib/utils/` as pure functions, and keep network code in `src/lib/services/`.
- Never change the negative-BCE convention.
- When the as-built game changes materially, add a new dated audit or update this file. Do not edit old audits in place.
- Run `npm test` and `npm run build` before committing. Close issues from commits/PRs with `Fixes #N`. Verify gameplay changes in the browser too.
