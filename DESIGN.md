# Design: the Deck

History Links plays as a hand of cards laid down a table. This file records the built world: the menu (`ui/DailyHome.tsx`), the Hard round (`GameRound.tsx`, `Board.tsx`), the Easy and Medium rounds (`EasyRound.tsx`, `MediumRound.tsx`, `ui/ChainTable.tsx`), the end screens (`ui/WinModal.tsx`, `ui/StyleResult.tsx`) and the archive. Product facts live in `PRODUCT.md`; the round screen's direction contract is in `.impeccable/surfaces/round.md`.

## World

- **Table:** a deep petrol table lit from above (`--table`, `--table-light`, `--table-deep`). Everything on it is a card, a plate or chalk.
- **Cards:** white card stock (`--card-stock`) with ink text (`--card-ink`, `--card-muted`). A card holds only a portrait, a name and years.
- **Foil:** gold (`--foil`, `--foil-light`, `--foil-deep`, `--foil-ink`) marks the two targets, par, the primary action (Play) and the winning thread. Nothing else is gold.
- **Chalk:** the open gap is a dashed bay drawn in chalk (`--chalk`, `--chalk-text`).
- **Eras:** a card's spine and no-portrait face take the colour of its birth era: ancient before 500 (`--era-ancient`), medieval to 1399, renaissance to 1649, enlightenment to 1849, modern after. `eraOf` in `src/lib/utils/board.ts` owns the boundaries.

All tokens are CSS variables in `src/app/globals.css`. Tailwind opacity modifiers do not work on them; use the token or an arbitrary rgba value.

## Type

- **Display:** Big Shoulders at its display optical size, through the `.type-display` class (sets `opsz` 72 and tabular numerals). Names, years, labels on plates and buttons, the goal line. Always uppercase except years.
- **Body:** Onest (`--font-body`) for anything read as a sentence: the rule line, reveal text, descriptions, inputs.
- Both load through `next/font/google` in `src/app/layout.tsx`.

## Layout

- Time runs down the table at every width. A card's top is its birth year and its spine is exactly as long as the life; the card body may be taller than the life (minimum 60 px, 84 px in wide columns) so the portrait and name fit, and a tall card prints the death year at its foot.
- Cards fill 2 columns on phones, 3 from 560 px of table width, 4 from 900 px, taking columns in turn so neighbours in time sit side by side. A card that finds every column covered lies on the one that ends first, shifted 10 px right (`tableLayout`).
- The year rail is the left 44 px of the table; dotted lines cross the table at each tick.
- Phone: header (Home, round label, score plates, goal, rule), the table, then the hand. Desktop (1024 px and up): header, score and hand in a 400 px left column; the table fills the rest and fits the whole span on screen.
- Easy and Medium use the same header, hand and columns, but their table is a single line of cards from one gold target to the other, joined by a chalk line, because the years stay hidden until a card is right. On phones the hand area scrolls when an Easy hand is large.

## Saying less

Every screen says one thing at a time; the table carries the detail.

- The round's rule line shows only until the first card is played.
- A placed card's line in the hand names one fact (the most useful overlap, or how far it missed) and clears itself after 4.5 s. The card itself carries the name and years.
- Cards carry a portrait, a name and years, nothing else. Descriptions live in the detail sheet.
- The end screen leads with one word (Par, Birdie!, Bogey) and the score plates; par's chain waits behind a toggle.
- Explanations of badges and rules live in How to play, not on the playing surfaces.

## Components

- **Score plates:** strokes on card stock beside par on foil. Strokes turn amber over par and red for an under-par finish (the golf convention). Small in the phone header, large in the desktop column.
- **Card:** button, rounded 10 px, a 4 px drop shadow under it. Targets get a gold ring and foil spine. Loose cards (not linked to a target) fade to 75% and lose saturation; off-chain cards after a win fade further; the winning chain lifts.
- **Gap bay:** dashed chalk outline across all columns from the earlier chain's reach to the later chain's reach, with a "N years to bridge" pill that sits above the cards.
- **Hand:** the wild card (hint) as a gold-outlined pill that turns solid gold with "Play <name>" once drawn; the name field on card stock; Play on gold with a hard 3 px foil-deep base.
- **Reveal:** one card-stock line in the hand, ringed gold (an overlap) or red (a miss), that clears itself; on the winning card it holds a gold See your result button.
- **Detail sheet:** card stock; bottom sheet on phones, right drawer from 640 px.
- **Easy and Medium line:** each target and slot is a full-width card. A placed Easy card shows its portrait and name with a grey spine; a right card turns over (the landing flip) and gains its era spine and years. An open slot is a dashed chalk bay with its number; an open Medium blank shows one box per letter, grouped by word, and the selected blank wears the light-gold ring. The score sits on one card-stock plate (Checks or Misses), never par.
- **Easy hand:** name cards as card-stock chips with a small portrait; the selected chip lifts and wears the light-gold ring. Check is the gold primary action, dimmed until every slot holds a card. After a Check one line says how many are in place and clears itself.
- **Medium dock:** the wild card as a gold-outlined pill ("Wild card +1") that reveals the selected blank, and the same name field as Hard. A miss shows one red-ringed line ("Not …", or "… fits, but the chain wants someone else") that clears itself.
- **Menu:** the title, today's dailies on a gold-edged card (number and weekday, then one row each for Easy, Medium and Hard with how it plays and Play, Continue or the result, then the countdown). Only the first style still to finish gets the gold button. Then free play: Continue Hard when a Hard round is saved, and Easy, Medium and Hard as cards showing a fan of one, two or three card backs and how each plays. Choosing one starts a game at once (`/play?d=<style>`). Past puzzles and How to play sit quietly below.
- **End screen:** the result word in display type, the large score plates, your chain as a row of small cards with the shared years between each pair, Long bridge and Clutch as gold marks, par's chain behind a toggle when it differs, and one gold action.
- **Easy and Medium end screen:** Perfect (one Check, or no misses, with a gold ring) or Solved, the count on one large plate, one square per slot (card stock: right first time; chalk: after a miss; dashed: revealed), the chain as small cards, and one gold action.
- **Archive:** one card-stock row per date: number and weekday, then Easy, Medium and Hard, each with your result or what opening it would do, each linking to its puzzle.

## Motion

- **The landing:** a newly played card drops 18 px, turns from its foil back to its face over 900 ms, and its years count up into place. This is the one authored moment.
- **The thread:** when the chain completes, a gold line draws through the winning cards from target to target over 1.4 s.
- Everything else is 200 ms state change. With reduced motion the card appears face up with its years, and the thread is drawn at once.

## Not yet in this world

The share card (not built yet).
