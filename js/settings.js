import { ALL_KEYS, DIATONIC_DEGREES, CHROMATIC_DEGREES, SCALE_TYPES, CHORD_TYPES } from './constants.js';

// =========================
// Settings (localStorage)
// =========================
export const STORAGE_KEY = "keydrill_settings_v1"; // Temporary session settings
export const DEFAULTS_KEY = "keydrill_defaults_v1"; // Persistent user defaults

export const defaultSettings = {
  instrument: "piano", // "piano" | "guitar" | "bass"
  answerInputMode: "both", // "choices" | "instrument" | "both"
  keysEnabled: ["C"],
  degreesEnabled: [...DIATONIC_DEGREES], // Default to all diatonic degrees
  secondsPerQuestion: 8,
  degreeMode: "diatonic", // "diatonic" | "chromatic"
  gameMode: "practice", // "practice" | "progression"
  questionMode: "degreeToNote", // "degreeToNote" | "noteToDegree" | "scaleRecognition" | "finishScale"
  chordTypesEnabled: ["majorTriad", "minorTriad"],
  progressionDifficulty: "moderate", // "easy" | "moderate" | "hard"
  audioOn: true,
  tickOn: true,
  ambientOn: true,
  modalDuration: 2000, // milliseconds
  guitarNeckThicknessPercent: 34,
  bassNeckThicknessPercent: 34,
  questionBoxHeightPercent: 33,
  answerButtonHeightPercent: 33,
  notePositionSizePercent: 100,
  scaleTypesEnabled: ["major"], // Enabled scale types
  // Audio mixer volumes (0-100)
  volumes: {
    pad: 100,
    arpeggio: 100,
    tick: 100,
    correct: 100,
    wrong: 100,
    button: 100,
    bonus: 100,
    gameOver: 100
  }
};

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function loadSettings() {
  try {
    // First check for user-set defaults
    const defaultsRaw = localStorage.getItem(DEFAULTS_KEY);
    const baseSettings = defaultsRaw ? JSON.parse(defaultsRaw) : defaultSettings;
    
    // Then check for temporary session settings
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(baseSettings);
    const parsed = JSON.parse(raw);

    const s = structuredClone(baseSettings);
    if (!Array.isArray(s.chordTypesEnabled)) s.chordTypesEnabled = [...defaultSettings.chordTypesEnabled];
    if (typeof s.guitarNeckThicknessPercent !== "number") s.guitarNeckThicknessPercent = 100;
    if (typeof s.bassNeckThicknessPercent !== "number") s.bassNeckThicknessPercent = 100;
    if (typeof s.questionBoxHeightPercent !== "number") s.questionBoxHeightPercent = 100;
    if (typeof s.answerButtonHeightPercent !== "number") s.answerButtonHeightPercent = 100;
    if (typeof s.notePositionSizePercent !== "number") s.notePositionSizePercent = 100;

    if (Array.isArray(parsed.keysEnabled)) {
      s.keysEnabled = parsed.keysEnabled.filter(k => ALL_KEYS.includes(k));
    }
    if (Array.isArray(parsed.degreesEnabled)) {
      s.degreesEnabled = parsed.degreesEnabled.filter(d => 
        DIATONIC_DEGREES.includes(d) || CHROMATIC_DEGREES.includes(d)
      );
    }
    if (typeof parsed.secondsPerQuestion === "number") {
      s.secondsPerQuestion = clamp(Math.round(parsed.secondsPerQuestion), 3, 21);
    }
    if (parsed.degreeMode === "diatonic" || parsed.degreeMode === "chromatic") {
      s.degreeMode = parsed.degreeMode;
    }
    if (parsed.instrument === "piano" || parsed.instrument === "guitar" || parsed.instrument === "bass") {
      s.instrument = parsed.instrument;
    }
    if (parsed.answerInputMode === "choices" || parsed.answerInputMode === "instrument" || parsed.answerInputMode === "both") {
      s.answerInputMode = parsed.answerInputMode;
    }
    if (parsed.questionMode === "degreeToNote" || parsed.questionMode === "noteToDegree" || parsed.questionMode === "scaleRecognition" || parsed.questionMode === "finishScale" || parsed.questionMode === "chordBuilder") {
      s.questionMode = parsed.questionMode;
    }
    if (parsed.gameMode === "practice" || parsed.gameMode === "progression") {
      s.gameMode = parsed.gameMode;
    }
    if (parsed.progressionDifficulty === "easy" || parsed.progressionDifficulty === "moderate" || parsed.progressionDifficulty === "hard") {
      s.progressionDifficulty = parsed.progressionDifficulty;
    }
    if (typeof parsed.audioOn === "boolean") s.audioOn = parsed.audioOn;
    if (typeof parsed.tickOn === "boolean") s.tickOn = parsed.tickOn;
    if (typeof parsed.ambientOn === "boolean") s.ambientOn = parsed.ambientOn;
    if (Array.isArray(parsed.scaleTypesEnabled)) {
      s.scaleTypesEnabled = parsed.scaleTypesEnabled.filter(st => SCALE_TYPES[st]);
    }
    if (Array.isArray(parsed.chordTypesEnabled)) {
      s.chordTypesEnabled = parsed.chordTypesEnabled.filter(ct => CHORD_TYPES[ct]);
    }
    if (typeof parsed.modalDuration === "number") {
      s.modalDuration = clamp(Math.round(parsed.modalDuration), 500, 5000);
    }
    if (typeof parsed.guitarNeckThicknessPercent === "number") {
      s.guitarNeckThicknessPercent = clamp(Math.round(parsed.guitarNeckThicknessPercent), 5, 90);
    } else if (typeof parsed.guitarNeckThickness === "number") {
      s.guitarNeckThicknessPercent = clamp(Math.round(parsed.guitarNeckThickness), 5, 90);
    }
    if (typeof parsed.bassNeckThicknessPercent === "number") {
      s.bassNeckThicknessPercent = clamp(Math.round(parsed.bassNeckThicknessPercent), 5, 90);
    }
    if (typeof parsed.questionBoxHeightPercent === "number") {
      s.questionBoxHeightPercent = clamp(Math.round(parsed.questionBoxHeightPercent), 5, 90);
    } else if (typeof parsed.questionBoxHeight === "number") {
      s.questionBoxHeightPercent = clamp(Math.round((parsed.questionBoxHeight / 220) * 100), 5, 90);
    }
    if (typeof parsed.answerButtonHeightPercent === "number") {
      s.answerButtonHeightPercent = clamp(Math.round(parsed.answerButtonHeightPercent), 5, 90);
    } else if (typeof parsed.answerButtonHeight === "number") {
      s.answerButtonHeightPercent = clamp(Math.round((parsed.answerButtonHeight / 75) * 100), 5, 90);
    }
    if (typeof parsed.notePositionSizePercent === "number") {
      s.notePositionSizePercent = clamp(Math.round(parsed.notePositionSizePercent), 50, 200);
    }
    
    // Load volumes
    if (parsed.volumes && typeof parsed.volumes === "object") {
      Object.keys(s.volumes).forEach(key => {
        if (typeof parsed.volumes[key] === "number") {
          s.volumes[key] = clamp(parsed.volumes[key], 0, 100);
        }
      });
    }

    // Cannot allow zero keys (fallback to all)
    if (!s.keysEnabled.length) s.keysEnabled = [...ALL_KEYS];
    if (!s.degreesEnabled.length) s.degreesEnabled = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];
    if (!Array.isArray(s.chordTypesEnabled) || !s.chordTypesEnabled.length) s.chordTypesEnabled = ["majorTriad"];

    return s;
  } catch {
    return structuredClone(defaultSettings);
  }
}

export function saveSettings(settings) {
  // Cannot allow zero keys (fallback to all)
  if (!settings.keysEnabled.length) settings.keysEnabled = [...ALL_KEYS];
  if (!settings.degreesEnabled.length) settings.degreesEnabled = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];
  if (!Array.isArray(settings.chordTypesEnabled) || !settings.chordTypesEnabled.length) {
    settings.chordTypesEnabled = ["majorTriad"];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getVolumeMultiplier(settings, category) {
  return (settings.volumes[category] || 100) / 100;
}
