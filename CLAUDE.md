# CLAUDE.md - AI Assistant Guide for History Links

Start with these documents:

- `STRATEGY.md`: what the game should become (streamer-first, score the overlap). Check proposed work against it.
- `ROADMAP.md` / GitHub issue #37: the prioritised work, as GitHub issues under four epics (#38–#41).
- `docs/audits/2026-11-02-current-state-audit.md`: the as-built baseline, verified defects, and the design levers still open.
- `docs/research/2026-11-06-difficulty-balancing.md`: how difficulty is set (par and options per step, not years), with the bands and the analysis script.
- `docs/plans/2026-11-07-1521-feat-daily-shared-puzzle-plan.md`: the daily puzzle (one shared puzzle per UTC day, weekday difficulty, scored attempt and practice).

## Project overview

**History Links** (repo `timeline-game`) is a history puzzle. The player gets two target figures and adds people whose lifespans overlap until a chain connects the targets. Each placed person is a stroke, scored like golf against par: the shortest chain the game can build from its roster of well-known people. Lifespans stay hidden until a person is placed.

The site opens on the **daily puzzle**: one puzzle for everyone per UTC date, numbered from 2026-11-07 (#1), Easy on Monday and Tuesday, Medium on Wednesday and Thursday, Hard from Friday to Sunday. Each browser gets one scored attempt per puzzle; past puzzles replay as practice. **Free play** (random targets at a chosen difficulty) is at `/play`.

- The original design intent is in `Gameplay-loop.md`.
- The current round rules are specified in `docs/plans/2026-11-05-2214-feat-core-loop-v2-round-plan.md` (Product Contract). The 2026-11-02 audit describes the game before that round shipped.

## Repository layout

This is a single Next.js app. It is not a monorepo; older docs that mention `game-core/` or `timeline-project/` are out of date.

```
src/
├── app/
│   ├── page.tsx          # Home (server, per request): today's daily puzzle first, free play and archive links
│   ├── play/page.tsx     # Free play: difficulty picker, saved-round restore, New Game around GameRound
│   ├── daily/page.tsx    # Redirects to today's puzzle number
│   ├── daily/[n]/page.tsx # One daily puzzle (server gate: only puzzles whose UTC date has arrived)
│   ├── archive/page.tsx  # Published daily puzzles, newest first
│   ├── layout.tsx
│   └── globals.css       # Design tokens (CSS variables) + component classes
└── lib/                  # Imported as '@/lib' (barrel: src/lib/index.ts)
    ├── components/
    │   ├── GameRound.tsx # One round: board, strokes vs par, search, hints, reveal, win check, end screen
    │   ├── DailyRound.tsx # A daily puzzle: scored attempt, resumed attempt, result, or practice
    │   ├── Timeline.tsx  # Pan/zoom canvas, bubbles, hover cards, status colours
    │   └── ui/           # SearchBar, SearchInput, DetailPanel, PlacementReveal, HintButton, WinModal (end screen vs par), DailyHome, ArchiveList, Countdown, BandBadge
    ├── server/daily.ts   # The only reader of daily-schedule.json; imports 'server-only'
    ├── services/
    │   ├── wikimediaClient.ts        # The only app module that fetches Wikimedia: throttle, retry, cache
    │   ├── WikipediaService.ts       # lookupPerson (Wikidata-backed), searchPerson (dateless descriptions)
    │   ├── personData.ts             # Pure parsing: Wikidata claims, category fallback, living, summary, datelessDescription
    │   ├── rosterBuild.ts            # Pure roster building from SPARQL rows (BCE year shift, ambiguity, coverage gaps)
    │   ├── analytics.ts              # PostHog, off unless NEXT_PUBLIC_POSTHOG_KEY is set; anonymous only
    │   ├── roster.capture.test.ts    # Network builder for data/roster.json (skipped unless CAPTURE_ROSTER=1)
    │   ├── dailyScheduleBuild.ts     # Pure, append-only daily schedule generator (weekday band, no repeats)
    │   ├── daily.capture.test.ts     # Writes data/daily-schedule.json from the roster (skipped unless CAPTURE_DAILY=1)
    │   ├── __fixtures__/             # Recorded Wikimedia and SPARQL responses for offline tests
    │   └── TargetSelectionService.ts # selectTargets: band-fitting pair from the roster, then 2 lookups for display
    ├── data/
    │   ├── roster.json       # ~1,750 people from Wikipedia's Level 4 vital people list: Wikidata years and language-edition counts (committed)
    │   ├── roster.ts         # Roster row type and lazy loader (own client chunk)
    │   ├── daily-schedule.json # A year of daily puzzles, each a snapshot: targets, par chain, narrowest-step count (server only)
    │   └── dailySchedule.ts  # Pure schedule rules: published puzzles, URL parsing, the health check (never imports the JSON)
    ├── utils/
    │   ├── ChainAnalyzer.ts  # areContemporaries + BFS shortest path between targets (Timeline colouring)
    │   ├── par.ts            # computePar (greedy furthest-reach over the roster) and nextHint
    │   ├── difficulty.ts     # chainShape (par + options per step), DIFFICULTY_BANDS, pickTargets from the 400 best-known people
    │   ├── overlap.ts        # sharedYears, revealPlacement, clutch / long-life thresholds
    │   ├── style.ts          # finalChain: shortest chain with the most style, plus its badges
    │   ├── roundEvents.ts    # Analytics event properties for round start, completion and abandonment (+ mode, puzzle, scored)
    │   ├── daily.ts          # UTC calendar rules: puzzle numbers, weekday bands, next switch
    │   ├── dailyProgress.ts  # Per-browser daily records: scored attempts, practice slot, what opening a puzzle shows
    │   └── GameLogic.ts      # formatYear, formatLifespan, countStrokes, hintPolicy, describeResult
    ├── hooks/useGameState.ts # Free-play save in localStorage (timeline-game-state-v2), written on every change
    ├── hooks/useDailyProgress.ts # Daily records in localStorage (history-links-daily-v1)
    ├── constants/zIndex.ts   # Token list (not referenced; components use literal z-[..] classes)
    └── types/HistoricalFigure.ts
docs/
├── audits/               # Dated snapshots of the as-built game
└── research/             # Inputs to strategy (streamer research)
```

## Stack and commands

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 3.4, lodash (`debounce`) and Vitest. Data comes only from Wikimedia (Wikipedia + Wikidata) at runtime; there is no backend service or database. The home, daily and archive pages render on the server per request (`await connection()`), so the daily schedule never reaches the browser. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every PR.

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

# Extend src/lib/data/daily-schedule.json to a year past today (offline, seconds; never rewrites published puzzles):
CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts --silent=false
```

## Data flow

**Free play** (`/play`):

1. `play/page.tsx` loads the roster (`loadRoster`), then calls `TargetSelectionService.selectTargets(roster, difficulty)`. `pickTargets` chooses both targets offline from the 400 best-known roster people and keeps a pair only when its par and narrowest step fit the band (`docs/research/2026-11-06-difficulty-balancing.md`); each band has a fallback pair. Only then are the two targets looked up (2 `lookupPerson` calls, each 4 HTTP requests: 1 Wikipedia query + 3 Wikidata `wbgetclaims`), for descriptions and images.
2. Par and the par chain come from `computePar(roster, targetA, targetB)`; par and hints never call Wikimedia.
3. The player submits a name. `handleAddFigure` locks input, calls `WikipediaService.lookupPerson(name)`, shows the typed rejection reason or appends with a functional update, and opens the reveal (`revealPlacement`, against the board before the placement).
4. Strokes are `countStrokes(figures, hintsUsed, difficulty)`: every placed person, plus hints on Hard. A hint is `nextHint(roster, ...)`; the hinted name is saved with the round.
5. An effect runs `finalChain`; a complete chain sets `hasWon`, and `WinModal` shows `describeResult(strokes, par)`, both chains and the badges.
6. `Timeline` runs `analyzeChain` to colour bubbles.

Steps 2–6 happen inside `GameRound`, which both modes render.

**Daily puzzle** (`/`, `/daily/<n>`, `/archive`):

1. `server/daily.ts` reads the committed schedule. A page renders per request and passes the browser only puzzles dated on or before today's UTC date; a future number shows "not out yet" with no puzzle data.
2. `DailyRound` reads this browser's records (`useDailyProgress`) and decides once what to show (`openPuzzle`): a finished attempt's result, a resumed or new scored attempt, or practice on a past puzzle.
3. The targets keep the puzzle's years; two `lookupPerson` calls add descriptions and images (a failure leaves them blank). Par and the par chain come from the puzzle's snapshot; hints still come from the roster.
4. `GameRound` saves every change to the attempt (or the practice slot); a win records the result. Free play and daily progress use separate storage keys.

## Conventions

- **BCE years are negative integers** (`-356` is 356 BCE). Keep this. Sorting and overlap maths depend on it. Wikidata JSON uses the same numbering (`-0069` = 69 BCE). Year 0 is not skipped anywhere yet (#53).
- **Figure identity**: `id` is the Wikidata QID; `name` is the canonical Wikipedia title. Living people have `isLiving: true` and `deathYear` = current year.
- **Analytics**: events go only through `analytics.track` (`services/analytics.ts`); the event list and environment variables are in `DEPLOYMENT.md`. Never add identifying data: players are anonymous.
- **Network**: app code never calls `fetch` for Wikimedia outside `wikimediaClient.ts`. The exceptions are the two capture tests, `wikimedia.capture.test.ts` and `roster.capture.test.ts`, which inject a throttled `fetchImpl` into the client; neither runs in CI.
- **Par and hints** come only from the committed roster. A roster row's years must match what `lookupPerson` returns for the same QID, so the builder parses claims with the same `personData.ts` functions.
- **Shared years** are the earlier death minus the later birth; 0 means the lives shared part of one calendar year and still count as overlapping.
- **Contemporaries**: `a.birthYear <= b.deathYear && b.birthYear <= a.deathYear` (`ChainAnalyzer.ts`).
- **Imports**: code in `src/app` imports library code from `@/lib`. Inside `src/lib`, modules import each other by relative path; never import the `@/lib` barrel from inside `src/lib` (it re-exports everything and would create cycles). The one exception: server pages import `@/lib/server/daily` directly. Never re-export it from the barrel or import it from client code; its `server-only` import fails the build if you do.
- **Daily puzzles are fixed once published.** Extend the schedule only with the capture command, which appends. Never edit or regenerate a published entry: links, practice and compared results depend on #n never changing.
- **Client components**: anything with hooks or browser APIs starts with `'use client'`.
- **Styling**: Tailwind utilities first. Colours and shadows come from CSS variables in `globals.css`, mapped in `tailwind.config.ts`.
- **Logging**: emoji-prefixed `console.*` (🚀 start, ✅ success, ⚠️ warn, ❌ error, 📊 data, 🔍 search). `WikipediaService` logs one line per resolved figure and each lookup error.
- **Naming**: PascalCase for components, services and types. camelCase for functions. kebab-case for CSS classes and JSON data files.

## Gotchas

- **Wikimedia rate-limits hard.** Shared or scripted IPs get HTTP 429 with a plain-text body. The client retries with backoff; scripts also need a `User-Agent`. Tests must stay offline.
- **CirrusSearch reads `-123` as "exclude 123".** Never put negative (BCE) years in a `srsearch` or `gsrsearch` string.
- **SPARQL BCE years are one off.** Wikidata Query Service returns RDF times in astronomical numbering (Caesar's birth is `-0099`); the JSON API and the game use historical numbering (-100). `rosterBuild.toHistoricalTime` converts. Unbounded SPARQL over all humans (for example a sitelinks threshold) times out; query by `VALUES` batches.
- **Century-precision dates make impossible lives.** Wikidata stores them as century midpoints (Menander I came out 350–130 BC). `resolveLifespan` rejects lives over 110 years with an approximate date and over 122 years in any case, so lookups and the roster agree.
- **Full Wikidata entities are ~300 KB.** Fetch single properties with `wbgetclaims`, not `wbgetentities&props=claims`.
- **Changing a request URL invalidates fixtures.** Tests replay by exact URL; re-record with the capture command above.
- **The daily schedule runs out.** `dailySchedule.test.ts` fails CI once fewer than 30 puzzles remain after today; run the `CAPTURE_DAILY` command and commit the file.
- **The `Timeline` snap effect depends on `zoom`**, so zooming re-centres the view. `ProfileImage` is declared inside render and remounts every render (#63).

## Working rules for AI assistants

- Check `STRATEGY.md` (when present) before adding features. Shape new gameplay ideas with `ce-brainstorm` before `ce-plan`.
- Keep game rules in `src/lib/utils/` as pure functions, and keep network code in `src/lib/services/`.
- Never change the negative-BCE convention.
- When the as-built game changes materially, add a new dated audit or update this file. Do not edit old audits in place.
- Run `npm test` and `npm run build` before committing. Close issues from commits/PRs with `Fixes #N`. Verify gameplay changes in the browser too.
