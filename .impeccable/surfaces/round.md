# Round screen

Targets: `src/lib/components/GameRound.tsx`, `src/lib/components/Board.tsx` (both the daily puzzle and free play).

## Scope

Visitor mode: Experience. The player is inside the work; the table is the game. Controls stay standard web controls, at least 44 px, within thumb reach on phones.

## Audience and job

A streamer on desktop, captured into a stream that chat reads at 720p; viewers on phones playing the same puzzle. Job: link the two targets through people whose lives overlapped, in as few placements as possible.

## Direction contract

THESIS: History as a hand of cards laid down a table. Each person placed is a card drawn face down that turns over to show their years and lands where those years sit. Refuses the flat tile grid of daily puzzles, the neon gamer skin, and grey bars on a light page.

OWN-WORLD: Deep petrol table lit from above; white card stock; card frames coloured by era of birth (terracotta, lapis, vermilion, plum, jade); gold foil on the two targets; a chalk-dashed bay for the open gap. Names and numerals in Big Shoulders Display; sentences in Onest.

STORY: The player sees two gold cards and the empty bay between them, names someone, watches the card turn and land, sees the bay shrink, and finishes with a gold thread from target to target.

FIRST VIEWPORT: Phone: back control and round label top left, strokes and par plates top right, the goal as one line of gold names, the table filling the middle with a year rail on the left and cards in two columns, the gap bay with its year count, the hand at the bottom with the wild card, the name field and PLAY. Desktop: the same table on the right, the header, goal and hand in a left column.

FORM: Trading cards on a measured table, first of seven on the ordered list. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisions made during the build

- Time runs down the table at every width. The direction board proposed a sideways table on desktop; a vertical table scrolls cleanly for Hard puzzles that span two thousand years, so desktop keeps the vertical table and moves the header and hand into a left column instead.
- Cards carry only a portrait, a name and the years. Overlaps show as cards sharing height on the table, not as text on the card.

## Open decisions

- Rarity foils by fame (not built).
- Result screen, home and share card in the Deck world (next).

## Finish review

Verdict: the build meets the contract on the round screen, checked in an emulated iPhone 13, at 1440 x 900 and at 1280 x 720.

- Thesis and story: cards land face down and turn over with their years counting up (verified with a real placement of Geoffrey Chaucer, portrait from Wikipedia); the gap bay shrinks; the gold thread draws through the winning chain.
- Own world: petrol table, card stock, era spines, gold foil on targets, par and Play, chalk bay, Big Shoulders and Onest.
- First viewport: as written on the phone; on desktop the header, score and hand sit in the left column and the table fits the whole span.
- Not reached yet: the end screen, home, archive and share card. Untested: a physical phone (Safari, the on-screen keyboard over the hand).
- Rasters: the only images are Wikipedia page images loaded at runtime; the build ships none of its own.
