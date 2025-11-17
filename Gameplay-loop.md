# "History Links" - Core gameplay loop

The game consists of a simple interface:

- There's a central timeline that represent the years of history. It's separated in the middle with a "BCE" and "CE" line that marks the common era from "before the common era". Years before the common era work in a countdown, so any historical person that has a birth or death year that contains BCE (or BC in the different notation for Before Christ) acts as a negative number. (someone born in 354 BCE/BC is older than a person born in 98 BCE/BC). Make sure to keep this in mind so we don't accidentally place a person who's technically older in the timeline later than someone born in 98 CE, for example.

- The main gameplay is simple: You are assigned to random people from history, for example Alexander the Great and Julius Caesar, but it can be any person from history that's dynamically picked at the start of the game. These two people are referred to as "targets", and your goal is to make an unbroken chain of contemporaries for these people, with the goal of eventually connecting the two targets through the lifetimes of their contemporaries (For example, Alexander would be connected to Julius Caesar through the Ptolemy dynasty, descended from one of Alexander's generals leading all the way to Cleopatra, a contemporary of the Caesar). If a player inputs someone who does fit in between the two targets, but isn't connected directly to either of them, the person is still placed in the timeline, but it doesn't count towards winning the game until they're connected to the unbroken chain. The win state is connecting the chain between the two targets with the fewest amount of people submitted into the timeline.

- Whenever a new person is submitted into the timeline, we can indicate progress by adding "progress bars" that point towards the previous person who was added to the timeline, to the left or right depending on whether they're later or earlier. This progress bar extends from the "Profile bubble" of the new person who was input, towards the previous one, and its length varies depending on how distant these two people are on the timeline (e.g. Alexander - Ptolemy ------ Cleopatra -- Augustus) The line is green if it marks progress towards the bridging the gap between the two targets (from either side, just as long as they're contemporaries), if it actually gets the player further (e.g picking someone who was earlier than the targets or the previous person, or later past the last target's lifetime) the line is red.

- If you hover over the profile bubble for any person that's been submitted into the timeline, it displays a simple card giving a brief overview in the form of a "Description card" of the Person's lifetime achievements, their name, and birth & death year; if either the description card or the profile bubble, then a side pannel pops up that elaborates on the person's life and peppers some hints about their contemporaries in the description text on the sidebar.

- This game has a points counter that goes up the more people you add into the timeline, the goal is to bridge the gap between the two targets with the lowest score.


The game is meant to be simple and engaging to play, it's a fun way to learn about the links in history. If any component of the gameplay loop could be made simpler or more engaging, offer alternatives and solutions in this document below this paragraph, so we can ideate together and make this game the most fun and streamlined it can be.

## Questions for Gameplay Clarification

1. **Score System Implementation**
   - How should we implement the points counter? Options to consider:
     - Points based on the time gap between connected figures
     - Points based on the total number of connections made
     - A combination of both with bonuses for direct contemporary connections

   **Answer:** The scoring system will follow golf rules - the lower the score, the better. Each person submitted to the timeline adds exactly one point to the counter. The goal is to connect the two target historical figures using the minimum number of people possible, thus achieving the lowest score. This keeps the scoring system simple and intuitive while encouraging players to think carefully about their historical connections.

2. **Contemporary Connection Logic**
   - How should we determine if two figures are contemporaries? Options to consider:
     - Use overlapping lifetimes (any overlap in birth/death years)
     - Require a minimum number of years of overlap
     - Consider historical records of actual interactions

3. **Progress Visualization**
   - Should we enhance the current green/red progress bars with:
     - A percentage or visual indicator of connection progress
     - A "chain view" showing valid connections vs unconnected figures
     - Hints system for stuck players

4. **Game Modes**
   - Should we consider additional game modes such as:
     - Time-limited challenges
     - Different difficulty levels (based on time gap between targets)
     - Educational mode with more historical context
     - Multiplayer/competitive mode

5. **Historical Data Source**
   - Regarding the Wikipedia data integration:
     - Should we cache commonly used historical figures?
     - How do we pre-validate contemporary connections?
     - Should we include sources for historical claims?

6. **User Interface Enhancements**
   - Should we add additional features like:
     - Tutorial/onboarding experience
     - Achievement system
     - Visual feedback for successful connections
     - Historical event markers on the timeline

7. **Error Handling and Edge Cases**
   - How should we handle:
     - Disputed historical dates
     - Figures with uncertain birth/death years
     - Multiple possible connection paths

Please provide answers to these questions to help clarify the gameplay mechanics and improve the overall user experience.