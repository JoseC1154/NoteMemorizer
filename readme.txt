 https://josec1154.github.io/NoteMemorizer/

✅ COMPLETED:
-Piano visualization mode with keyboard display
-Scale type selector in settings (Major, Minor, Dorian, Phrygian, Lydian, Mixolydian, Locrian, Harmonic Minor, Melodic Minor)
-Piano keys show which notes are in the selected scale (shaded for notes not in scale)
-Two octaves displayed
-Piano positioned under question box with same width
-Add a set as default button (two-tier settings: Save vs Set as Default)
-Code refactoring: Extracted 8 ES6 modules (constants, dom, settings, stats, audio, piano, ui, game-logic)
  • Reduced main file by 68.2% (2,952 → 939 lines)
  • Improved maintainability and code organization
  • Fixed null keyRoot bug in progression mode
  • Fully testable with dependency injection pattern

TODO:
-then when closed should restart or install play pause button 
-awards after broken record.
-create timed chord builder.
-As the streaks build the seconds get shorter but if the user continue to answer incorrectly additional seconds should be added. (or not)
-quiz to test if user is ready for chord mode.
-multi language.
-Continue refactoring: Extract ui.js, game-logic.js, event-handlers.js modules

