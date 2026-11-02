# CLAUDE.md - AI Assistant Guide for History Links

Start with these two documents:

- `docs/audits/2026-11-02-current-state-audit.md`: what the game is as built, verified defects, why it is not fun yet, and the design levers still open.
- `STRATEGY.md` (once it exists): what the game should become. Check proposed work against it.

## Project overview

**History Links** (repo `timeline-game`) is a history puzzle. The player gets two target figures and adds people whose lifespans overlap until a chain connects the targets. Each added person costs one point, and lower is better.

- The design intent is in `Gameplay-loop.md`. The original phase plan is in `ROADMAP.md`, but Phase 1's JSON dataset was never built.
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
    │   ├── WikipediaService.ts       # Search, person details, date parsing, images, "contemporaries"
    │   └── TargetSelectionService.ts # 58 hard-coded names in 4 era pools; difficulty by birth-year gap
    ├── utils/
    │   ├── ChainAnalyzer.ts  # areContemporaries + BFS shortest path between targets
    │   └── GameLogic.ts      # formatYear/formatYearRange, getScoreColor (several helpers unused)
    ├── hooks/useGameState.ts # localStorage persistence, 2 s debounced autosave
    ├── constants/zIndex.ts   # Token list (not referenced; components use literal z-[..] classes)
    └── types/HistoricalFigure.ts
docs/
└── audits/               # Dated snapshots of the as-built game
```

## Stack and commands

Next.js 15.1.9 (App Router), React 19, TypeScript strict, Tailwind 3.4 and lodash (`debounce`). Data comes only from the public Wikipedia API at runtime. There is no backend, database or test framework.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # must pass before committing
npm run lint       # 22 warnings at 2026-11-02, no errors
npx tsc --noEmit   # clean at 2026-11-02
```

## Data flow

1. `page.tsx` calls `TargetSelectionService.selectRandomTargets(difficulty)`, which makes 2 `getPersonDetails` calls per attempt (each is 2 HTTP requests), with up to 10 attempts and then a fallback to Alexander and Caesar.
2. The player submits a name. `page.tsx` `handleAddFigure` calls `WikipediaService.getPersonDetails(name)`, appends the result, and sorts by `birthYear`.
3. The score is `figures.length - 2`. An effect runs `analyzeChain`, and a complete path sets `hasWon`.
4. `Timeline` re-runs `analyzeChain` to colour bubbles. `DetailPanel` calls `findContemporaries` for hints.

## Conventions

- **BCE years are negative integers** (`-356` is 356 BCE). Keep this. Sorting and overlap maths depend on it. Year 0 is not skipped anywhere.
- **Contemporaries**: `a.birthYear <= b.deathYear && b.birthYear <= a.deathYear` (`ChainAnalyzer.ts`).
- **Imports**: use `@/lib` for library code and `@/*` for anything under `src/`.
- **Client components**: anything with hooks or browser APIs starts with `'use client'`.
- **Styling**: Tailwind utilities first. Colours and shadows come from CSS variables in `globals.css`, mapped in `tailwind.config.ts`.
- **Logging**: emoji-prefixed `console.*` (🚀 start, ✅ success, ⚠️ warn, ❌ error, 📊 data, 🔍 search). The service logs raw API responses, which is noisy.
- **Naming**: PascalCase for components, services and types. camelCase for functions. kebab-case for CSS classes and JSON data files.

## Gotchas

These were verified in the 2026-11-02 audit. Fix them, or keep them in mind when touching nearby code.

- **Wikipedia dates are unreliable as parsed.** Century midpoints, "death - 30" and "birth + 60" heuristics give wrong lifespans (Cleopatra, Genghis Khan, Gutenberg) and invent death years for living people. Test date changes against real figures, not mocks.
- **`getPersonDetails` does not check that the page is a person.** Only autocomplete filters. Free-text submit accepts "Rome".
- **CirrusSearch reads `-123` as "exclude 123".** Never put negative (BCE) years in a `srsearch` or `gsrsearch` string. This is why `findContemporaries` returns year articles.
- **`extractShortDescription` regex matches "is" inside words** ("Aristotle" becomes "istotle was…").
- **Scripts hitting Wikipedia need a `User-Agent` and about 350 ms spacing**, or they get HTTP 429 HTML instead of JSON. The app has no 429 handling.
- **`handleAddFigure` appends to a stale `figures` closure.** Concurrent adds lose updates. Use a functional `setFigures(prev => …)` if you touch it.
- **The `Timeline` snap effect depends on `zoom`**, so zooming re-centres the view. `ProfileImage` is declared inside render and remounts every render.
- **`id` and `name` come from the raw input title**, not the resolved page title. Redirects and casing create duplicates.

## Working rules for AI assistants

- Check `STRATEGY.md` (when present) before adding features. Shape new gameplay ideas with `ce-brainstorm` before `ce-plan`.
- Keep game rules in `src/lib/utils/` as pure functions, and keep network code in `src/lib/services/`.
- Never change the negative-BCE convention.
- When the as-built game changes materially, add a new dated audit or update this file. Do not edit old audits in place.
- Run `npm run build` before committing. There are no automated tests yet, so verify gameplay changes in the browser.
