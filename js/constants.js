// =========================
// App Version
// =========================
export const APP_VERSION = "1.1.0";
export const LAST_UPDATED = "2025-01-14T16:30:00"; // ISO format: YYYY-MM-DDTHH:mm:ss

// =========================
// Canonical notes (CRITICAL)
// =========================
export const NOTE_LIST = ["C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
export const NOTE_TO_PC = new Map(NOTE_LIST.map((n, i) => [n, i]));
export const pcToNote = (pc) => NOTE_LIST[((pc % 12) + 12) % 12];

// Major scale semitone offsets for degrees 1..7
export const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

// Scale definitions (semitone intervals from root)
export const SCALE_TYPES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11]
};

export const SCALE_TYPE_NAMES = {
  major: "Major",
  minor: "Minor",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  locrian: "Locrian",
  harmonicMinor: "Harmonic Minor",
  melodicMinor: "Melodic Minor"
};

// Degree modes
export const DIATONIC_DEGREES = ["1","2","3","4","5","6","7"];
export const CHROMATIC_DEGREES = ["1","b2","2","#2","b3","3","4","#4","b5","5","#5","b6","6","b7","7"];

// Chromatic mapping in semitones from root (canonical spelling only)
export const CHROMATIC_TO_OFFSET = {
  "1": 0,
  "b2": 1,
  "2": 2,
  "#2": 3,
  "b3": 3,
  "3": 4,
  "4": 5,
  "#4": 6,
  "b5": 6,
  "5": 7,
  "#5": 8,
  "b6": 8,
  "6": 9,
  "b7": 10,
  "7": 11
};

// Keys available (same canonical spelling list)
export const ALL_KEYS = [...NOTE_LIST];
