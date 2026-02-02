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

TODO:
-then when closed should restart or install play pause button 
-awards after broken record.
-create timed chord builder.
-As the streaks build the seconds get shorter but if the user continue to answer incorrectly additional seconds should be added. (or not)
-quiz to test if user is ready for chord mode.
-multi language.
-Continue refactoring: Extract ui.js, game-logic.js, event-handlers.js modules
-add a set as default button
-on piano mode after ten correct of one scale that key is taken off the list tested.
-as the changes are taken place the setting should reflect.
-I would like the music to wind down in tempo or speed then stop when not in the game, a synthy wavy freeze of a chord when adjusting settings the to wind back up when the game starts.
-bring the sound up 200%.
-i button for examination of piano.