# History Links Roadmap

GitHub issues are the source of truth. This file mirrors the tracking issue [#37](https://github.com/K41R0N/timeline-game/issues/37), so update both together.

- **Direction:** [`STRATEGY.md`](./STRATEGY.md), which is streamer-first and commits to scoring the overlap itself.
- **Starting point:** [`docs/audits/2026-11-02-current-state-audit.md`](./docs/audits/2026-11-02-current-state-audit.md).
- **Research:** [`docs/research/2026-11-02-streamer-guessing-games.md`](./docs/research/2026-11-02-streamer-guessing-games.md).
- The original six-phase plan (2025) is in git history, before commit `8f5a304`.

## Structure

| Epic | Strategy track |
|---|---|
| [#38 Foundations](https://github.com/K41R0N/timeline-game/issues/38) | Supports all tracks: tests, CI, API client, analytics, deploy |
| [#39 Wikimedia data, made usable](https://github.com/K41R0N/timeline-game/issues/39) | Wikimedia data, made usable |
| [#40 Overlap scoring, reveals and sharing](https://github.com/K41R0N/timeline-game/issues/40) | Overlap scoring, reveals and sharing |
| [#41 UI polish and mobile](https://github.com/K41R0N/timeline-game/issues/41) | UI polish and mobile |

**Labels:** `track:foundation|data|gameplay|ui` for the area, and `P0` (now), `P1` (next) or `P2` (later) for order. The issue type is Bug, Feature or Task. PRs close issues with `Fixes #N`.

## Now (P0): make the data trustworthy and decide the loop

- [#42](https://github.com/K41R0N/timeline-game/issues/42) Set up Vitest with unit tests for date parsing and chain analysis
- [#45](https://github.com/K41R0N/timeline-game/issues/45) Add CI: lint, typecheck, test and build on every PR
- [#46](https://github.com/K41R0N/timeline-game/issues/46) One Wikimedia API client: User-Agent, throttling, 429 retry, caching
- [#48](https://github.com/K41R0N/timeline-game/issues/48) Read lifespans from Wikidata and stop inventing death years for living people
- [#49](https://github.com/K41R0N/timeline-game/issues/49) Accept only humans on every add path
- [#50](https://github.com/K41R0N/timeline-game/issues/50) Canonical identity and clean descriptions for every figure
- [#62](https://github.com/K41R0N/timeline-game/issues/62) Fix lost additions from stale state and lock input while adding
- [#54](https://github.com/K41R0N/timeline-game/issues/54) Spec core loop v2: overlap scoring, rounds, par and modes

## Next (P1): the shareable loop

- [#57](https://github.com/K41R0N/timeline-game/issues/57) Compute par and reveal the best possible chain
- [#55](https://github.com/K41R0N/timeline-game/issues/55) Draw lifespans on the timeline and show the gap left to bridge
- [#56](https://github.com/K41R0N/timeline-game/issues/56) Overlap reveal on every link
- [#58](https://github.com/K41R0N/timeline-game/issues/58) Daily shared puzzle
- [#59](https://github.com/K41R0N/timeline-game/issues/59) Share card and challenge links
- [#43](https://github.com/K41R0N/timeline-game/issues/43) Configure PostHog and instrument the three strategy metrics
- [#47](https://github.com/K41R0N/timeline-game/issues/47) Confirm production deploy target and PR preview deploys
- [#51](https://github.com/K41R0N/timeline-game/issues/51) Replace broken contemporary hints with real overlapping people
- [#52](https://github.com/K41R0N/timeline-game/issues/52) Target selection: fix era pools, difficulty gaps and fallback
- [#63](https://github.com/K41R0N/timeline-game/issues/63) Stop zoom from re-centering and bubbles from remounting
- [#64](https://github.com/K41R0N/timeline-game/issues/64) One score scale across the badge and the win screen
- [#65](https://github.com/K41R0N/timeline-game/issues/65) On-screen rules and an always-visible goal
- [#66](https://github.com/K41R0N/timeline-game/issues/66) Touch, mobile and stream-readable layout

## Later (P2)

- [#60](https://github.com/K41R0N/timeline-game/issues/60) Suggestion-pick input mode for viewers and chat
- [#61](https://github.com/K41R0N/timeline-game/issues/61) Versus and race mode for streamers
- [#44](https://github.com/K41R0N/timeline-game/issues/44) Remove dead code and clear lint warnings
- [#53](https://github.com/K41R0N/timeline-game/issues/53) Handle the missing year 0 in overlap and gap maths

## Critical path

1. Correct data (#48, #49, #50) and the core loop spec (#54).
2. Par (#57).
3. Daily puzzle (#58).
4. Share card and challenge links (#59).
5. PostHog metrics (#43).
6. Versus (#61).
