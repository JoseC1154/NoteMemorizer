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
-awards after broken record.
-create timed chord builder.
-As the streaks build the seconds get shorter but if the user continue to answer incorrectly additional seconds should be added. (or not)
-quiz to test if user is ready for chord mode.
-multi language.
-Continue refactoring: Extract ui.js, game-logic.js, event-handlers.js modules
-on piano mode after ten correct of one scale that key is taken off the list tested.
-as the changes are taken place the setting should reflect.
-in stats i don't see the scale recognition suggestions.
-when the guitar is in phone display the note positions don't resize small enough making them look like they are jumbled up together then when the screen is larger displays they look very small, they should resize proportionally.
-when in landscape mode the and there is a game over the only thing on screen should be the questionBox and the menueToggle. the questionBox should be centered on screen.
-NEW MODE - finish my scale mode , where the questionBox asks to finish the scale and gives a key and its degree then asks the user to finish the scale. 
  -show 4 keys from the scale then asks the user to complete the scale.
    show 3 keys from scale also shows a key hint of one of the highlighted keys for the user to fill in the rest of the notes.
  -the question box asks what key is the 4 or C Major then asks "fill in the scale that has the note as a 6th Degree." (Compound question.)
-When starting the app I would like to start with an image, then when the image is pressed it would take you to the game start.
-the click to start should be the only thing showing before a game start.
-when a answer is correct could we have a the background flash an appropriate green tone to match the asthetic of the app then when wrong red .