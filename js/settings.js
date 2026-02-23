import { ALL_KEYS, DIATONIC_DEGREES, CHROMATIC_DEGREES, SCALE_TYPES } from './constants.js';

// =========================
// Settings (localStorage)
// =========================
export const STORAGE_KEY = "keydrill_settings_v1"; // Temporary session settings
export const DEFAULTS_KEY = "keydrill_defaults_v1"; // Persistent user defaults

export const defaultSettings = {
  instrument: "piano", // "piano" | "guitar"
  answerInputMode: "both", // "choices" | "instrument" | "both"
  keysEnabled: ["C"],
  degreesEnabled: [...DIATONIC_DEGREES], // Default to all diatonic degrees
  secondsPerQuestion: 8,
  degreeMode: "diatonic", // "diatonic" | "chromatic"
  gameMode: "practice", // "practice" | "progression"
  questionMode: "degreeToNote", // "degreeToNote" | "noteToDegree" | "scaleRecognition"
  progressionDifficulty: "moderate", // "easy" | "moderate" | "hard"
  audioOn: true,
  tickOn: true,
  ambientOn: true,
  modalDuration: 2000, // milliseconds
  scaleTypesEnabled: ["major", "minor", "dorian", "mixolydian"], // Enabled scale types
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

    if (Array.isArray(parsed.keysEnabled)) {
      s.keysEnabled = parsed.keysEnabled.filter(k => ALL_KEYS.includes(k));
    }
    if (Array.isArray(parsed.degreesEnabled)) {
      s.degreesEnabled = parsed.degreesEnabled.filter(d => 
        DIATONIC_DEGREES.includes(d) || CHROMATIC_DEGREES.includes(d)
      );
    }
    if (typeof parsed.secondsPerQuestion === "number") {
      s.secondsPerQuestion = clamp(Math.round(parsed.secondsPerQuestion), 3, 20);
    }
    if (parsed.degreeMode === "diatonic" || parsed.degreeMode === "chromatic") {
      s.degreeMode = parsed.degreeMode;
    }
    if (parsed.instrument === "piano" || parsed.instrument === "guitar") {
      s.instrument = parsed.instrument;
    }
    if (parsed.answerInputMode === "choices" || parsed.answerInputMode === "instrument" || parsed.answerInputMode === "both") {
      s.answerInputMode = parsed.answerInputMode;
    }
    if (parsed.questionMode === "degreeToNote" || parsed.questionMode === "noteToDegree" || parsed.questionMode === "scaleRecognition") {
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
    if (typeof parsed.modalDuration === "number") {
      s.modalDuration = clamp(Math.round(parsed.modalDuration), 500, 5000);
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

    return s;
  } catch {
    return structuredClone(defaultSettings);
  }
}

export function saveSettings(settings) {
  // Cannot allow zero keys (fallback to all)
  if (!settings.keysEnabled.length) settings.keysEnabled = [...ALL_KEYS];
  if (!settings.degreesEnabled.length) settings.degreesEnabled = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getVolumeMultiplier(settings, category) {
  return (settings.volumes[category] || 100) / 100;
}
