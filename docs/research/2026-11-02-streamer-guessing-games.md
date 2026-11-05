---
title: How streamers play guessing and daily games (research for History Links)
date: 2026-11-02
status: research input for STRATEGY.md and ce-brainstorm
---

# How streamers play guessing and daily games

**Question.** How do streamers such as Ludwig, Northernlion and SmallAnt play GeoGuessr and similar games, and what does that mean for a history game about famous people?

**Confidence.** Most sources are press coverage, analytics blogs and summaries of videos, not the VODs themselves. Treat specific numbers as reported figures. Each claim is cited; see Sources at the end.

## 1. What these creators actually play

**Ludwig**
- Won the $100,000 Twitch Rivals GeoGuessr duo tournament with Caedrel as "LudRel". They lost one round in the whole event and won the best-of-five final 3–0. Some rounds were "No Move", where players cannot walk around [2][3][4].
- In another stream, GeoWizard had to place a location using only Ludwig's spoken description of it [5].
- **Built his own guessing game to beat Northernlion** [6][7]. It is called *Doppel* ("Date of Publication"): five rounds of media (film, painting, game, video), guess the release year, plus a bonus round for the exact month. A perfect score is 6,000 and themes rotate daily. He had other streamers play it where Northernlion would see it first, then included it in a 14-game quiz duel. Northernlion won 8–6, taking the decider on *Contexto* [6][7].
- Partnered on *Nitro Stream Racing*, where streamers race against their own chat [8].

**Northernlion**
- The games in the Ludwig duel give a good picture of his daily-game rotation [7]:

  | Game | What you do |
  |---|---|
  | Wordle | Guess a word |
  | Globle | Guess a country with warmer/colder hints |
  | Worldle | Guess a country from its outline, scored by % closeness |
  | Pokédoku / Puckdoku | Fill a grid with items matching category clues |
  | TimeGuessr | Guess the year and place of a photo |
  | Connections | Sort words into groups |
  | Movie to Movie | Link films through shared actors |
  | Guess the Game | Name a game from a screenshot |
  | Contexto | Guess a word ranked by semantic closeness |
  | Costco price game | Guess a product's price |

- A forum comment says he plays *Catfishing* (guess the Wikipedia article from its categories) as part of a "dles" series [9]. This is unconfirmed.
- His most-cited *TimeGuessr* moment: the game showed a photo of him as a child, and he guessed it to within one year and about 1 km [10]. This one surprise became a widely shared clip.

**SmallAnt**
- A variety speedrunner who builds challenge runs around rules, including some suggested by Twitch chat, and races other creators (Red Bull "Settle the Score", MC Championship) [11].
- Released "Wikipedia Speedrun Bingo is Surprisingly Intense" (2024-11-28) [11]. *Wikiracing*, racing between two articles by following links, is an established format under many names, including the Wikipedia Game, Wikispeedia and Wikipedia Speedrunning [12].

**How big GeoGuessr is on streams** [1]
- About 200K hours watched per quarter before the pandemic, 7.9M in Q1 2021, at least 1.5M every quarter since, and a record 9.3M in Q1 2025.
- Events drive the peaks: a February 2025 Twitch Rivals event drew 761K hours over two days, and a March 2025 streamer-hosted tournament set the record day at 599K hours.
- About 5.6K English-speaking and 4.7K German-speaking channels covered it in Q1 2025.

## 2. Closest analogues to History Links

| Game | Mechanic | Relevance |
|---|---|---|
| **Hollywoodle** [13] | Two actors each day, connect them through films or costars in as few moves as possible | The same core loop as History Links, but for movies, and run as a daily |
| **Movie to Movie** [13] | A daily shortest path between films through shared actors | Same loop again. Northernlion played it in the duel [7] |
| **Cine2Nerdle Battle** [13] | Head-to-head: players take turns naming a film linked to the last one, and you lose if you cannot continue | A versus format that maps directly onto "name a contemporary of the last figure" |
| **TimeGuessr** [10] | Guess the year and place of a photo, up to 5,000 points per round. Players can build five-photo games to share | History, scored by closeness. Played by GeoWizard, Northernlion, Ludwig and Limmy |
| **Doppel** [6][7] | Guess the release year of a piece of media, five rounds plus a month bonus | Year-guess scoring, built for a stream rivalry |
| **Wikitrivia** [14] | Place Wikipedia events on a timeline, three lives, gaps shrink as you go | Date knowledge on a timeline, sourced from Wikidata. No evidence that streamers adopted it |
| **Wikiracing** [11][12] | Race from article A to article B through links | Race and bingo formats with an existing creator audience |

## 3. What these games have in common

These are synthesized from sections 1 and 2.

1. **Chat can play too.** In GeoGuessr chat guesses alongside the streamer [4][15], and TimeGuessr runs have used chat to chase a perfect score [10]. *For History Links:* the board and the reasoning behind each pick have to be readable on screen and easy to argue about out loud.
2. **Closeness scoring, not right/wrong.** Kilometres off, years off, % closeness, a semantic rank, warmer/colder. Every guess produces a reaction, and "one year off" is a moment [1][7][10]. *Today:* History Links has a binary overlap check and a +1 per name, so there are no near-misses.
3. **Short, fixed rounds.** GeoGuessr's classic mode is five rounds, Doppel is five plus a bonus, Catfishing is ten questions [6][9][16]. These fit a stream segment or one leg of a duel. *Today:* game length is unbounded, and Hard needs 25–60 names (audit §7).
4. **Everyone gets the same puzzle.** Dailies and themed sets let a streamer compare with chat and with other streamers [7][13]. *Today:* every game is random.
5. **Versus and team formats.** GeoGuessr duels and tournaments, Cine2Nerdle battles and multi-game duels like Ludwig vs Northernlion produce collaboration content and peak viewing [1][2][7][13]. *Today:* single player only.
6. **Creators can make their own challenges.** TimeGuessr custom games, Doppel themes, and Ludwig building a game for one rivalry [6][10]. *Today:* targets are random and nothing lives in the URL.
7. **The clip is a surprise reveal.** Northernlion's childhood photo [10], and Ludwig's France theme backfiring [6]. *For History Links:* the "these two were alive at the same time?!" reveal is this kind of moment, and today the game never shows it (audit §8).
8. **Easy to follow, deep to master.** Anyone can watch GeoGuessr, yet top players become legends (Rainbolt) [2][15].
9. **Free, in the browser, instant.** Every game above runs in a browser tab. History Links already does.

## 4. What the research suggests for the open levers

These map to the levers in the audit (§10). They are inputs, not decisions.

- **L1 Link rule / L6 Payoff.** The tested formats reward a link you can explain, as in Hollywoodle's shared film or Cine2Nerdle's shared cast. History Links could make the reason two people are linked the reveal.
- **L2 Puzzle source.** A daily shared pair (as in Hollywoodle and Movie to Movie) plus creator-made links (as in TimeGuessr custom games) covers both the solo and the creator use.
- **L4 Tension.** Closeness scoring is the genre's main tool. One option is to make players guess a figure's years before the reveal, then score the guess. Another is to score the chain against par.
- **Versus.** A turn-based battle on "name someone alive alongside the last person" is the Cine2Nerdle Battle pattern applied to history, which suits collaborations and races.
- **Length.** Fixed rounds of a few minutes each, not open-ended chains.

## 5. Not verified

- Whether Northernlion runs a named recurring "dles" segment. Only a forum comment supports it [9].
- The rules of SmallAnt's Wikipedia Speedrun Bingo video [11].
- Streamer adoption of Wikitrivia, Hollywoodle or Movie to Movie beyond the single duel appearance [7][13][14].
- Doppel details come from coverage and a video summary, not the game itself [6][7].

## Sources

1. Hatchet (formerly Stream Hatchet), "The rise of GeoGuessr on live streaming": https://hatchet.gg/blog/the-rise-of-geoguessr-on-live-streaming/
2. Tubefilter, 2026-05-01: https://www.tubefilter.com/2026/05/01/have-you-heard-ludwig-geoguessr-latwo-gang-nfl-draft/
3. Pulse, "Caedrel and Ludwig Win the $100,000 Twitch Rivals GeoGuessr Duo Tournament": https://www.pulse.bot/gaming/news/caedrel-and-ludwig-win-the-100000-twitch-rivals-geoguessr-duo-tournament-3b263ba5-db76-41b1-8ca2-cd3fae5463b1/
4. esports.gg, "Caedrel Ludwig GeoGuessr tournament": https://esports.gg/news/streamers/caedrel-ludwig-geoguessr-tournament/
5. Dot Esports (Ludwig and GeoWizard): https://dotesports.com/?p=355888
6. Mein-MMO, "YouTube star secretly develops a game just to beat a smarter Twitch streamer" (2024-01-06): https://mein-mmo.de/en/youtube-star-secretly-develops-a-game-just-to-beat-a-smarter-twitch-streamer,1075048
7. OpenTools summary of Ludwig, "I secretly created a trivia game to destroy this streamer": https://opentools.ai/youtube-summary/i-secretly-created-a-trivia-game-to-destroy-this-streamer
8. Mein-MMO (German original, also covers Nitro Stream Racing): https://mein-mmo.de/ludwig-eigenes-raetsel-spiel-duell-youtube/
9. Tildes, "Catfishing, the Wikipedia guessing game": https://tildes.net/~games/1qm1/catfishing_the_wikipedia_guessing_game
10. Dexerto, "Twitch streamer shocked as picture of himself as a child appears as TimeGuessr question": https://jamtest.dexerto.com/entertainment/twitch-streamer-shocked-as-picture-of-himself-as-a-child-appears-as-timeguessr-question-2131231
11. Wikipedia, "SmallAnt": https://en.wikipedia.org/wiki/SmallAnt
12. Wikipedia, "Wikiracing" (mirror): https://cavac.at/cavacopedia/Wikiracing
13. Playlin, "Movie to Movie" listing, plus Hollywoodle and Cine2Nerdle descriptions: https://playlin-site-develop.pages.dev/game/movie-to-movie/ · https://www.producthunt.com/products/hollywoodle · https://jinandangor.bearblog.dev/new-game-idea-tag-team/
14. Wikipedia, "Wikitrivia": https://en.wikipedia.org/wiki/Wikitrivia
15. Mein-MMO, "A 12-year-old browser game makes its second comeback on Twitch": https://mein-mmo.de/en/a-12-year-old-browser-game-makes-its-second-comeback-on-twitch-and-german-streamers-dominate-worldwide,1240363
16. Wikipedia, "GeoGuessr": https://en.wikipedia.org/wiki/GeoGuessr
