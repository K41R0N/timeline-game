# History Links Roadmap

GitHub issues are the source of truth. This file mirrors the tracking issue [#37](https://github.com/K41R0N/timeline-game/issues/37), so update both together.

- **Direction:** [`STRATEGY.md`](./STRATEGY.md), which is streamer-first and commits to scoring the overlap itself.
- **As built:** [`docs/audits/2026-11-11-milestone-audit.md`](./docs/audits/2026-11-11-milestone-audit.md). The starting point was [`docs/audits/2026-11-02-current-state-audit.md`](./docs/audits/2026-11-02-current-state-audit.md).
- **Research:** [`docs/research/2026-11-02-streamer-guessing-games.md`](./docs/research/2026-11-02-streamer-guessing-games.md) and [`docs/research/2026-11-06-difficulty-balancing.md`](./docs/research/2026-11-06-difficulty-balancing.md) (difficulty by par and options per step).
- The original six-phase plan (2025) is in git history, before commit `8f5a304`.

## Structure

| Epic | Strategy track |
|---|---|
| [#38 Foundations](https://github.com/K41R0N/timeline-game/issues/38) | Supports all tracks: tests, CI, API client, analytics, deploy |
| [#39 Wikimedia data, made usable](https://github.com/K41R0N/timeline-game/issues/39) | Wikimedia data, made usable |
| [#40 Overlap scoring, reveals and sharing](https://github.com/K41R0N/timeline-game/issues/40) | Overlap scoring, reveals and sharing |
| [#41 UI polish and mobile](https://github.com/K41R0N/timeline-game/issues/41) | UI polish and mobile |

**Labels:** `track:foundation|data|gameplay|ui` for the area, and `P0` (now), `P1` (next) or `P2` (later) for order. The issue type is Bug, Feature or Task. PRs close issues with `Fixes #N`.

## Done

**Milestone 1, trustworthy data and the core loop (merged 2026-11-07, PR #83):** [#42](https://github.com/K41R0N/timeline-game/issues/42) Vitest, [#45](https://github.com/K41R0N/timeline-game/issues/45) CI, [#46](https://github.com/K41R0N/timeline-game/issues/46) Wikimedia client, [#48](https://github.com/K41R0N/timeline-game/issues/48) [#49](https://github.com/K41R0N/timeline-game/issues/49) [#50](https://github.com/K41R0N/timeline-game/issues/50) Wikidata-backed people, [#51](https://github.com/K41R0N/timeline-game/issues/51) real hints, [#52](https://github.com/K41R0N/timeline-game/issues/52) difficulty by par, [#54](https://github.com/K41R0N/timeline-game/issues/54) core loop spec, [#56](https://github.com/K41R0N/timeline-game/issues/56) overlap reveal, [#57](https://github.com/K41R0N/timeline-game/issues/57) par, [#62](https://github.com/K41R0N/timeline-game/issues/62) lost additions, [#64](https://github.com/K41R0N/timeline-game/issues/64) one score scale, [#79](https://github.com/K41R0N/timeline-game/issues/79) impossible lifespans.

**Milestone 2, daily puzzles and three ways to play (merged 2026-11-11):** [#58](https://github.com/K41R0N/timeline-game/issues/58) daily puzzles, one per style per date, [#55](https://github.com/K41R0N/timeline-game/issues/55) lifespans on a card table with the gap to bridge, [#63](https://github.com/K41R0N/timeline-game/issues/63) the pan-and-zoom timeline replaced; Easy (arrange cards) and Medium (fill blanks) beside Hard; the Deck redesign, game menu and archive. Plans: [`docs/plans/2026-11-07-1521-feat-daily-shared-puzzle-plan.md`](./docs/plans/2026-11-07-1521-feat-daily-shared-puzzle-plan.md), [`docs/plans/2026-11-09-0000-feat-three-play-styles-plan.md`](./docs/plans/2026-11-09-0000-feat-three-play-styles-plan.md). As built: [`docs/audits/2026-11-11-milestone-audit.md`](./docs/audits/2026-11-11-milestone-audit.md).

## Next milestone (P1): launch and sharing

The game can be played well; it cannot yet spread or be measured. In order:

1. [#47](https://github.com/K41R0N/timeline-game/issues/47) Confirm production deploy target and PR preview deploys
2. [#43](https://github.com/K41R0N/timeline-game/issues/43) Turn PostHog on (events are instrumented; the project key is not set) and build the insights in `DEPLOYMENT.md`
3. [#59](https://github.com/K41R0N/timeline-game/issues/59) Share card and challenge links, for all three styles (per-slot squares for Easy and Medium, strokes against par for Hard)
4. [#66](https://github.com/K41R0N/timeline-game/issues/66) Remaining: stream mode (larger type, webcam-safe area) and a check on physical phones
5. [#65](https://github.com/K41R0N/timeline-game/issues/65) Remaining: How to play on first visit and from a "?" inside a round

## Later (P2)

- [#61](https://github.com/K41R0N/timeline-game/issues/61) Versus and race mode for streamers
- [#80](https://github.com/K41R0N/timeline-game/issues/80) Marathon mode: long-chain rounds as a stream event
- [#82](https://github.com/K41R0N/timeline-game/issues/82) Tune difficulty bands from play data (needs #43)
- [#81](https://github.com/K41R0N/timeline-game/issues/81) One-answer Hard rounds with a single well-known bridge (decision below)
- [#60](https://github.com/K41R0N/timeline-game/issues/60) Suggestion-pick input for viewers and chat (decision below)
- [#44](https://github.com/K41R0N/timeline-game/issues/44) Remove dead code and clear lint warnings (6 left)
- [#53](https://github.com/K41R0N/timeline-game/issues/53) Handle the missing year 0 in overlap and gap maths

## Open decisions

- **#60:** Easy already gives a keyboard-free way to play. Close it, or rescope it to chat voting for streams.
- **#81:** keep it as a Hard variant, or close it now that Easy and Medium have fixed answers.
- **Hard daily rules:** every Hard daily now charges one stroke per wild card, including Monday to Thursday, which used to give them free. Confirm before launch.

## Critical path

1. Correct data (#48, #49, #50) and the core loop spec (#54). Done.
2. Par (#57) and difficulty bands (#52). Done.
3. Daily puzzles in three styles (#58). Done.
4. Deploy and analytics (#47, #43).
5. Share card and challenge links (#59).
6. Stream mode (#66), then versus (#61).
