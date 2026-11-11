---
title: History Links milestone audit
date: 2026-11-11
commit: a0920ae
status: snapshot (describes the game as built at the end of the daily-puzzle milestone, not as intended)
---

# History Links: milestone audit

This records the game as it stands when the daily-puzzle milestone merges into `main`: what changed since the [2026-11-02 audit](./2026-11-02-current-state-audit.md), how it was verified, what is known to be missing or risky, and what the next milestone starts from. Direction stays in `STRATEGY.md`; the prioritised work is in `ROADMAP.md` and issue #37.

## 1. What the game is now

History Links links two famous people through others whose lives overlapped. It is played three ways, and those three ways are the difficulty scale:

| Style | The player | Score | Fixed answer? |
|---|---|---|---|
| Easy | Arranges the chain's name cards, plus 2 decoys, between the two targets and presses Check | Checks (1 is perfect) | Yes |
| Medium | Names each hidden person; each blank shows one box per letter | Wrong guesses plus wild-card reveals | Yes |
| Hard | Types anyone alive at the same time as a card on the table | Strokes against par | No: any valid chain counts |

Every UTC date has three daily puzzles with the same number (#1 is 2026-11-07), one per style, at `/daily/<n>/easy`, `/daily/<n>/medium` and `/daily/<n>` (Hard). Each browser gets one scored attempt per puzzle and style, and past puzzles replay as practice. Free play at `/play` deals a fresh puzzle in any style. The site opens on a game menu: today's three dailies with their status, free play by style, past puzzles and How to play.

The look is the Deck (`DESIGN.md`): a petrol card table, white card stock, era-coloured spines, gold foil on the targets and the primary action, and a chalk bay for the gap still to bridge.

## 2. What changed since the 2026-11-02 audit

| Area | Then | Now | Issues |
|---|---|---|---|
| Data | Lifespans guessed from categories and descriptions; non-people accepted | Wikidata years, humans only, canonical identity, impossible lives rejected; a committed roster of 1,751 people | #46, #48, #49, #50, #79 (closed) |
| Scoring | One point per name, no par | Hard: strokes against par computed from the roster; overlap reveal on every link; Clutch and Long bridge marks | #54, #56, #57, #64 (closed) |
| Difficulty | Years apart | Hard: par and options per step (bands); Easy and Medium: three styles of play | #52 (closed) |
| Board | Pan-and-zoom bubbles on one line | Cards on a vertical table at their birth year, spines as long as the life, the gap as a chalk bay | #55, #63 (closed by this merge) |
| Daily | None | Three frozen daily puzzles per date, a year ahead, checked in CI | #58 (closed by this merge) |
| Screens | Splash, difficulty picker, round | Game menu, round per style, end screens, archive, How to play; phone and desktop layouts | #65, #66 (partly done) |
| Quality | No tests, no CI | Vitest (294 tests, 291 run offline), CI on every PR: lint, typecheck, tests, build | #42, #45 (closed) |

## 3. How the puzzles are made

- **Hard dailies** (`daily-schedule.json`): a famous pair whose par and narrowest step fit the weekday's band, stored with its par chain. The weekday only chooses how far apart the pair is; the round always plays on Hard rules.
- **Easy and Medium dailies** (`daily-easy.json`, `daily-medium.json`): targets from the 400 best-known people; a shortest chain drawn one person at a time with odds in proportion to language editions (Easy's chain from the 600 best-known, Medium's from the whole roster); neighbours sharing at least 5 years where an approximate date sets the edge. Easy adds 2 decoys that leave exactly one valid order. Medium rejects a blank whose letter pattern another fitting person shares.
- **No repeats:** a date's three puzzles share no people; no target returns within 14 days; no person returns to a style's chains within 14 days. Across the generated year, Easy uses 248 different people and Medium 343, and nobody appears more than 21 times a year or twice in 30 days.
- **Frozen:** each entry stores its people and years. CI rechecks every entry from what it stores, and runs the roster-wide checks only for entries built from the current roster, so a roster rebuild never fails a published puzzle.
- **Coverage:** 370 puzzles per style, through 2027-11-11. CI fails once fewer than 30 remain after today (around mid-October 2027); `CAPTURE_DAILY` extends all three files.

## 4. How this milestone was verified

- **[run]** `npm test`: 291 passed, 3 skipped (the network capture tests). `npx tsc --noEmit` clean. `npm run lint`: 0 errors, 6 warnings, all older than this milestone (#44). `npm run build` clean.
- **[run]** Schedule generation: 370 Easy and 370 Medium entries, one per Hard entry, no health-check problems; every Hard entry that existed before is byte-identical.
- **[run]** Bundle check: no field that only the schedule files carry appears in the client chunks, so future puzzles never reach the browser.
- **[run]** Playwright on the production build, emulated iPhone 13 and 1440 px: full Easy and Medium dailies to their results, a result reopened after reload, a future puzzle showing only its release date, menu and archive statuses per style, free play in all three styles, and a free-play save from before this milestone reopening as Hard.
- **[run]** Code review of the milestone diff (correctness, testing, maintainability, reliability, frontend). It ran in the same session that wrote the code, so it was not independent. Its two findings were fixed: Easy's repeated people (now the fame-weighted draw with a 14-day gap) and Medium's "Drawing…" label while checking a name.
- **[run]** CodeRabbit on PR #84: 4 major and 19 minor findings. Fixed: dialog focus on the result screens and How to play, the Hard daily no longer waiting on Wikimedia (it starts after 4 seconds without portraits), Medium surviving a failed roster load, and 16 of the minor findings. The three left are explained on the PR.

## 5. Known gaps and risks

| Gap | Effect | Where it is tracked |
|---|---|---|
| No share card or challenge links | The result cannot leave the browser; the strategy's sharing metric has nothing to count | #59 |
| Analytics off | `NEXT_PUBLIC_POSTHOG_KEY` is unset, so no play data reaches PostHog and the bands cannot be tuned | #43, #82 |
| Deploy target unconfirmed | Production and preview deploys of this milestone are not verified | #47 |
| No stream mode | The desktop layout reads at 1280×720, but there is no larger-type, webcam-safe mode | #66 |
| How to play only on the menu | No first-visit overlay and no "?" inside a round | #65 |
| Physical phones untested | Only emulated; Safari and the on-screen keyboard over the dock are unverified | #66 |
| Answers in the page | A published Easy or Medium puzzle's answers are in its page data (accepted: there is no backend) | Plan KTD7 |
| Portraits | Wikimedia rate-limits shared IPs (HTTP 429); in testing only the initials fallback was seen | — |
| No component tests | The round screens are covered by browser runs, not automated tests | — |
| Year 0 | Overlap and gap maths treat 1 BCE to 1 CE as two years | #53 |
| Lint warnings | 6 warnings remain | #44 |

## 6. Open decisions

- **#60 Suggestion-pick input:** Easy already gives a keyboard-free way to play. Close it, or rescope it to chat voting for streams.
- **#81 One-answer puzzles:** Easy and Medium have fixed answers, but not the "single well-known bridge" Hard round this issue describes. Keep it as a Hard variant, or close it.
- **Hard daily rules on weekdays:** Monday to Thursday used to give free wild cards; now every Hard round charges one stroke per wild card. Confirm before launch.

## 7. Where the next milestone starts

The game can now be played well; it cannot yet spread or be measured. The next milestone is launch and sharing: confirm deploys (#47), turn analytics on (#43), build the share card and challenge links (#59), then stream mode and the rest of #65 and #66. `ROADMAP.md` lists the order.
