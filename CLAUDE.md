# CLAUDE.md - AI Assistant Guide for History Links

Start with these documents:

- `STRATEGY.md`: what the game should become (streamer-first, score the overlap). Check proposed work against it.
- `PRODUCT.md` and `DESIGN.md`: confirmed product facts, and the built visual world (the Deck: cards on a table). `.impeccable/surfaces/round.md` holds the round screen's direction contract; never copy it into source.
- `ROADMAP.md` / GitHub issue #37: the prioritised work, as GitHub issues under four epics (#38–#41).
- `docs/audits/2026-11-02-current-state-audit.md`: the as-built baseline, verified defects, and the design levers still open.
- `docs/research/2026-11-06-difficulty-balancing.md`: how difficulty is set (par and options per step, not years), with the bands and the analysis script.
- `docs/plans/2026-11-07-1521-feat-daily-shared-puzzle-plan.md`: the daily puzzle (one shared puzzle per UTC day, weekday difficulty, scored attempt and practice).
- `docs/plans/2026-11-09-0000-feat-three-play-styles-plan.md`: three ways to play (Easy arranges cards, Medium fills blanks, Hard types against par), each with its own daily puzzle.

## Project overview

**History Links** (repo `timeline-game`) is a history puzzle. The player gets two target figures and links them through people whose lifespans overlapped. Lifespans stay hidden until a person is placed. There are three ways to play, and they are the difficulty scale:

- **Easy** deals the chain's people plus 2 decoys as name cards; the player arranges them between the targets and presses Check. Score: Checks (1 is perfect).
- **Medium** shows one blank per hidden person, with a box per letter; the player names them. Score: wrong guesses plus wild-card reveals.
- **Hard** is free typing: any valid chain counts, each placed person is a stroke, scored like golf against par (the shortest chain the game can build from its roster of well-known people).

Easy and Medium have one fixed answer, built from the roster (`utils/chainPuzzle.ts`); only Hard has par.

The site opens on the **daily puzzles**: three per UTC date (one per style), all numbered from 2026-11-07 (#1). Hard keeps the original schedule, whose pair hardness follows the weekday (easy pairs Monday and Tuesday, medium Wednesday and Thursday, hard Friday to Sunday) but always plays on Hard rules. Each browser gets one scored attempt per puzzle and style; past puzzles replay as practice. **Free play** (a fresh puzzle in a chosen style) is at `/play`.

- The original design intent is in `Gameplay-loop.md`.
- The current round rules are specified in `docs/plans/2026-11-05-2214-feat-core-loop-v2-round-plan.md` (Product Contract). The 2026-11-02 audit describes the game before that round shipped.

## Repository layout

This is a single Next.js app. It is not a monorepo; older docs that mention `game-core/` or `timeline-project/` are out of date.

```
src/
├── app/
│   ├── page.tsx          # The menu (server, per request): today's three daily puzzles, free play by style, archive, how to play
│   ├── play/page.tsx     # Free play: starts the style in ?d=, restores a saved Hard round, or shows the style cards
│   ├── daily/page.tsx    # Redirects to today's puzzle number
│   ├── daily/[n]/page.tsx # One daily puzzle, Hard (server gate: only puzzles whose UTC date has arrived)
│   ├── daily/[n]/easy/, daily/[n]/medium/ # The same number's Easy and Medium puzzles (StylePage.tsx, NotOut.tsx beside them)
│   ├── archive/page.tsx  # Published daily puzzles, newest first
│   ├── layout.tsx
│   └── globals.css       # Design tokens (CSS variables) + component classes
└── lib/                  # Imported as '@/lib' (barrel: src/lib/index.ts)
    ├── components/
    │   ├── GameRound.tsx # One Hard round: header (Home, score, goal), board, dock (hint, search, reveal), win check, end screen
    │   ├── EasyRound.tsx # One Easy round: targets and slots on a line, the hand of name cards, Check, result
    │   ├── MediumRound.tsx # One Medium round: letter-count blanks, guesses, the wild card reveal, result
    │   ├── DailyRound.tsx # A Hard daily puzzle: scored attempt, resumed attempt, result, or practice
    │   ├── DailyStyleRound.tsx # The same for an Easy or Medium daily puzzle
    │   ├── Board.tsx     # The table: one card per person at its birth year, life-length spine, gap bay, landing flip, winning thread
    │   └── ui/           # DailyHome (the menu), DifficultyChoice, HowToPlay, ScorePlates, Portrait, SearchBar, SearchInput, DetailPanel, PlacementReveal, HintButton (wild card), WinModal (end screen vs par), ChainTable (Easy and Medium table and cards), StyleResult (their end screen), ArchiveList, dailyStatus, Countdown, BandBadge
    ├── server/daily.ts   # The only reader of the three daily schedule files; imports 'server-only'
    ├── services/
    │   ├── wikimediaClient.ts        # The only app module that fetches Wikimedia: throttle, retry, cache
    │   ├── WikipediaService.ts       # lookupPerson (Wikidata-backed), searchPerson (dateless descriptions)
    │   ├── personData.ts             # Pure parsing: Wikidata claims, category fallback, living, summary, datelessDescription
    │   ├── rosterBuild.ts            # Pure roster building from SPARQL rows (BCE year shift, ambiguity, coverage gaps)
    │   ├── analytics.ts              # PostHog, off unless NEXT_PUBLIC_POSTHOG_KEY is set; anonymous only
    │   ├── roster.capture.test.ts    # Network builder for data/roster.json (skipped unless CAPTURE_ROSTER=1)
    │   ├── dailyScheduleBuild.ts     # Pure, append-only Hard schedule generator (weekday band, no repeats)
    │   ├── styleScheduleBuild.ts     # Pure, append-only Easy and Medium schedule generator (one per Hard date, no shared people that day)
    │   ├── daily.capture.test.ts     # Writes the three daily schedule files from the roster (skipped unless CAPTURE_DAILY=1)
    │   ├── __fixtures__/             # Recorded Wikimedia and SPARQL responses for offline tests
    │   └── TargetSelectionService.ts # selectTargets: band-fitting pair from the roster, then 2 lookups for display
    ├── data/
    │   ├── roster.json       # ~1,750 people from Wikipedia's Level 4 vital people list: Wikidata years and language-edition counts (committed)
    │   ├── roster.ts         # Roster row type and lazy loader (own client chunk)
    │   ├── daily-schedule.json # A year of Hard daily puzzles, each a snapshot: targets, par chain, narrowest-step count (server only)
    │   ├── daily-easy.json, daily-medium.json # A year of Easy and Medium dailies: targets, chain, decoys, fame and roster revision (server only)
    │   ├── dailySchedule.ts  # Pure Hard schedule rules: published puzzles, URL parsing, the health check (never imports the JSON)
    │   └── styleSchedule.ts  # Pure Easy and Medium schedule rules and health check (never imports the JSON)
    ├── utils/
    │   ├── ChainAnalyzer.ts  # areContemporaries, livesConnectedTo, BFS shortest path between targets
    │   ├── board.ts      # Board layout: statuses, the gap neither chain reaches, eras, the vertical table (tableLayout), ticks
    │   ├── par.ts            # computePar (greedy furthest-reach over the roster) and nextHint
    │   ├── difficulty.ts     # chainShape (par + options per step), DIFFICULTY_BANDS, pickTargets from the 400 best-known people, drawHardBand
    │   ├── chainPuzzle.ts    # Easy and Medium puzzles: links with a 5-year margin on approximate dates, best-known shortest chain, decoys, letter patterns
    │   ├── styleRound.ts     # Easy and Medium round state: placing and Checking cards, judging and revealing blanks, scores
    │   ├── guessMatch.ts     # Whether a Medium guess names the blank's person: full name or surname, roster, then Wikidata id
    │   ├── random.ts         # Seeded random numbers for the daily builders
    │   ├── overlap.ts        # sharedYears, revealPlacement, clutch / long-life thresholds
    │   ├── style.ts          # finalChain: shortest chain with the most style, plus its badges
    │   ├── roundEvents.ts    # Analytics event properties for round start, completion and abandonment (+ style, band, mode, puzzle, scored)
    │   ├── daily.ts          # UTC calendar rules: puzzle numbers, weekday bands, next switch
    │   ├── dailyProgress.ts  # Per-browser daily records per style: scored attempts, practice slots, what opening a puzzle shows
    │   └── GameLogic.ts      # formatYear, formatLifespan, countStrokes, hintPolicy, describeResult
    ├── hooks/useGameState.ts # Free-play Hard save in localStorage (timeline-game-state-v2), written on every change
    ├── hooks/usePortraits.ts # A puzzle's portraits from one batched Wikipedia request
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

# Extend the three daily schedule files to a year past today (offline, about 15 s; never rewrites published puzzles):
CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts --silent=false
```

## Data flow

**Free play, Hard** (`/play?d=hard`):

1. `play/page.tsx` draws the pair's band (`drawHardBand`: easy 2, medium 2, hard 3 in 7), loads the roster (`loadRoster`), then calls `TargetSelectionService.selectTargets(roster, band)`. `pickTargets` chooses both targets offline from the 400 best-known roster people and keeps a pair only when its par and narrowest step fit the band (`docs/research/2026-11-06-difficulty-balancing.md`); each band has a fallback pair. Only then are the two targets looked up (2 `lookupPerson` calls, each 4 HTTP requests: 1 Wikipedia query + 3 Wikidata `wbgetclaims`), for descriptions and images.
2. Par and the par chain come from `computePar(roster, targetA, targetB)`; par and hints never call Wikimedia.
3. The player submits a name. `handleAddFigure` locks input, calls `WikipediaService.lookupPerson(name)`, shows the typed rejection reason or appends with a functional update, and opens the reveal (`revealPlacement`, against the board before the placement).
4. Strokes are `countStrokes(figures, hintsUsed, 'hard')`: every placed person, plus each wild card. `GameRound` always receives `difficulty="hard"`; the band only chose the pair and goes to analytics. A hint is `nextHint(roster, ...)`; the hinted name is saved with the round.
5. An effect runs `finalChain`; a complete chain sets `hasWon`, and `WinModal` shows `describeResult(strokes, par)`, both chains and the badges.
6. `Board` lays the table out with `boardLayout` and `tableLayout`: one card per person, starting at the birth year with a spine as long as the life, marked by whether it links to a target, and the gap between the two chains as a chalk bay with its length in years.

Steps 2–6 happen inside `GameRound`, which both modes render.

**Free play, Easy and Medium** (`/play?d=easy`, `/play?d=medium`): `play/page.tsx` loads the roster and calls `buildEasyPuzzle` or `buildMediumPuzzle` with `Math.random`, then renders `EasyRound` or `MediumRound`. These rounds are not saved across reloads.

**Daily puzzles** (`/`, `/daily/<n>`, `/daily/<n>/easy`, `/daily/<n>/medium`, `/archive`):

1. `server/daily.ts` reads the committed schedules. A page renders per request and passes the browser only puzzles dated on or before today's UTC date; a future number shows "not out yet" with no puzzle data.
2. `DailyRound` (Hard) and `DailyStyleRound` (Easy, Medium) read this browser's records (`useDailyProgress`) and decide once what to show (`openPuzzle`, `openStylePuzzle`): a finished attempt's result, a resumed or new scored attempt, or practice on a past puzzle.
3. Hard: the targets keep the puzzle's years; two `lookupPerson` calls add descriptions and images (a failure leaves them blank). Par and the par chain come from the puzzle's snapshot; hints still come from the roster. Easy and Medium: every person comes from the snapshot; portraits come from one batched request (`usePortraits`), with initials when it fails.
4. Each round saves every change to the attempt (or that style's practice slot); a finish records the result. Hard records keep their original place in the store, so records from before Easy and Medium read as Hard. Free play and daily progress use separate storage keys.

**Medium guesses** (`guessMatch.ts`): the answer's full name or surname fills the blank at once (names with a bracket, an "of"/"the" part or a regnal numeral have no surname shortcut); any other name is matched in the roster, then looked up on Wikipedia and compared by Wikidata id. A roster or Wikipedia person who is not the answer is a miss; a name that is no dated person, or a lookup that could not reach Wikipedia, costs nothing.

## Conventions

- **BCE years are negative integers** (`-356` is 356 BCE). Keep this. Sorting and overlap maths depend on it. Wikidata JSON uses the same numbering (`-0069` = 69 BCE). Year 0 is not skipped anywhere yet (#53).
- **Figure identity**: `id` is the Wikidata QID; `name` is the canonical Wikipedia title. Living people have `isLiving: true` and `deathYear` = current year.
- **Analytics**: events go only through `analytics.track` (`services/analytics.ts`); the event list and environment variables are in `DEPLOYMENT.md`. Never add identifying data: players are anonymous.
- **Network**: app code never calls `fetch` for Wikimedia outside `wikimediaClient.ts`. The exceptions are the two capture tests, `wikimedia.capture.test.ts` and `roster.capture.test.ts`, which inject a throttled `fetchImpl` into the client; neither runs in CI.
- **Par and hints** come only from the committed roster. A roster row's years must match what `lookupPerson` returns for the same QID, so the builder parses claims with the same `personData.ts` functions.
- **Shared years** are the earlier death minus the later birth; 0 means the lives shared part of one calendar year and still count as overlapping.
- **Contemporaries**: `a.birthYear <= b.deathYear && b.birthYear <= a.deathYear` (`ChainAnalyzer.ts`).
- **Imports**: code in `src/app` imports library code from `@/lib`. Inside `src/lib`, modules import each other by relative path; never import the `@/lib` barrel from inside `src/lib` (it re-exports everything and would create cycles). The one exception: server pages import `@/lib/server/daily` directly. Never re-export it from the barrel or import it from client code; its `server-only` import fails the build if you do.
- **Daily puzzles are fixed once published.** Extend the schedules only with the capture command, which appends. Never edit or regenerate a published entry in any of the three files: links, practice and compared results depend on #n never changing. A date's three puzzles share no people, so finishing one style never gives away another.
- **Client components**: anything with hooks or browser APIs starts with `'use client'`.
- **Styling**: Tailwind utilities first. Colours come from CSS variables in `globals.css`; the round screen uses the Deck tokens (`--table*`, `--card-*`, `--foil*`, `--chalk*`, `--era-*`) and the `.type-display` class, as `DESIGN.md` describes.
- **Logging**: emoji-prefixed `console.*` (🚀 start, ✅ success, ⚠️ warn, ❌ error, 📊 data, 🔍 search). `WikipediaService` logs one line per resolved figure and each lookup error.
- **Naming**: PascalCase for components, services and types. camelCase for functions. kebab-case for CSS classes and JSON data files.

## Gotchas

- **Wikimedia rate-limits hard.** Shared or scripted IPs get HTTP 429 with a plain-text body. The client retries with backoff; scripts also need a `User-Agent`. Tests must stay offline.
- **CirrusSearch reads `-123` as "exclude 123".** Never put negative (BCE) years in a `srsearch` or `gsrsearch` string.
- **SPARQL BCE years are one off.** Wikidata Query Service returns RDF times in astronomical numbering (Caesar's birth is `-0099`); the JSON API and the game use historical numbering (-100). `rosterBuild.toHistoricalTime` converts. Unbounded SPARQL over all humans (for example a sitelinks threshold) times out; query by `VALUES` batches.
- **Century-precision dates make impossible lives.** Wikidata stores them as century midpoints (Menander I came out 350–130 BC). `resolveLifespan` rejects lives over 110 years with an approximate date and over 122 years in any case, so lookups and the roster agree.
- **Full Wikidata entities are ~300 KB.** Fetch single properties with `wbgetclaims`, not `wbgetentities&props=claims`.
- **Changing a request URL invalidates fixtures.** Tests replay by exact URL; re-record with the capture command above.
- **The daily schedules run out.** `dailySchedule.test.ts` and `styleSchedule.test.ts` fail CI once fewer than 30 puzzles remain after today; run the `CAPTURE_DAILY` command and commit the three files.
- **A roster rebuild changes the roster revision.** Easy and Medium entries store the revision they were built from (`rosterRevision`, a hash of the rows); the health check's roster-wide checks skip older entries, so frozen puzzles never fail CI.
- **Tailwind opacity modifiers do nothing on the CSS-variable colours** (`bg-primary/20` renders no background), because the tokens are `var(...)` rather than RGB channels. Use the alpha tokens (`bg-primary-glow`, `bg-primary-bright-20`) or an arbitrary value.

## Working rules for AI assistants

- Check `STRATEGY.md` (when present) before adding features. Shape new gameplay ideas with `ce-brainstorm` before `ce-plan`.
- Keep game rules in `src/lib/utils/` as pure functions, and keep network code in `src/lib/services/`.
- Never change the negative-BCE convention.
- When the as-built game changes materially, add a new dated audit or update this file. Do not edit old audits in place.
- Run `npm test` and `npm run build` before committing. Close issues from commits/PRs with `Fixes #N`. Verify gameplay changes in the browser too.
