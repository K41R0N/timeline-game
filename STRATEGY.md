---
name: History Links
last_updated: 2026-11-02
---

# History Links Strategy

## Purpose

Streamers have no history game they can compete on, because history trivia lacks closeness scoring and a shared, trustworthy puzzle. People are consistently surprised by how famous lives overlap: Pablo Picasso was alive at the same time as Pink Floyd.

## Positioning

Score the overlap itself. Every point comes from how famous lives overlap (who shares years with whom, and by how much), so every move produces a "they were alive at the same time?!" reveal. That makes chronology awareness a competitive and fun sport.

## Users

**Primary:** Streamers, the main distribution channel and the first target customer. They're hiring History Links to show off their history knowledge live, in a game fun, entertaining and simple enough to pick up mid-stream.

**Secondary:** Viewers, who watch a streamer play and then play the same puzzle themselves.

## Boundaries

- People only. No bands, empires, places or objects as links; a group gets in through its members.
- Data comes only from Wikimedia (Wikipedia and Wikidata). No third-party or hand-entered data.
- No user accounts yet. Play and share without signing up.

_Resist a change when:_ it adds a link that isn't a person's lifespan, data that doesn't come from Wikimedia, or a step that requires signing up.

## Key metrics

- **Reveal/share rate** - share-card copies or clip-tagged links per 100 completed games; PostHog.
- **Viewer-to-player conversion** - new players arriving through a streamer's challenge link or daily code, per stream session; PostHog.
- **Completed sessions** - games played through to the end, per week; PostHog.

## Tracks

### Overlap scoring, reveals and sharing

The core loop and its payoff: score how lives overlap, keep rounds short, and make the "alive at the same time?!" reveal the payoff, with the share card, challenge links and shared puzzles built around it. Free text for streamers; picking from suggestions for viewers and chat.

_Why it serves the approach:_ it is the positioning made playable, and the reveal is the moment people share.

### Wikimedia data, made usable

Make the Wikipedia API already in the code, plus Wikidata dates, reliable enough to compete on: correct lifespans, results limited to people, and living people handled.

_Why it serves the approach:_ overlap scoring is only fair when the lifespans are right.

### UI polish and mobile

A board chat can read at a glance on stream, and play that works on touch and vertical screens.

_Why it serves the approach:_ a streamer's flex only lands if viewers can follow it, and viewers who convert need to be able to play wherever they watch.

## Brand

**One-liner:** Chronology awareness as a competitive sport: who was alive at the same time as whom.
