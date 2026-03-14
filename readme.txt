https://josec1154.github.io/NoteMemorizer/

✅ COMPLETED:
-Piano visualization mode with keyboard display
-Scale type selector in settings (Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Locrian, Harmonic Minor, Melodic Minor)
-Piano keys show which notes are in the selected scale (shaded for notes not in scale)
-Two octaves displayed
-Piano positioned under question box with same width
-Add a set as default button (two-tier settings: Save vs Set as Default)
-Code refactoring: COMPLETED! Extracted 8 ES6 modules
  • Reduced main file by 68.2% (2,952 → 941 lines, 2,011 lines extracted)
  • Improved maintainability and code organization
  • Fixed null keyRoot bug in progression mode
  • Fully testable with dependency injection pattern
  • All game features working correctly
-Audio volume increased 4x for better audibility
-Note to Degree mode: Shows piano and asks "Eb is what degree in the Db major scale?"
-add infinity for the timer.
-create timed chord builder.

TODO:
-awards after broken record.
-As the streaks build the seconds get shorter but if the user continue to answer incorrectly additional seconds should be added. (or not)
-quiz to test if user is ready for chord mode.
-multi language.
-Continue refactoring: Extract ui.js, game-logic.js, event-handlers.js modules
-on piano mode after ten correct of one scale that key is taken off the list tested.
-as the changes are taken place the setting should reflect.
-in stats i don't see the scale recognition suggestions.
-when the guitar is in phone display the note positions don't resize small enough making them look like they are jumbled up together then when the screen is larger displays they look very small, they should resize proportionally.
-when in landscape mode the and there is a game over the only thing on screen should be the questionBox and the menueToggle. the questionBox should be centered on screen.
-When starting the app I would like to start with an image, then when the image is pressed it would take you to the game start.
-the click to start should be the only thing showing before a game start.
-when a answer is correct could we have a the background flash an appropriate green tone to match the asthetic of the app then when wrong red.
- update statistic to include latest updates.
- in scale recognition mode, the user should be able to select the note on the instrument ui.
-I would like for the modes to use differen chord progressions degrees for the questions, for example 4536251,
-when paused any selection of the notes or answer buttons should also un pause.
-when the user has a streak of 20 it is necesary to remove the scale shading that seve as training wheels. then bring them back when the user loses the streak.
-note recognition modewhat note is highlited, what note is "C" / in the bass and guiter the ? "in the first four frets what note is 'E'?, select the E or E's in the first four frets." 
-there are more modes should they each have their own JS file. Should we refactor. 


