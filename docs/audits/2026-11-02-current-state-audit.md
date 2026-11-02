---
title: History Links current-state audit
date: 2026-11-02
commit: 5de56fc
status: snapshot (describes the game as built, not as intended)
---

# History Links: current-state audit

This is a record of what the game is today, measured against the code and live Wikipedia data. It covers what the player actually does, where the build differs from the design in `Gameplay-loop.md`, which defects break trust in the game, and why the loop does not yet produce fun or shareable moments. Direction belongs in `STRATEGY.md` and `docs/brainstorms/`. Section 10 lists the design levers those documents need to decide.

## Method and evidence tags

- Read every tracked source file (about 4,700 lines across `src/`, configs and docs).
- Ran `tsc --noEmit`, `next lint` and `next build`.
- Ran the shipped `WikipediaService` against live Wikipedia for all 58 curated target figures, plus edge cases (living people, non-people, lowercase input).
- Called the autocomplete search and the contemporaries hint query directly.
- Played the production build in headless Chromium: a random Easy start, a seeded Alexander the Great to Julius Caesar game, and a full win.

Each finding carries one tag:

- **[run]**: observed by executing the code.
- **[code]**: read directly from source, with file and line.
- **[calc]**: computed from the game's own data and rules.

## 1. What the game is, in one paragraph

History Links is a single-page Next.js app. You get two historical figures, the "targets", and you type names of other people from Wikipedia. Each name you add is placed on a horizontal timeline at its birth year and adds one point. Two people count as linked if their lifespans overlap by at least one calendar year. You win when a chain of overlapping lifespans connects the two targets. Lower score is better. There is no par, no time limit, no undo, no shared puzzle and no share output.

## 2. The as-built loop

| Step | What the player sees or does | Cost | Source |
|---|---|---|---|
| 1 | Splash screen, "Start Playing" | none | `SplashScreen.tsx` |
| 2 | Pick Easy (200–700 yrs), Medium (600–1400) or Hard (1200+) | none | `page.tsx:201-238` |
| 3 | Wait while 4–40 Wikipedia calls pick and load two targets | latency | `TargetSelectionService.ts:84-152` |
| 4 | Two portrait bubbles on a line. No rules are shown. The goal appears only when hovering the score badge | none | `page.tsx:307-324` |
| 5 | Type a name. Autocomplete runs after 500 ms. Pick a suggestion or press Enter | **+1 point if the page resolves to anything with a year** | `SearchBar.tsx`, `page.tsx:146-194` |
| 6 | Bubble placed at the person's birth year. Border is green if they overlap a target, plain otherwise. Dates are revealed only now | none | `Timeline.tsx:406-417` |
| 7 | Optional: hover for a card, click for a side panel with "Connection Hints" | 10+ API calls | `DetailPanel.tsx:24-56` |
| 8 | Repeat until breadth-first search finds a path between the targets | — | `ChainAnalyzer.ts`, `page.tsx:111-124` |
| 9 | Victory modal: score, vertical list of the chain, "Play Again" goes back to the splash screen | — | `WinModal.tsx` |

State autosaves to `localStorage` two seconds after each change (`useGameState.ts`). A reload restores the board.

## 3. Rules as implemented

- **Link rule.** `a.birth <= b.death && b.birth <= a.death` (`ChainAnalyzer.ts:12`). One shared year is enough: in the game's data, Ptolemy I (dies 285 BCE) and Archimedes (born 285 BCE) count as contemporaries. Year 0 is not skipped, so the 1 BCE to 1 CE boundary is counted as two years instead of one.
- **Dates.** Parsed from Wikipedia category names ("356 BC births"), then from a `(year – year)` pattern in the intro, then approximated. A decade becomes its midpoint plus 5, a century becomes its midpoint, a missing birth becomes death minus 30, and a missing death becomes birth plus 60 (`WikipediaService.ts:204-331`).
- **Win.** Breadth-first search over every placed figure. Any path between the targets wins (`ChainAnalyzer.ts:22-69`).
- **Score.** Placed figures minus the two targets, dead ends included (`page.tsx:104`). Nothing can be removed.
- **Targets.** Random pairs drawn from four hard-coded pools of 58 names (ancient, medieval, Renaissance, modern), filtered by the birth-year gap, with up to 10 retries and a fallback to Alexander the Great and Julius Caesar (`TargetSelectionService.ts`).
- **Feedback colours.** Yellow marks a target. Green means the figure overlaps a target, or after a win, sits on the path. Red at 60% opacity means a dead end, shown only after a win. Everything else is plain (`Timeline.tsx:406-417, 582-595`).

## 4. Designed vs built

The design source is `Gameplay-loop.md`.

| Designed | Built? | Notes |
|---|---|---|
| Central timeline with a BCE/CE divider | Yes | Divider appears only when figures straddle year 0 |
| Targets picked dynamically from anyone in history | Partly | 58 hard-coded names in four pools |
| Unconnected figures stay on the timeline but do not count | Yes | |
| **Progress bars** from each new person toward the previous one, length scaled by time gap, green toward the goal and red away from it | **No** | Only a faint connector from each bubble to the axis, green if the figure overlaps its neighbour in birth order. No direction, no length meaning, no red before a win |
| Hover card with name, dates and an overview | Yes | Description text is corrupted (D5) |
| Side panel with hints about contemporaries | Built, broken | Hints return year articles, not people (D4) |
| Golf scoring, +1 per person | Yes | |
| Links tell a story ("Alexander's general founds the dynasty that ends with Cleopatra") | **No** | The rule is date overlap only. No relationship data is fetched or shown |

## 5. Verified defects

Ordered by damage to the player's trust in the game.

| ID | Defect | Evidence | Location |
|---|---|---|---|
| D1 | **Wrong lifespans for famous figures.** Cleopatra is born 50 BCE (actually 70/69 BCE), Genghis Khan 1197 (c. 1162), Gutenberg 1438 (c. 1400) and Ramesses II 1350 BCE (c. 1303 BCE). When there is no exact-year category, the parser falls back to century midpoints or death minus 30, although the article intro states the dates | [run] | `WikipediaService.ts:276-331` |
| D2 | **Living people get a death year.** Barack Obama is shown as 1961–2021 (birth plus 60). Taylor Swift is shown as 1989–2024 (cause not traced) | [run] | `WikipediaService.ts:330` |
| D3 | **Non-people are accepted and cost a point.** Typing "Rome" and pressing Enter adds a "Rome" bubble dated 1447–1455 BCE, with death before birth. The person filter exists only in autocomplete. Free-text submit skips it | [run] | `page.tsx:163`, `WikipediaService.ts:174-359` |
| D4 | **Hints are noise.** Alexander's hints are the articles "1936; 1854; 1886…". Leonardo's are "1519 in France; 1452; 1519 in science…". The query is the text `-356 -323 births deaths`. Search reads `-356` as "exclude 356", so the years are dropped for every BCE figure. Results are never checked for overlap | [run] | `WikipediaService.ts:382-408` |
| D5 | **Corrupted descriptions.** The regex `(?:was\|is\|…)` matches "is" inside words, giving "istotle was an ancient Greek…", "ison was an American inventor…" and "ish as Raphael…". These strings show on hover cards and the win screen | [run] | `WikipediaService.ts:373` |
| D6 | **Additions can be silently lost.** `handleAddFigure` appends to a stale `figures` array, and input is not locked while an add is in flight. With 1–4 s responses in the playtest, 3 of 5 rapid adds were dropped or overwritten | [run] | `page.tsx:178` |
| D7 | **Fragile, slow start.** No User-Agent and no rate-limit handling. A 429 surfaces as "Failed to load initial figures". Easy's ancient-plus-medieval pairing can never pass its 200–700 gap check, so a third of Easy attempts are wasted. Medium falls back to Alexander and Caesar (a 256-year, Easy-sized gap) 1.5% of the time | [run] [calc] | `TargetSelectionService.ts:157-202` |
| D8 | **Zoom fights the user.** The snap-to-view effect depends on `zoom`, so every zoom re-centres the view 50 ms later. The snap maths multiplies by `zoom` twice. "Latest" means latest-born, not the figure just added | [code] | `Timeline.tsx:158-192` |
| D9 | `ProfileImage` is a component declared inside render, so it remounts on every render. The earlier "jitter" fixes worked around this rather than removing it | [code] | `Timeline.tsx:360` |
| D10 | **Score messages disagree.** The badge turns red at 4 or more (`page.tsx:285`). The win modal calls 4–6 "Great job" in yellow (`GameLogic.ts:61`). The win text says "N intermediate figures", but N counts dead ends that are not in the chain shown | [run] [code] | as cited |
| D11 | Name and ID come from the raw input. Lowercase typing shows "julius caesar". Redirect aliases ("Machiavelli" vs "Niccolò Machiavelli") get different IDs, which defeats duplicate detection | [run] | `WikipediaService.ts:347-348` |
| D12 | **Not playable on touch.** Panning is mouse-only, cards are hover-only, and the panel has a fixed 400 px width | [code] | `Timeline.tsx:470-478`, `DetailPanel.tsx:92` |
| D13 | Choosing an "In Timeline" suggestion does nothing | [code] | `page.tsx:354` |
| D14 | Dead code: `animationProgress`, `ScoreDisplay`, `wouldImproveChain`, `isConnectedToChain`, `calculateYearGap`, `calculateDifficulty`, `Z_INDEX` | [code] | various |

Build health [run]: `tsc` is clean, `next build` passes, and `next lint` reports 22 warnings (mostly `any`). There are no tests.

## 6. Documentation drift

| Doc | Claim | Reality | Status |
|---|---|---|---|
| `CLAUDE.md` | NPM-workspace monorepo with `game-core/` and `timeline-project/`, plus `historical-figures.json` | Single Next.js app with `src/lib/`. Neither the folders nor the JSON exist | Corrected in this change |
| `README.md`, `DEPLOYMENT.md` | Repo includes `vercel.json` | No such file | Corrected in this change |
| `README.md` | "Contemporary figure hints" works | Broken (D4) | Corrected in this change |
| `ROADMAP.md` | Phase 1: pre-processed JSON of 100–200 figures | Never built. Every date comes from live Wikipedia at play time | Left as is (it is a plan) |

## 7. Why it is not fun yet

A turn-based puzzle loop needs four things: a real decision each turn, information to make it with, feedback that shows progress, and a result worth retelling. The current build is weak on all four.

1. **The decision is thin.** With a one-year overlap rule, the best strategy is to name famous, long-lived people roughly 60–80 years apart. Winning tests rough date recall, not knowledge of how history connects. The moment the design wants, Alexander's general founding the dynasty that ends with Cleopatra, Caesar's lover, is neither modelled nor shown.
2. **The rule is invisible.** Overlap is the only rule, yet lifespans are never drawn. Bubbles sit at birth years only, so the player cannot see the gap to cross or plan a hop.
3. **Information arrives after the cost.** You pay a point to learn someone's dates. Partial chains growing from either target get no credit or colour, and the designed green and red progress bars do not exist.
4. **The score means nothing.** There is no par, no known best, no comparison, and two colour scales that disagree.
5. **Bad data punishes correct knowledge.** A player who knows Genghis Khan was born around 1162 is told 1197. In a knowledge game this loses players fastest.
6. **There is no help and no undo.** Hints are broken (D4) and a mistaken entry costs a point permanently.
7. **Length is uncontrolled.** Hard pairs are 1,611–3,768 years apart [calc] (for example Hammurabi to Mandela). At about 60–70 years per hop that is 25–60 names, typed one at a time.
8. **Every run is private and random.** Nobody else plays your puzzle, so there is nothing to compare or talk about.
9. **The payoff is a list.** The win screen shows names in a column. There is no story for each link, no reveal of the best possible chain, and no share output. The modal says "Share your score with friends!" but offers no way to do it.
10. **There is no onboarding.** The rules never appear, and the goal is hidden in a hover tooltip.

## 8. Content and shareability

What people need in order to make content around a game, against what this build gives them:

| Need | Today |
|---|---|
| A shared challenge everyone can compare | None. Targets are random for each session |
| A compact share result that does not spoil the answer | None |
| A board a viewer understands in two seconds | Partly. Portraits on a line read well, but lifespans and the remaining gap are invisible |
| Surprising, retellable outcomes | Not shown. No explanation of links, no "these two were alive at the same time" moments |
| Skill to show off (par, records, leaderboards) | None |
| Creator-made challenges (pick two people, send a link) | None. No URL state, targets are random only |
| Mobile and vertical play | Not playable on touch (D12) |

The premise already produces a kind of history fact that spreads well online: two people you would never place together turn out to share years. Every win generates several of these facts, and the game discards all of them.

## 9. What to keep

- **The premise.** It fits in one sentence and is new.
- **Negative integers for BCE years.** The convention is correct and simple, and it should stay.
- **The breadth-first chain check.** It is correct for its inputs and cheap. Its weakness is the data it receives, not the search.
- **Portrait bubbles on a horizontal axis.** This screenshots well and makes a natural backdrop for video.
- **Wikipedia's breadth.** "Name anyone" is a strong idea. It does not need to be the source of truth for scoring.

## 10. Design levers for the next iteration

These are the choices `STRATEGY.md` and the brainstorm need to settle. They are listed here so nothing is decided by default.

| Lever | Today | Options |
|---|---|---|
| L1 Link rule | Any one-year overlap | Minimum overlap (for example, both adults for N years) · documented relationship only · hybrid where overlap is valid and a real relationship costs nothing |
| L2 Puzzle source | Random from 58 names | Curated pool with precomputed par · one shared daily puzzle · creator-made link |
| L3 Input | Free-text recall over all of Wikipedia | Choose from a hand of candidates · free text limited to a curated set |
| L4 Tension | +1 per add, unlimited | Move limit · dead ends cost extra · timer |
| L5 Information before committing | None | Show lifespans in autocomplete · reveal only after placement (keep as a risk mechanic) |
| L6 Payoff | A list of names | Chain narrated link by link · reveal of the best chain · share card |
| L7 Data | Live category parsing | Wikidata birth and death dates with precision · precompiled dataset with `null` for living people |

### Candidate core loops

These are sketches to pressure-test in `ce-brainstorm`, not decisions.

- **A. Daily Bridge.** One target pair per day for every player. Par comes from a precomputed graph, adds are limited, the best chain is revealed at the end, and a row of emoji can be shared. Fixes problems 4, 7, 8 and 9 from section 7. Needs a curated dataset and offline par computation.
- **B. Story Links.** A link counts only if, or is free when, the two people have a documented relationship. Each link reveals one sentence on how they are connected. Fixes problems 1 and 9. Hardest on data: it needs relationship edges, for example from Wikidata properties or Wikipedia links.
- **C. Draft Bridge.** Each turn offers a few candidate figures and the player picks one, with a tight turn count. Fixes problems 2, 3 and 5 and D12, and removes recall friction. It shifts the skill tested from recall to judgement.
- **D. Challenge Links.** A creator picks two figures, the game produces a URL, and viewers race on it with a leaderboard per link. Fixes the content gap directly and reuses A's data and par engine.

These can be combined. A with C makes a complete daily mobile loop, and D runs on A's engine.

## 11. Questions the strategy has to answer

1. Who is the primary player: history enthusiasts, students and teachers, casual daily-puzzle players, or creators who stream and post?
2. What should a win prove: knowing dates, knowing who knew whom, or judging well under uncertainty?
3. Is "type anyone on Wikipedia" core to the fantasy, or can it give way to reliable data?
4. Should there be one shared daily puzzle, endless random play, or both?
5. What would a creator actually post: a score, a chain, a surprising link, or a race?

## Appendix A: parsed dates for the 58 curated targets

Values are what the shipped parser returned on 2026-11-02 [run]. ⚠ marks a known error larger than 15 years. Values without a mark are within a decade-midpoint approximation of commonly cited dates.

| Pool | Figure | Game birth | Game death | Note |
|---|---|---|---|---|
| Ancient | Alexander the Great | -356 | -323 | |
| Ancient | Julius Caesar | -100 | -44 | |
| Ancient | Cleopatra | -50 | -30 | ⚠ born 70/69 BCE. Only a century category was used |
| Ancient | Aristotle | -384 | -322 | |
| Ancient | Plato | -425 | -345 | |
| Ancient | Socrates | -475 | -399 | |
| Ancient | Augustus | -63 | 14 | |
| Ancient | Hannibal | -247 | -185 | |
| Ancient | Confucius | -551 | -479 | |
| Ancient | Ramesses II | -1350 | -1250 | ⚠ c. 1303–1213 BCE. Century midpoints |
| Ancient | Hammurabi | -1850 | -1750 | c. 1810–1750 BCE |
| Ancient | Pericles | -495 | -429 | |
| Ancient | Archimedes | -285 | -215 | |
| Ancient | Herodotus | -485 | -425 | |
| Ancient | Marcus Aurelius | 121 | 180 | |
| Medieval | Charlemagne | 745 | 814 | |
| Medieval | Genghis Khan | 1197 | 1227 | ⚠ born c. 1162. Death minus 30 |
| Medieval | Saladin | 1135 | 1193 | |
| Medieval | William the Conqueror | 1025 | 1087 | |
| Medieval | Richard the Lionheart | 1157 | 1199 | no image |
| Medieval | Joan of Arc | 1415 | 1431 | |
| Medieval | Marco Polo | 1255 | 1324 | |
| Medieval | Dante Alighieri | 1265 | 1321 | |
| Medieval | Thomas Aquinas | 1225 | 1274 | |
| Medieval | Kublai Khan | 1215 | 1294 | |
| Medieval | Eleanor of Aquitaine | 1125 | 1204 | |
| Medieval | Frederick Barbarossa | 1122 | 1190 | |
| Medieval | Akbar the Great | 1542 | 1605 | no image. Born after Columbus and Copernicus, yet in the medieval pool |
| Medieval | Suleiman the Magnificent | 1494 | 1566 | in the medieval pool |
| Renaissance | Leonardo da Vinci | 1452 | 1519 | |
| Renaissance | Michelangelo | 1475 | 1564 | |
| Renaissance | William Shakespeare | 1564 | 1616 | |
| Renaissance | Christopher Columbus | 1451 | 1506 | |
| Renaissance | Martin Luther | 1483 | 1546 | |
| Renaissance | Galileo Galilei | 1564 | 1642 | |
| Renaissance | Johannes Gutenberg | 1438 | 1468 | ⚠ born c. 1400. Death minus 30 |
| Renaissance | Elizabeth I | 1533 | 1603 | |
| Renaissance | Isaac Newton | 1643 | 1727 | in the Renaissance pool |
| Renaissance | René Descartes | 1596 | 1650 | |
| Renaissance | Nicolaus Copernicus | 1473 | 1543 | |
| Renaissance | Raphael | 1483 | 1520 | |
| Renaissance | Erasmus | 1465 | 1536 | |
| Renaissance | Machiavelli | 1469 | 1527 | no image |
| Modern | Napoleon Bonaparte | 1769 | 1821 | no image |
| Modern | George Washington | 1732 | 1799 | |
| Modern | Abraham Lincoln | 1809 | 1865 | |
| Modern | Queen Victoria | 1819 | 1901 | |
| Modern | Charles Darwin | 1809 | 1882 | |
| Modern | Karl Marx | 1818 | 1883 | |
| Modern | Thomas Edison | 1847 | 1931 | |
| Modern | Vincent van Gogh | 1853 | 1890 | |
| Modern | Marie Curie | 1867 | 1934 | |
| Modern | Albert Einstein | 1879 | 1955 | |
| Modern | Winston Churchill | 1874 | 1965 | |
| Modern | Mahatma Gandhi | 1869 | 1948 | |
| Modern | Franklin D. Roosevelt | 1882 | 1945 | |
| Modern | Pablo Picasso | 1881 | 1973 | |
| Modern | Nelson Mandela | 1918 | 2013 | |

Target-selection pass rates per attempt [calc], using the dates above: Easy 55% (ancient plus medieval 0%, medieval plus Renaissance 69%, Renaissance plus modern 95%), Medium 34%, Hard 100%. Each attempt costs four API calls.

## Appendix B: reproducing this audit

- **Data layer.** Transpile `src/lib/services/*.ts` with the repo's `typescript` and call `WikipediaService.getPersonDetails(name)` from Node. Wikipedia returns HTTP 429 to scripts without a descriptive `User-Agent` and spacing between requests (about 350 ms worked). Browsers send their own User-Agent, so players are less exposed, but the app has no 429 handling either way.
- **Browser playtest.** Run `npm run build && npx next start`, then drive the page with Playwright. In a sandbox without direct internet, relay `*/w/api.php` requests through Node with `page.route` (the same User-Agent and throttle). A seeded game can be injected through the `timeline-game-state` key in `localStorage`.
