# CLAUDE.md - AI Assistant Guide for History Links

Start with these documents:

- `STRATEGY.md`: what the game should become (streamer-first, score the overlap). Check proposed work against it.
- `ROADMAP.md` / GitHub issue #37: the prioritised work, as GitHub issues under four epics (#38–#41).
- `docs/audits/2026-11-02-current-state-audit.md`: the as-built baseline, verified defects, and the design levers still open.

## Project overview

**History Links** (repo `timeline-game`) is a history puzzle. The player gets two target figures and adds people whose lifespans overlap until a chain connects the targets. Each added person costs one point, and lower is better.

- The original design intent is in `Gameplay-loop.md`.
- The rules as implemented are in the audit, section 3.

## Repository layout

This is a single Next.js app. It is not a monorepo; older docs that mention `game-core/` or `timeline-project/` are out of date.

```
src/
├── app/
│   ├── page.tsx          # Owns all game state: targets, figures, score, win, difficulty screen
│   ├── layout.tsx
│   └── globals.css       # Design tokens (CSS variables) + component classes
└── lib/                  # Imported as '@/lib' (barrel: src/lib/index.ts)
    ├── components/
    │   ├── Timeline.tsx  # Pan/zoom canvas, bubbles, hover cards, status colours
    │   └── ui/           # SearchBar, SearchInput, DetailPanel, WinModal, SplashScreen, ScoreDisplay (unused)
    ├── services/
    │   ├── wikimediaClient.ts        # The ONLY module that fetches Wikimedia: throttle, retry, cache
    │   ├── WikipediaService.ts       # lookupPerson (Wikidata-backed), searchPerson, findContemporaries (#51)
    │   ├── personData.ts             # Pure parsing: Wikidata claims, category fallback, living, summary
    │   ├── __fixtures__/             # Recorded Wikimedia responses for offline tests
    │   └── TargetSelectionService.ts # 58 hard-coded names in 4 era pools; difficulty by birth-year gap
    ├── utils/
    │   ├── ChainAnalyzer.ts  # areContemporaries + BFS shortest path between targets
    │   └── GameLogic.ts      # formatYear, formatLifespan, getScoreColor (several helpers unused)
    ├── hooks/useGameState.ts # localStorage persistence, 2 s debounced autosave
    ├── constants/zIndex.ts   # Token list (not referenced; components use literal z-[..] classes)
    └── types/HistoricalFigure.ts
docs/
├── audits/               # Dated snapshots of the as-built game
└── research/             # Inputs to strategy (streamer research)
```

## Stack and commands

Next.js 15.1.9 (App Router), React 19, TypeScript strict, Tailwind 3.4, lodash (`debounce`) and Vitest. Data comes only from Wikimedia (Wikipedia + Wikidata) at runtime; there is no backend or database. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every PR.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass before committing
npm test           # Vitest, offline (replays __fixtures__)
npm run lint       # warnings only; tracked in #44
npx tsc --noEmit

# Re-record Wikimedia fixtures after changing request URLs (slow; Wikimedia rate-limits):
CAPTURE_WIKIMEDIA=1 npx vitest run src/lib/services/wikimedia.capture.test.ts
```

## Data flow

1. `page.tsx` calls `TargetSelectionService.selectRandomTargets(difficulty)`, which makes 2 `getPersonDetails` calls per attempt (each is 2 HTTP requests), with up to 10 attempts and then a fallback to Alexander and Caesar.
2. The player submits a name. `page.tsx` `handleAddFigure` locks input, calls `WikipediaService.lookupPerson(name)` (1 Wikipedia query + 3 `wbgetclaims`), shows the typed rejection reason or appends with a functional update, and sorts by `birthYear`.
3. The score is `figures.length - 2`. An effect runs `analyzeChain`, and a complete path sets `hasWon`.
4. `Timeline` re-runs `analyzeChain` to colour bubbles. `DetailPanel` calls `findContemporaries` for hints.

## Conventions

- **BCE years are negative integers** (`-356` is 356 BCE). Keep this. Sorting and overlap maths depend on it. Wikidata JSON uses the same numbering (`-0069` = 69 BCE). Year 0 is not skipped anywhere yet (#53).
- **Figure identity**: `id` is the Wikidata QID; `name` is the canonical Wikipedia title. Living people have `isLiving: true` and `deathYear` = current year.
- **Network**: never call `fetch` for Wikimedia outside `wikimediaClient.ts`.
- **Contemporaries**: `a.birthYear <= b.deathYear && b.birthYear <= a.deathYear` (`ChainAnalyzer.ts`).
- **Imports**: use `@/lib` for library code and `@/*` for anything under `src/`.
- **Client components**: anything with hooks or browser APIs starts with `'use client'`.
- **Styling**: Tailwind utilities first. Colours and shadows come from CSS variables in `globals.css`, mapped in `tailwind.config.ts`.
- **Logging**: emoji-prefixed `console.*` (🚀 start, ✅ success, ⚠️ warn, ❌ error, 📊 data, 🔍 search). The service logs raw API responses, which is noisy.
- **Naming**: PascalCase for components, services and types. camelCase for functions. kebab-case for CSS classes and JSON data files.

## Gotchas

- **Wikimedia rate-limits hard.** Shared or scripted IPs get HTTP 429 with a plain-text body. The client retries with backoff; scripts also need a `User-Agent`. Tests must stay offline.
- **CirrusSearch reads `-123` as "exclude 123".** Never put negative (BCE) years in a `srsearch` or `gsrsearch` string. `findContemporaries` still does this and returns year articles (#51).
- **Full Wikidata entities are ~300 KB.** Fetch single properties with `wbgetclaims`, not `wbgetentities&props=claims`.
- **Changing a request URL invalidates fixtures.** Tests replay by exact URL; re-record with the capture command above.
- **The `Timeline` snap effect depends on `zoom`**, so zooming re-centres the view. `ProfileImage` is declared inside render and remounts every render (#63).

## Working rules for AI assistants

- Check `STRATEGY.md` (when present) before adding features. Shape new gameplay ideas with `ce-brainstorm` before `ce-plan`.
- Keep game rules in `src/lib/utils/` as pure functions, and keep network code in `src/lib/services/`.
- Never change the negative-BCE convention.
- When the as-built game changes materially, add a new dated audit or update this file. Do not edit old audits in place.
- Run `npm test` and `npm run build` before committing. Close issues from commits/PRs with `Fixes #N`. Verify gameplay changes in the browser too.
