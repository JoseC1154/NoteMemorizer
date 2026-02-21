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

TODO:
-then when closed should restart or install play pause button 
-awards after broken record.
-create timed chord builder.
-As the streaks build the seconds get shorter but if the user continue to answer incorrectly additional seconds should be added. (or not)
-quiz to test if user is ready for chord mode.
-multi language.
-Continue refactoring: Extract ui.js, game-logic.js, event-handlers.js modules
-on piano mode after ten correct of one scale that key is taken off the list tested.
-as the changes are taken place the setting should reflect.
-in stats i don't see the scale recognition suggestions.
-in instrument expanded mode the question should be along with the expanded mode.
-when the test is on and the width is longer than the height like in phone mode the answer button should slide to the right under the question box or instrument container 1 by 1 or 2 by 2 to the left the up into spot in an animated way. to take advantage of the space.
- when in degree to note mode the instrument buttons should be disabled.
-if in landscape mode the instrument buttons should be vertical: +, Piano, Guitar, Bass instead of horizontal.
- Add Bass instrument.
-when the guitar is in phone display the note positions don't resize small enough making them look like they are jumbled up together.
-when in expanded view I would like a new button to toggle the display of notes. 
-when in landscape mode the and there is a game over the only thing on screen should be the questionBox and the menueToggle. the questionBox should be centered on screen.
-When instrument is in expanded viev no need for additional instrument buttons
-
