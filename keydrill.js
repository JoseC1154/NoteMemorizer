(() => {
  "use strict";

  // =========================
  // App Version
  // =========================
  const APP_VERSION = "1.1.0";
  const LAST_UPDATED = "2025-01-14T16:30:00"; // ISO format: YYYY-MM-DDTHH:mm:ss

  // =========================
  // Canonical notes (CRITICAL)
  // =========================
  const NOTE_LIST = ["C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
  const NOTE_TO_PC = new Map(NOTE_LIST.map((n, i) => [n, i]));
  const pcToNote = (pc) => NOTE_LIST[((pc % 12) + 12) % 12];

  // Major scale semitone offsets for degrees 1..7
  const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

  // Degree modes
  const DIATONIC_DEGREES = ["1","2","3","4","5","6","7"];
  const CHROMATIC_DEGREES = ["1","b2","2","#2","b3","3","4","#4","b5","5","#5","b6","6","b7","7"];

  // Chromatic mapping in semitones from root (canonical spelling only)
  const CHROMATIC_TO_OFFSET = {
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
  const ALL_KEYS = [...NOTE_LIST];

  // =========================
  // DOM
  // =========================
  const elQuestionText = document.getElementById("questionText");
  const elQuestionBox = document.getElementById("questionBox");
  const elRestartHint = document.getElementById("restartHint");
  const elTimer = document.getElementById("timer");
  const elTimerBackground = document.getElementById("timerBackground");
  const elLives = document.getElementById("lives");
  const elScore = document.getElementById("score");
  const elLevelInfo = document.getElementById("levelInfo");
  const elHeader = document.querySelector(".header");
  const elStatusPanel = document.getElementById("statusPanel");
  const elStatusText = document.getElementById("statusText");
  const elAnswerGrid = document.getElementById("answerGrid");
  const answerButtons = Array.from(elAnswerGrid.querySelectorAll(".answerBtn"));

  const menuToggle = document.getElementById("menuToggle");
  const menuDropdown = document.getElementById("menuDropdown");
  const btnSettings = document.getElementById("btnSettings");
  const btnStats = document.getElementById("btnStats");
  const menuBackdrop = document.querySelector(".menuBackdrop");

  const overlay = document.getElementById("settingsOverlay");
  const modal = document.getElementById("settingsModal");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");

  const statsOverlay = document.getElementById("statsOverlay");
  const statsModal = document.getElementById("statsModal");
  const btnCloseStats = document.getElementById("btnCloseStats");
  const btnClearStats = document.getElementById("btnClearStats");

  const confirmOverlay = document.getElementById("confirmOverlay");
  const confirmModal = document.getElementById("confirmModal");
  const confirmMessage = document.getElementById("confirmMessage");
  const btnConfirmRestart = document.getElementById("btnConfirmRestart");
  const btnCancelRestart = document.getElementById("btnCancelRestart");

  const keyToggles = document.getElementById("keyToggles");
  const degreeToggles = document.getElementById("degreeToggles");
  const secondsSlider = document.getElementById("secondsSlider");
  const secondsValue = document.getElementById("secondsValue");
  const modalDurationSlider = document.getElementById("modalDurationSlider");
  const modalDurationValue = document.getElementById("modalDurationValue");

  const modePractice = document.getElementById("modePractice");
  const modeProgression = document.getElementById("modeProgression");
  const difficultyEasy = document.getElementById("difficultyEasy");
  const difficultyModerate = document.getElementById("difficultyModerate");
  const difficultyHard = document.getElementById("difficultyHard");
  const progressionDifficultySection = document.getElementById("progressionDifficultySection");
  const keysToMasterSection = document.getElementById("keysToMasterSection");
  const degreeModeSection = document.getElementById("degreeModeSection");
  const modeDiatonic = document.getElementById("modeDiatonic");
  const modeChromatic = document.getElementById("modeChromatic");

  const toggleSound = document.getElementById("toggleSound");
  const toggleTick = document.getElementById("toggleTick");
  const toggleAmbient = document.getElementById("toggleAmbient");

  // =========================
  // Settings (localStorage)
  // =========================
  const STORAGE_KEY = "keydrill_settings_v1";

  const defaultSettings = {
    keysEnabled: ["C"],
    degreesEnabled: [...DIATONIC_DEGREES], // Default to all diatonic degrees
    secondsPerQuestion: 8,
    degreeMode: "diatonic", // "diatonic" | "chromatic"
    gameMode: "practice", // "practice" | "progression"
    progressionDifficulty: "moderate", // "easy" | "moderate" | "hard"
    audioOn: true,
    tickOn: false,
    ambientOn: false,
    modalDuration: 2000 // milliseconds
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultSettings);
      const parsed = JSON.parse(raw);

      const s = structuredClone(defaultSettings);

      if (Array.isArray(parsed.keysEnabled)) {
        s.keysEnabled = parsed.keysEnabled.filter(k => NOTE_TO_PC.has(k));
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
      if (parsed.gameMode === "practice" || parsed.gameMode === "progression") {
        s.gameMode = parsed.gameMode;
      }
      if (parsed.progressionDifficulty === "easy" || parsed.progressionDifficulty === "moderate" || parsed.progressionDifficulty === "hard") {
        s.progressionDifficulty = parsed.progressionDifficulty;
      }
      if (typeof parsed.audioOn === "boolean") s.audioOn = parsed.audioOn;
      if (typeof parsed.tickOn === "boolean") s.tickOn = parsed.tickOn;
      if (typeof parsed.modalDuration === "number") {
        s.modalDuration = clamp(Math.round(parsed.modalDuration), 500, 5000);
      }

      // Cannot allow zero keys (fallback to all)
      if (!s.keysEnabled.length) s.keysEnabled = [...ALL_KEYS];
      if (!s.degreesEnabled.length) s.degreesEnabled = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];

      return s;
    } catch {
      return structuredClone(defaultSettings);
    }
  }

  function saveSettings() {
    // Cannot allow zero keys (fallback to all)
    if (!settings.keysEnabled.length) settings.keysEnabled = [...ALL_KEYS];
    if (!settings.degreesEnabled.length) settings.degreesEnabled = [...DIATONIC_DEGREES, ...CHROMATIC_DEGREES];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  let settings = loadSettings();

  // =========================
  // Statistics tracking
  // =========================
  
  function getStats() {
    const stored = localStorage.getItem("keydrillStats");
    if (!stored) return { questions: [], highScore: 0 };
    try {
      const parsed = JSON.parse(stored);
      return {
        questions: parsed.questions || [],
        highScore: parsed.highScore || 0
      };
    } catch {
      return { questions: [], highScore: 0 };
    }
  }
  
  function saveStats(stats) {
    localStorage.setItem("keydrillStats", JSON.stringify(stats));
  }
  
  function recordQuestion(keyRoot, degreeLabel, degreeMode, correct, responseTime) {
    const stats = getStats();
    stats.questions.push({
      keyRoot,
      degreeLabel,
      degreeMode,
      correct,
      responseTime,
      timestamp: Date.now()
    });
    saveStats(stats);
  }
  
  function clearStats() {
    localStorage.removeItem("keydrillStats");
    if (typeof renderStats === 'function') {
      renderStats();
    }
  }

  // =========================
  // Audio (Web Audio API)
  // =========================
  let audioCtx = null;
  let ambientGain = null;
  let ambientOscillators = [];
  let ambientInterval = null;

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function beep({ freq = 440, duration = 0.12, type = "sine", gain = 0.08 }) {
    if (!settings.audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function soundCorrect() {
    beep({ freq: 660, duration: 0.10, type: "sine", gain: 0.07 });
    setTimeout(() => beep({ freq: 990, duration: 0.08, type: "triangle", gain: 0.06 }), 70);
  }

  function soundWrong() {
    beep({ freq: 170, duration: 0.16, type: "sawtooth", gain: 0.06 });
  }

  function soundTick() {
    if (!settings.tickOn) return;
    beep({ freq: 1200, duration: 0.03, type: "square", gain: 0.03 });
  }

  // Create reverb using convolver with impulse response
  function createReverb() {
    ensureAudio();
    const convolver = audioCtx.createConvolver();
    
    // Create impulse response for reverb (simulating large space like Grand Canyon)
    const length = audioCtx.sampleRate * 3; // 3 second reverb tail
    const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      // Exponential decay for natural reverb
      const decay = Math.pow(1 - i / length, 3);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    
    convolver.buffer = impulse;
    return convolver;
  }

  function soundButtonClick() {
    if (!settings.audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;

    // Create reverb for button sounds
    const reverb = createReverb();
    const dryGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    const masterGain = audioCtx.createGain();
    
    dryGain.gain.setValueAtTime(0.6, t0); // 60% dry
    wetGain.gain.setValueAtTime(0.4, t0); // 40% wet
    masterGain.gain.setValueAtTime(1.0, t0);
    
    reverb.connect(wetGain);
    wetGain.connect(masterGain);
    dryGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Softer, melodic click (like degree toggle)
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t0);
    osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.06);

    g.gain.setValueAtTime(0.09, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15); // Longer tail for reverb

    osc.connect(g);
    // Send to both dry and reverb
    g.connect(dryGain);
    g.connect(reverb);

    osc.start(t0);
    osc.stop(t0 + 0.2);
  }

  function soundKeyToggle() {
    if (!settings.audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;

    // Sharp, percussive click for key toggles
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "square";
    osc.frequency.setValueAtTime(1200, t0);

    filter.type = "highpass";
    filter.frequency.setValueAtTime(800, t0);

    g.gain.setValueAtTime(0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);

    osc.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.05);
  }

  function soundDegreeToggle() {
    if (!settings.audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;

    // Softer, melodic click for degree toggles
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t0);
    osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.06);

    g.gain.setValueAtTime(0.09, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.07);
  }

  function soundGameStart() {
    if (!settings.audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;

    // Create reverb and wet/dry mix
    const reverb = createReverb();
    const dryGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    const masterGain = audioCtx.createGain();
    
    dryGain.gain.setValueAtTime(0.4, t0); // 40% dry
    wetGain.gain.setValueAtTime(0.6, t0); // 60% wet (more reverb)
    masterGain.gain.setValueAtTime(1.0, t0);
    
    reverb.connect(wetGain);
    wetGain.connect(masterGain);
    dryGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Uplifting arpeggio for game start
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    notes.forEach((freq, i) => {
      const delay = i * 0.08;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0 + delay);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, t0 + delay);
      filter.Q.setValueAtTime(2, t0 + delay);

      g.gain.setValueAtTime(0, t0 + delay);
      g.gain.linearRampToValueAtTime(0.12, t0 + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.5); // Longer tail for reverb

      osc.connect(filter);
      filter.connect(g);
      // Send to both dry and reverb
      g.connect(dryGain);
      g.connect(reverb);

      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.6);
    });
  }

  function soundGameOver() {
    if (!settings.audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;

    // Atmospheric descending pad for game over (not harsh or frustrating)
    const chord = [523.25, 415.30, 349.23]; // C5, G#4, F4 - minor but not sad
    
    chord.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t0 + 1.5); // Gentle pitch drop

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1500, t0);
      filter.frequency.exponentialRampToValueAtTime(300, t0 + 1.5);
      filter.Q.setValueAtTime(1, t0);

      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.06, t0 + 0.3); // Gentle fade in
      g.gain.setValueAtTime(0.06, t0 + 1.0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.5); // Fade out

      osc.connect(filter);
      filter.connect(g);
      g.connect(audioCtx.destination);

      osc.start(t0);
      osc.stop(t0 + 1.6);
    });
  }

  // =========================
  // Ambient Background Music
  // =========================
  
  function startAmbientMusic() {
    if (!settings.ambientOn) return;
    stopAmbientMusic();
    
    ensureAudio();
    
    // Create gain node for ambient music
    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    ambientGain.connect(audioCtx.destination);
    
    // Uplifting chord progression: Cmaj9, Fmaj9, Gmaj7, Cmaj9
    const chords = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9: C E G B D
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9: F A C E G
      [196.00, 246.94, 293.66, 369.99],         // Gmaj7: G B D F#
      [261.63, 329.63, 392.00, 493.88, 587.33]  // Cmaj9: C E G B D
    ];
    
    let currentChord = 0;
    
    function playChord(frequencies) {
      // Stop previous oscillators
      ambientOscillators.forEach(osc => {
        try {
          osc.stop();
        } catch(e) {}
      });
      ambientOscillators = [];
      
      const now = audioCtx.currentTime;
      const fadeDuration = 4.0;
      const chordDuration = 16.0;
      
      // Warm analog-style pad with slight detuning
      frequencies.forEach((freq, i) => {
        // Create two slightly detuned oscillators per note for warmth
        for (let j = 0; j < 2; j++) {
          const osc = audioCtx.createOscillator();
          const oscGain = audioCtx.createGain();
          
          osc.type = 'triangle'; // Warmer, more analog sound
          const detune = j === 0 ? -2 : 2; // Slight detuning for analog warmth
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.setValueAtTime(detune, now);
          
          // Smooth fade in and out, quieter per oscillator since we have 2x
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.04, now + fadeDuration);
          oscGain.gain.setValueAtTime(0.04, now + chordDuration - fadeDuration);
          oscGain.gain.linearRampToValueAtTime(0, now + chordDuration);
          
          osc.connect(oscGain);
          oscGain.connect(ambientGain);
          
          osc.start(now);
          osc.stop(now + chordDuration);
          
          ambientOscillators.push(osc);
        }
      });
      
      // Add soft percussive element (hi-hat style)
      const noise = audioCtx.createBufferSource();
      const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      noise.buffer = noiseBuffer;
      
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(8000, now);
      
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.02, now); // Very soft
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ambientGain);
      
      noise.start(now);
      noise.stop(now + 0.1);
      
      // Create reverb for arpeggio
      const reverb = createReverb();
      const arpDryGain = audioCtx.createGain();
      const arpWetGain = audioCtx.createGain();
      const arpMasterGain = audioCtx.createGain();
      
      arpDryGain.gain.setValueAtTime(0.3, now); // 30% dry
      arpWetGain.gain.setValueAtTime(0.7, now); // 70% wet (lots of reverb)
      arpMasterGain.gain.setValueAtTime(1.0, now);
      
      reverb.connect(arpWetGain);
      arpWetGain.connect(arpMasterGain);
      arpDryGain.connect(arpMasterGain);
      arpMasterGain.connect(ambientGain);
      
      // Add Stranger Things style arpeggio
      const arpNoteLength = 0.25; // 250ms per note
      const arpPattern = [0, 2, 1, 3, 2, 4, 3, 2]; // Up and down pattern through chord
      
      arpPattern.forEach((noteIndex, i) => {
        if (noteIndex >= frequencies.length) return;
        
        const arpTime = now + (i * arpNoteLength);
        const arpOsc = audioCtx.createOscillator();
        const arpGain = audioCtx.createGain();
        const arpFilter = audioCtx.createBiquadFilter();
        
        // Classic 80s synth sound
        arpOsc.type = 'sawtooth';
        arpOsc.frequency.setValueAtTime(frequencies[noteIndex] * 2, arpTime); // One octave up
        
        // Low-pass filter for that analog warmth
        arpFilter.type = 'lowpass';
        arpFilter.frequency.setValueAtTime(1200, arpTime);
        arpFilter.Q.setValueAtTime(3, arpTime);
        
        // Quick attack, short decay for plucky sound
        arpGain.gain.setValueAtTime(0, arpTime);
        arpGain.gain.linearRampToValueAtTime(0.15, arpTime + 0.01);
        arpGain.gain.exponentialRampToValueAtTime(0.001, arpTime + arpNoteLength);
        
        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        // Send to both dry and reverb
        arpGain.connect(arpDryGain);
        arpGain.connect(reverb);
        
        arpOsc.start(arpTime);
        arpOsc.stop(arpTime + arpNoteLength);
        
        ambientOscillators.push(arpOsc);
      });
      
      // Repeat arpeggio pattern throughout the chord duration
      const arpLoopTime = arpPattern.length * arpNoteLength;
      const numLoops = Math.floor(chordDuration / arpLoopTime) - 1;
      
      for (let loop = 1; loop < numLoops; loop++) {
        const loopStartTime = now + (loop * arpLoopTime);
        
        arpPattern.forEach((noteIndex, i) => {
          if (noteIndex >= frequencies.length) return;
          
          const arpTime = loopStartTime + (i * arpNoteLength);
          const arpOsc = audioCtx.createOscillator();
          const arpGain = audioCtx.createGain();
          const arpFilter = audioCtx.createBiquadFilter();
          
          arpOsc.type = 'sawtooth';
          arpOsc.frequency.setValueAtTime(frequencies[noteIndex] * 2, arpTime);
          
          arpFilter.type = 'lowpass';
          arpFilter.frequency.setValueAtTime(1200, arpTime);
          arpFilter.Q.setValueAtTime(3, arpTime);
          
          arpGain.gain.setValueAtTime(0, arpTime);
          arpGain.gain.linearRampToValueAtTime(0.15, arpTime + 0.01);
          arpGain.gain.exponentialRampToValueAtTime(0.001, arpTime + arpNoteLength);
          
          arpOsc.connect(arpFilter);
          arpFilter.connect(arpGain);
          // Send to both dry and reverb
          arpGain.connect(arpDryGain);
          arpGain.connect(reverb);
          
          arpOsc.start(arpTime);
          arpOsc.stop(arpTime + arpNoteLength);
          
          ambientOscillators.push(arpOsc);
        });
      }
    }
    
    // Start with first chord
    playChord(chords[currentChord]);
    
    // Progress through chords
    ambientInterval = setInterval(() => {
      if (!settings.ambientOn) {
        stopAmbientMusic();
        return;
      }
      currentChord = (currentChord + 1) % chords.length;
      playChord(chords[currentChord]);
    }, 16000);
  }
  
  function stopAmbientMusic() {
    if (ambientInterval) {
      clearInterval(ambientInterval);
      ambientInterval = null;
    }
    
    ambientOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch(e) {}
    });
    ambientOscillators = [];
    
    if (ambientGain) {
      ambientGain.disconnect();
      ambientGain = null;
    }
  }

  // =========================
  // Game state
  // =========================
  const state = {
    active: false,
    questionIndex: 0,

    // Endless mode: lives + streak
    lives: 0,
    maxLives: 0,
    streak: 0,
    speedLevel: 0, // every 20 streak lowers time by 1s (persists for the run)
    score: 0,
    questionStartTime: null, // timestamp when question starts

    timerId: null,
    secondsLeft: 0,
    questionSeconds: 0,
    locked: false,
    paused: false,
    current: null, // { keyRoot, degreeLabel, correctNote, options[] }

    // Progression mode state
    progression: {
      level: 1,
      currentKey: null,
      currentMode: "diatonic", // "diatonic" | "chromatic"
      remainingKeys: [],
      levelStreak: 0 // streak for current level (needs 30 to advance)
    }
  };

  // =========================
  // Music logic
  // =========================
  function degreeToNote(keyRoot, degreeLabel, degreeMode) {
    const rootPc = NOTE_TO_PC.get(keyRoot);
    if (rootPc == null) throw new Error("Unknown key root");

    if (degreeMode === "diatonic") {
      const idx = DIATONIC_DEGREES.indexOf(degreeLabel);
      if (idx < 0) throw new Error("Unknown diatonic degree");
      return pcToNote(rootPc + MAJOR_SCALE_OFFSETS[idx]);
    }

    const off = CHROMATIC_TO_OFFSET[degreeLabel];
    if (typeof off !== "number") throw new Error("Unknown chromatic degree");
    return pcToNote(rootPc + off);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildOptions(correct) {
    const pool = NOTE_LIST.filter(n => n !== correct);
    shuffle(pool);
    return shuffle([correct, ...pool.slice(0, 5)]);
  }

  function buildOptionsForMode(correct, degreeMode, keyRoot) {
    if (degreeMode === "diatonic") {
      // For diatonic: use 6 notes from the scale, ensuring correct note is included
      const rootPc = NOTE_TO_PC.get(keyRoot);
      const scaleNotes = MAJOR_SCALE_OFFSETS.map(offset => pcToNote(rootPc + offset));
      
      // Remove correct from scale notes, shuffle remaining, take 5, then add correct back
      const otherNotes = scaleNotes.filter(n => n !== correct);
      shuffle(otherNotes);
      return shuffle([correct, ...otherNotes.slice(0, 5)]);
    } else {
      // For chromatic: pick 6 random notes from all 12, ensuring correct is included
      const pool = NOTE_LIST.filter(n => n !== correct);
      shuffle(pool);
      return shuffle([correct, ...pool.slice(0, 5)]);
    }
  }

  function renderQuestion() {
    const q = state.current;
    if (!q) {
      elQuestionText.textContent = "Click to start!";
      if (elTimerBackground) elTimerBackground.textContent = "--";
      return;
    }
    elQuestionText.textContent = `What is the ${q.degreeLabel} in the key of ${q.keyRoot} major?`;
  }

  function renderAnswers() {
    const q = state.current;
    const opts = q?.options ?? [];

    answerButtons.forEach((b, i) => {
      b.textContent = opts[i] ?? "—";
      b.dataset.note = opts[i] ?? "";
      b.disabled = !state.active || state.locked || !q;
    });
  }

  function lockAnswers(lock) {
    state.locked = lock;
    answerButtons.forEach(b => {
      b.disabled = lock || !state.active;
    });
  }

  function setStatusNeutral(text) {
    elStatusPanel.classList.remove("good", "bad");
    elStatusText.textContent = text;
  }
  function renderLives() {
    if (!elLives) return;
    elLives.textContent = `${state.lives} ♥`;
  }

  function renderScore() {
    if (!elScore) return;
    elScore.textContent = state.score.toLocaleString();
  }

  function renderLevelInfo() {
    if (!elLevelInfo) return;
    if (settings.gameMode === "progression" && state.active) {
      const modeText = state.progression.currentMode === "diatonic" ? "Diatonic" : "Chromatic";
      elLevelInfo.textContent = `Level ${state.progression.level}: ${state.progression.currentKey} ${modeText}`;
      elLevelInfo.hidden = false;
    } else {
      elLevelInfo.hidden = true;
    }
  }
  function flashStatus(isGood, text) {
    const elStatusOverlay = document.getElementById("statusOverlay");
    const elStatusSuggestions = document.getElementById("statusSuggestions");
    
    elStatusPanel.classList.remove("good", "bad");
    void elStatusPanel.offsetWidth;
    elStatusPanel.classList.add(isGood ? "good" : "bad");
    elStatusText.textContent = text;
    
    // Hide suggestions by default
    if (elStatusSuggestions) {
      elStatusSuggestions.hidden = true;
      elStatusSuggestions.innerHTML = "";
    }
    
    // Show modal
    elStatusPanel.hidden = false;
    elStatusOverlay.hidden = false;

    setTimeout(() => {
      elStatusPanel.classList.remove("good", "bad");
      // Hide modal
      elStatusPanel.hidden = true;
      elStatusOverlay.hidden = true;
    }, settings.modalDuration);
  }

  function flashStatusWithSuggestions(text, suggestionsHtml) {
    const elStatusOverlay = document.getElementById("statusOverlay");
    const elStatusSuggestions = document.getElementById("statusSuggestions");
    
    elStatusPanel.classList.remove("good", "bad");
    void elStatusPanel.offsetWidth;
    elStatusPanel.classList.add("bad");
    elStatusText.textContent = text;
    
    // Show suggestions
    if (elStatusSuggestions && suggestionsHtml) {
      elStatusSuggestions.innerHTML = suggestionsHtml;
      elStatusSuggestions.hidden = false;
    }
    
    // Show modal - don't auto-hide for game over
    elStatusPanel.hidden = false;
    elStatusOverlay.hidden = false;
  }

  // =========================
  // Timer
  // =========================
  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function getEffectiveSecondsPerQuestion() {
    // After 20 correct streak, drop by 1 second (persists). Every additional 20 streak drops another second.
    return clamp(settings.secondsPerQuestion - state.speedLevel, 3, 20);
  }

  function updateRiskVisual() {
    // Risk based on (a) low lives and (b) low remaining time.
    const livesDen = Math.max(1, state.maxLives);
    const timeDen = Math.max(1, state.questionSeconds);

    const riskLives = clamp(1 - (state.lives / livesDen), 0, 1);
    const riskTime = clamp(1 - (state.secondsLeft / timeDen), 0, 1);

    const risk = clamp(Math.max(riskLives, riskTime), 0, 1);

    // CSS variable (if you later wire it in styles.css)
    document.documentElement.style.setProperty("--risk", String(risk));

    // Immediate background shift: blue (safe) -> red (danger)
    const hue = Math.round(210 - (210 * risk));
    document.body.style.background = `radial-gradient(1200px 900px at 50% 0%, hsl(${hue} 70% 25%) 0%, #070A12 55%, #02030a 100%)`;
  }

  function startTimer() {
    stopTimer();

    state.questionSeconds = getEffectiveSecondsPerQuestion();
    state.secondsLeft = state.questionSeconds;
    state.questionStartTime = Date.now(); // Start timing response
    if (elTimerBackground) elTimerBackground.textContent = String(state.secondsLeft);
    updateRiskVisual();
    
    // Fade out header when timer starts
    if (elHeader && state.active) {
      elHeader.classList.add("faded");
    }

    state.timerId = setInterval(() => {
      if (!state.active || state.locked) return;

      state.secondsLeft -= 1;
      if (elTimerBackground) elTimerBackground.textContent = String(state.secondsLeft);
      updateRiskVisual();

      if (state.secondsLeft > 0) soundTick();

      if (state.secondsLeft <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  // =========================
  // Game rules
  // =========================
  
  // Progression mode helpers
  function getProgressionStreakRequired() {
    switch (settings.progressionDifficulty) {
      case "easy": return 15;
      case "hard": return 45;
      default: return 30; // moderate
    }
  }

  function initProgressionMode() {
    const enabledKeys = settings.keysEnabled.length ? settings.keysEnabled : [...ALL_KEYS];
    const shuffledKeys = shuffle([...enabledKeys]);
    
    state.progression.level = 1;
    state.progression.currentKey = shuffledKeys[0];
    state.progression.currentMode = "diatonic";
    state.progression.remainingKeys = shuffledKeys.slice(1);
    state.progression.levelStreak = 0;
  }

  function advanceProgressionLevel() {
    // Show victory message
    const currentLevelDesc = `${state.progression.currentKey} ${state.progression.currentMode === "diatonic" ? "Diatonic" : "Chromatic"}`;
    flashStatus(true, `🎉 Level ${state.progression.level} Complete! ${currentLevelDesc} Mastered!`);

    state.progression.level += 1;
    state.progression.levelStreak = 0;

    // Advance: diatonic -> chromatic -> next key (diatonic)
    if (state.progression.currentMode === "diatonic") {
      // Move to chromatic for same key
      state.progression.currentMode = "chromatic";
    } else {
      // Move to next key, back to diatonic
      if (state.progression.remainingKeys.length > 0) {
        state.progression.currentKey = state.progression.remainingKeys.shift();
        state.progression.currentMode = "diatonic";
      } else {
        // All keys exhausted! Game complete
        endGame("🏆 Congratulations! All keys mastered!");
        return false;
      }
    }
    
    // Update level info display
    renderLevelInfo();
    
    return true;
  }

  function nextQuestion() {
    state.questionIndex += 1;
    
    let keyRoot, degreePool, degreeMode;

    if (settings.gameMode === "progression") {
      // Use fixed key and mode from progression state
      keyRoot = state.progression.currentKey;
      degreeMode = state.progression.currentMode;
    } else {
      // Practice mode: random
      const enabledKeys = settings.keysEnabled.length ? settings.keysEnabled : [...ALL_KEYS];
      keyRoot = pickRandom(enabledKeys);
      degreeMode = settings.degreeMode;
    }

    degreePool = degreeMode === "diatonic" ? DIATONIC_DEGREES : CHROMATIC_DEGREES;
    
    // Filter by enabled degrees
    const enabledDegrees = settings.degreesEnabled.length ? settings.degreesEnabled : degreePool;
    const availableDegrees = degreePool.filter(d => enabledDegrees.includes(d));
    const degreeLabel = pickRandom(availableDegrees.length ? availableDegrees : degreePool);
    const correctNote = degreeToNote(keyRoot, degreeLabel, degreeMode);
    const options = buildOptionsForMode(correctNote, degreeMode, keyRoot);

    state.current = { keyRoot, degreeLabel, correctNote, options };
    renderQuestion();
    renderAnswers();
    renderLevelInfo();
    startTimer();
  }

  function startGame() {
    ensureAudio();
    startAmbientMusic();

    // Close game over modal if it's showing
    const elStatusOverlay = document.getElementById("statusOverlay");
    if (elStatusPanel && elStatusOverlay) {
      elStatusPanel.hidden = true;
      elStatusOverlay.hidden = true;
      elStatusPanel.classList.remove("good", "bad");
    }
    
    // Hide suggestions in question box
    const questionSuggestions = document.getElementById("questionSuggestions");
    if (questionSuggestions) {
      questionSuggestions.hidden = true;
      questionSuggestions.innerHTML = "";
    }

    state.active = true;
    state.locked = false;

    state.questionIndex = 0;
    state.streak = 0;
    state.speedLevel = 0;
    state.score = 0;

    // Start with 3 lives (matches the original "3 tries" feeling, now used for endless mode)
    state.lives = 3;
    state.maxLives = 3;

    // Initialize progression mode if needed
    if (settings.gameMode === "progression") {
      initProgressionMode();
    }

    state.current = null;
    renderLives();
    renderScore();
    renderLevelInfo();
    
    // Update restart hint
    if (elRestartHint) {
      elRestartHint.textContent = settings.gameMode === "progression" 
        ? "Press to restart from level 1"
        : "Press to restart";
    }
    
    setStatusNeutral("Ready.");
    updateRiskVisual();
    
    nextQuestion();
  }

  function generateCompactSuggestions() {
    const stats = getStats();
    const questions = stats.questions || [];
    
    if (questions.length === 0) {
      return "<p style='margin-top: 1em; opacity: 0.8;'>Play more to get personalized suggestions!</p>";
    }
    
    // Calculate stats by key, degree, and combination
    const byKey = {};
    const byDegree = {};
    const byKeyDegree = {};
    
    questions.forEach(q => {
      // By key
      if (!byKey[q.keyRoot]) byKey[q.keyRoot] = { correct: 0, total: 0, totalTime: 0 };
      byKey[q.keyRoot].total++;
      if (q.correct) byKey[q.keyRoot].correct++;
      byKey[q.keyRoot].totalTime += q.responseTime;
      
      // By degree
      if (!byDegree[q.degreeLabel]) byDegree[q.degreeLabel] = { correct: 0, total: 0, totalTime: 0 };
      byDegree[q.degreeLabel].total++;
      if (q.correct) byDegree[q.degreeLabel].correct++;
      byDegree[q.degreeLabel].totalTime += q.responseTime;
      
      // By key-degree combo
      const combo = `${q.degreeLabel} of ${q.keyRoot}`;
      if (!byKeyDegree[combo]) byKeyDegree[combo] = { correct: 0, total: 0, totalTime: 0 };
      byKeyDegree[combo].total++;
      if (q.correct) byKeyDegree[combo].correct++;
      byKeyDegree[combo].totalTime += q.responseTime;
    });
    
    // Find weak areas (less than 70% accuracy, at least 3 attempts)
    const needsPractice = [];
    
    // Check specific key+degree combinations first (most specific)
    Object.entries(byKeyDegree).forEach(([combo, data]) => {
      const acc = (data.correct / data.total) * 100;
      const avg = data.totalTime / data.total;
      if (acc < 70 && data.total >= 3) {
        needsPractice.push({ type: "Specific", name: combo, reason: `Low accuracy (${acc.toFixed(1)}%)` });
      } else if (avg > 4 && data.total >= 3) {
        needsPractice.push({ type: "Specific", name: combo, reason: `Slow response (${avg.toFixed(2)}s avg)` });
      }
    });
    
    Object.keys(byKey).forEach(key => {
      const data = byKey[key];
      const acc = (data.correct / data.total) * 100;
      if (acc < 70 && data.total >= 5) {
        needsPractice.push({ type: "Key", name: key, reason: `Low accuracy (${acc.toFixed(1)}%)` });
      }
    });
    
    Object.keys(byDegree).forEach(degree => {
      const data = byDegree[degree];
      const acc = (data.correct / data.total) * 100;
      const avg = data.totalTime / data.total;
      if (acc < 70 && data.total >= 5) {
        needsPractice.push({ type: "Degree", name: degree, reason: `Low accuracy (${acc.toFixed(1)}%)` });
      } else if (avg > 4 && data.total >= 5) {
        needsPractice.push({ type: "Degree", name: degree, reason: `Slow response (${avg.toFixed(2)}s avg)` });
      }
    });
    
    if (needsPractice.length === 0) {
      return "<p style='margin-top: 1em; opacity: 0.8;'>Great job! Keep practicing to maintain your skills.</p>";
    }
    
    // Analyze weak areas
    const weakKeys = [];
    const weakDegrees = [];
    const weakCombos = [];
    
    needsPractice.forEach(item => {
      if (item.type === "Key") weakKeys.push(item.name);
      if (item.type === "Degree") weakDegrees.push(item.name);
      if (item.type === "Specific") {
        // Extract key and degree from combo like "6th of C"
        const match = item.name.match(/(.+) of (.+)/);
        if (match) {
          weakCombos.push({ degree: match[1], key: match[2] });
        }
      }
    });
    
    // Generate compact practice plan with buttons using stats modal styling
    let planHtml = "<div class='practiceSteps' style='margin-top: 1em; font-size: 0.9em;'>";
    
    // Step 1: Focus on specific combinations first (most targeted)
    if (weakCombos.length > 0) {
      const topCombos = weakCombos.slice(0, 3); // Top 3 worst combinations
      planHtml += "<div class='practiceStep'>";
      planHtml += "<div class='stepNumber'>1</div>";
      planHtml += "<div class='stepContent'>";
      planHtml += "<h4>Master Specific Combinations</h4>";
      planHtml += "<p>Focus on: ";
      topCombos.forEach((combo, i) => {
        planHtml += `<strong>${combo.degree} of ${combo.key}</strong>${i < topCombos.length - 1 ? ', ' : ''}`;
      });
      planHtml += "</p>";
      
      // Create suggested settings
      const suggestedKeys = [...new Set(topCombos.map(c => c.key))];
      const suggestedDegrees = [...new Set(topCombos.map(c => c.degree))];
      
      planHtml += `<button class='btn btnApply' onclick='applyPracticeSettingsAndStart(${JSON.stringify(suggestedKeys)}, ${JSON.stringify(suggestedDegrees)})'>Practice These</button>`;
      planHtml += "</div></div>";
    }
    
    // Step 2: Practice weak keys
    if (weakKeys.length > 0) {
      planHtml += "<div class='practiceStep'>";
      planHtml += "<div class='stepNumber'>2</div>";
      planHtml += "<div class='stepContent'>";
      planHtml += "<h4>Strengthen Weak Keys</h4>";
      planHtml += `<p>Practice all degrees in these keys: <strong>${weakKeys.join(", ")}</strong></p>`;
      planHtml += `<button class='btn btnApply' onclick='applyPracticeSettingsAndStart(${JSON.stringify(weakKeys)}, null)'>Practice These Keys</button>`;
      planHtml += "</div></div>";
    }
    
    // Step 3: Practice weak degrees
    if (weakDegrees.length > 0) {
      planHtml += "<div class='practiceStep'>";
      planHtml += "<div class='stepNumber'>3</div>";
      planHtml += "<div class='stepContent'>";
      planHtml += "<h4>Master Difficult Degrees</h4>";
      planHtml += `<p>Practice these degrees across all keys: <strong>${weakDegrees.join(", ")}</strong></p>`;
      planHtml += `<button class='btn btnApply' onclick='applyPracticeSettingsAndStart(null, ${JSON.stringify(weakDegrees)})'>Practice These Degrees</button>`;
      planHtml += "</div></div>";
    }
    
    planHtml += "</div>";
    
    return planHtml;
  }

  function endGame(message) {
    state.active = false;
    state.current = null;
    stopTimer();
    stopAmbientMusic();
    soundGameOver();
    lockAnswers(true);
    if (elTimerBackground) elTimerBackground.textContent = "--";
    updateRiskVisual();
    
    // Update high score if needed
    const stats = getStats();
    if (state.score > stats.highScore) {
      stats.highScore = state.score;
      saveStats(stats);
    }
    
    // Restore header visibility
    if (elHeader) {
      elHeader.classList.remove("faded");
    }
    
    // Show game over in status panel
    flashStatus(false, `${message} — Final Score: ${state.score}`);
    
    // Show suggestions in question box
    elQuestionText.textContent = "Game Over. Press New to try again.";
    const questionSuggestions = document.getElementById("questionSuggestions");
    if (questionSuggestions) {
      const suggestions = generateCompactSuggestions();
      questionSuggestions.innerHTML = suggestions;
      questionSuggestions.hidden = false;
    }
  }

  function nextAfterFeedback() {
    setTimeout(() => {
      if (!state.active) return;
      lockAnswers(false);
      nextQuestion();
    }, settings.modalDuration + 100);
  }

  function handleCorrect(chosen) {
    soundCorrect();
    
    // Calculate response time
    const responseTime = state.questionStartTime ? (Date.now() - state.questionStartTime) / 1000 : 0;
    
    // Record statistics
    if (state.current) {
      recordQuestion(
        state.current.keyRoot,
        state.current.degreeLabel,
        settings.degreeMode,
        true,
        responseTime
      );
    }

    state.streak += 1;
    
    // Calculate score: base points + streak bonus + speed bonus
    const basePoints = 100;
    const streakBonus = state.streak * 10;
    const speedBonus = Math.max(0, (state.questionSeconds - state.secondsLeft) * 5);
    const pointsEarned = basePoints + streakBonus + speedBonus;
    
    state.score += pointsEarned;
    renderScore();

    // Progression mode: increment level streak
    if (settings.gameMode === "progression") {
      state.progression.levelStreak += 1;
    }

    // After 10 correct streak the user gets an extra life (every 10)
    let awardedLife = false;
    if (state.streak > 0 && state.streak % 10 === 0) {
      state.lives += 1;
      state.maxLives = Math.max(state.maxLives, state.lives);
      awardedLife = true;
      renderLives();
    }

    // After 20 correct answers total, give extra life AND speed up
    let rewardAt20 = false;
    if (state.questionIndex > 0 && state.questionIndex % 20 === 0) {
      state.speedLevel += 1;
      state.lives += 1;
      state.maxLives = Math.max(state.maxLives, state.lives);
      rewardAt20 = true;
      renderLives();
    }

    updateRiskVisual();

    // Check for progression level advancement
    const streakRequired = getProgressionStreakRequired();
    if (settings.gameMode === "progression" && state.progression.levelStreak >= streakRequired) {
      lockAnswers(true);
      stopTimer();
      const canContinue = advanceProgressionLevel();
      if (canContinue) {
        nextAfterFeedback();
      }
      return;
    }

    if (rewardAt20) {
      flashStatus(true, `Correct: ${chosen} — 🎉 20 correct! +1 life & Speed up! (Score: ${state.score})`);
    } else if (awardedLife) {
      flashStatus(true, `Correct: ${chosen} — +1 life! (Score: ${state.score})`);
    } else {
      const streakText = settings.gameMode === "progression" 
        ? `Level ${state.progression.level} Progress: ${state.progression.levelStreak}/${getProgressionStreakRequired()}`
        : `Streak: ${state.streak}`;
      flashStatus(true, `Correct: ${chosen} (${streakText}) — Score: ${state.score}`);
    }

    lockAnswers(true);
    stopTimer();
    nextAfterFeedback();
  }

  function handleWrong(chosen) {
    soundWrong();
    
    // Calculate response time
    const responseTime = state.questionStartTime ? (Date.now() - state.questionStartTime) / 1000 : 0;
    
    // Record statistics
    if (state.current) {
      recordQuestion(
        state.current.keyRoot,
        state.current.degreeLabel,
        settings.degreeMode,
        false,
        responseTime
      );
    }

    state.streak = 0;
    if (settings.gameMode === "progression") {
      state.progression.levelStreak = 0;
    }
    state.lives -= 1;
    renderLives();
    updateRiskVisual();

    if (state.lives <= 0) {
      flashStatus(false, `Wrong: ${chosen} — Correct: ${state.current.correctNote} — Game Over`);
      endGame("No lives left.");
      return;
    }

    flashStatus(false, `Wrong: ${chosen} — Correct: ${state.current.correctNote} — Lives: ${state.lives}`);
    lockAnswers(true);
    stopTimer();
    nextAfterFeedback();
  }

  function handleTimeout() {
    soundWrong();
    
    // Record statistics (timeout counts as wrong with max time)
    if (state.current) {
      recordQuestion(
        state.current.keyRoot,
        state.current.degreeLabel,
        settings.degreeMode,
        false,
        state.questionSeconds // Full time elapsed
      );
    }

    state.streak = 0;
    if (settings.gameMode === "progression") {
      state.progression.levelStreak = 0;
    }
    state.lives -= 1;
    renderLives();
    updateRiskVisual();

    if (state.lives <= 0) {
      flashStatus(false, `Time out — Correct: ${state.current.correctNote} — Game Over`);
      endGame("Time out.");
      return;
    }

    flashStatus(false, `Time out — Correct: ${state.current.correctNote} — Lives: ${state.lives}`);
    lockAnswers(true);
    nextAfterFeedback();
  }

  function onAnswerClick(btn) {
    if (!state.active || state.locked || !state.current) return;

    const chosen = btn.dataset.note;
    const correct = state.current.correctNote;

    if (chosen === correct) handleCorrect(chosen);
    else handleWrong(chosen);
  }

  // =========================
  // Settings Modal
  // =========================
  function renderKeyToggles() {
    keyToggles.innerHTML = "";
    const enabled = new Set(settings.keysEnabled);

    for (const k of ALL_KEYS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "keyBtn";
      b.textContent = k;
      b.setAttribute("aria-pressed", enabled.has(k) ? "true" : "false");

      b.addEventListener("click", () => {
        soundDegreeToggle();
        const isOn = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", isOn ? "false" : "true");
        if (isOn) enabled.delete(k);
        else enabled.add(k);
        settings.keysEnabled = Array.from(enabled);
      });

      keyToggles.appendChild(b);
    }
  }

  // Render degree toggles
  if (degreeToggles) {
    const allDegrees = [...new Set([...DIATONIC_DEGREES, ...CHROMATIC_DEGREES])];
    const enabled = new Set(settings.degreesEnabled);
    
    for (const degree of allDegrees) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggleBtn";
      b.textContent = degree;
      b.setAttribute("aria-pressed", enabled.has(degree) ? "true" : "false");

      b.addEventListener("click", () => {
        soundDegreeToggle();
        const isOn = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", isOn ? "false" : "true");
        if (isOn) enabled.delete(degree);
        else enabled.add(degree);
        settings.degreesEnabled = Array.from(enabled);
      });

      degreeToggles.appendChild(b);
    }
  }

  function openSettings() {
    // Close stats modal if open
    statsOverlay.hidden = true;
    
    overlay.hidden = false;

    // Pause the game if it's active
    if (state.active && !state.locked) {
      state.paused = true;
      stopTimer();
      lockAnswers(true);
    }

    secondsSlider.value = String(settings.secondsPerQuestion);
    secondsValue.textContent = `${settings.secondsPerQuestion}s`;

    modalDurationSlider.value = String(settings.modalDuration);
    modalDurationValue.textContent = `${(settings.modalDuration / 1000).toFixed(1)}s`;

    modePractice.setAttribute("aria-checked", settings.gameMode === "practice" ? "true" : "false");
    modeProgression.setAttribute("aria-checked", settings.gameMode === "progression" ? "true" : "false");

    difficultyEasy.setAttribute("aria-checked", settings.progressionDifficulty === "easy" ? "true" : "false");
    difficultyModerate.setAttribute("aria-checked", settings.progressionDifficulty === "moderate" ? "true" : "false");
    difficultyHard.setAttribute("aria-checked", settings.progressionDifficulty === "hard" ? "true" : "false");
    
    // Show/hide sections based on game mode
    const isPractice = settings.gameMode === "practice";
    if (progressionDifficultySection) {
      progressionDifficultySection.style.display = isPractice ? "none" : "block";
    }
    if (keysToMasterSection) {
      keysToMasterSection.style.display = isPractice ? "block" : "none";
    }
    if (degreeModeSection) {
      degreeModeSection.style.display = isPractice ? "block" : "none";
    }

    modeDiatonic.setAttribute("aria-checked", settings.degreeMode === "diatonic" ? "true" : "false");
    modeChromatic.setAttribute("aria-checked", settings.degreeMode === "chromatic" ? "true" : "false");

    toggleSound.setAttribute("aria-pressed", settings.audioOn ? "true" : "false");
    toggleSound.textContent = `Sounds: ${settings.audioOn ? "On" : "Off"}`;

    toggleTick.setAttribute("aria-pressed", settings.tickOn ? "true" : "false");
    toggleTick.textContent = `Tick: ${settings.tickOn ? "On" : "Off"}`;

    toggleAmbient.setAttribute("aria-pressed", settings.ambientOn ? "true" : "false");
    toggleAmbient.textContent = `Music: ${settings.ambientOn ? "On" : "Off"}`;

    renderKeyToggles();
    btnCloseSettings.focus();
  }

  function closeSettings() {
    overlay.hidden = true;
    btnSettings.focus();

    // Resume the game if it was paused
    if (state.paused && state.active) {
      state.paused = false;
      lockAnswers(false);
      startTimer();
    }
  }

  function showConfirmRestart() {
    const message = settings.gameMode === "progression"
      ? "Are you sure you want to restart from level 1?"
      : "Are you sure you want to restart?";
    
    confirmMessage.textContent = message;
    
    // Pause the game (stop timer and lock answers)
    if (state.active) {
      stopTimer();
      lockAnswers(true);
    }
    
    confirmOverlay.hidden = false;
    btnCancelRestart.focus();
  }

  function hideConfirmRestart() {
    confirmOverlay.hidden = true;
    
    // Resume the game if user cancels and game is still active
    if (state.active) {
      lockAnswers(false);
      startTimer();
    }
  }

  function setMode(mode) {
    settings.degreeMode = mode;
    modeDiatonic.setAttribute("aria-checked", mode === "diatonic" ? "true" : "false");
    modeChromatic.setAttribute("aria-checked", mode === "chromatic" ? "true" : "false");
  }

  function setGameMode(mode) {
    settings.gameMode = mode;
    modePractice.setAttribute("aria-checked", mode === "practice" ? "true" : "false");
    modeProgression.setAttribute("aria-checked", mode === "progression" ? "true" : "false");
    
    // Show/hide sections based on game mode
    const isPractice = mode === "practice";
    const degreesToPracticeSection = document.getElementById("degreesToPracticeSection");
    
    if (progressionDifficultySection) {
      progressionDifficultySection.style.display = isPractice ? "none" : "block";
    }
    if (keysToMasterSection) {
      keysToMasterSection.style.display = isPractice ? "block" : "none";
    }
    if (degreesToPracticeSection) {
      degreesToPracticeSection.style.display = isPractice ? "block" : "none";
    }
    if (degreeModeSection) {
      degreeModeSection.style.display = isPractice ? "block" : "none";
    }
  }

  function setProgressionDifficulty(difficulty) {
    settings.progressionDifficulty = difficulty;
    difficultyEasy.setAttribute("aria-checked", difficulty === "easy" ? "true" : "false");
    difficultyModerate.setAttribute("aria-checked", difficulty === "moderate" ? "true" : "false");
    difficultyHard.setAttribute("aria-checked", difficulty === "hard" ? "true" : "false");
  }

  // =========================
  // Wire up events
  // =========================
  answerButtons.forEach(b => b.addEventListener("click", () => onAnswerClick(b)));

  if (elQuestionBox) {
    elQuestionBox.addEventListener("click", () => {
      // If game is active, show confirmation modal
      if (state.active) {
        soundDegreeToggle();
        showConfirmRestart();
      } else {
        // Game not active, just start
        soundGameStart();
        startGame();
      }
    });
  }

  btnSettings.addEventListener("click", () => {
    soundDegreeToggle();
    const triangleMenu = document.querySelector('.triangleMenu');
    menuDropdown.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    triangleMenu.classList.remove('active');
    openSettings();
  });

  btnStats.addEventListener("click", () => {
    soundDegreeToggle();
    const triangleMenu = document.querySelector('.triangleMenu');
    menuDropdown.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    triangleMenu.classList.remove('active');
    // Close settings modal if open
    overlay.hidden = true;
    renderStats();
    statsOverlay.hidden = false;
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSettings();
  });
  btnCloseSettings.addEventListener("click", () => {
    soundDegreeToggle();
    closeSettings();
  });

  // Confirmation modal handlers
  btnConfirmRestart.addEventListener("click", () => {
    soundDegreeToggle();
    hideConfirmRestart();
    startGame();
  });
  
  btnCancelRestart.addEventListener("click", () => {
    soundDegreeToggle();
    hideConfirmRestart();
  });
  
  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) hideConfirmRestart();
  });

  // Menu toggle
  menuToggle.addEventListener("click", (e) => {
    soundDegreeToggle();
    e.stopPropagation();
    const isHidden = menuDropdown.hidden;
    const triangleMenu = document.querySelector('.triangleMenu');
    
    // Stop timer when opening menu
    if (isHidden && state.active) {
      stopTimer();
      lockAnswers(true);
      state.paused = true;
    }
    
    menuDropdown.hidden = !isHidden;
    menuToggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
    
    if (isHidden) {
      // Opening menu
      triangleMenu.classList.add('active');
    } else {
      // Closing menu - resume if game was paused
      triangleMenu.classList.remove('active');
      if (state.paused && state.active) {
        lockAnswers(false);
        startTimer();
        state.paused = false;
      }
    }
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
      const triangleMenu = document.querySelector('.triangleMenu');
      menuDropdown.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      triangleMenu.classList.remove('active');
    }
  });

  // Close menu when clicking backdrop
  if (menuBackdrop) {
    menuBackdrop.addEventListener("click", () => {
      const triangleMenu = document.querySelector('.triangleMenu');
      menuDropdown.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      triangleMenu.classList.remove('active');
      
      // Resume game if it was paused
      if (state.paused && state.active) {
        lockAnswers(false);
        startTimer();
        state.paused = false;
      }
    });
  }

  // Allow clicking status overlay to dismiss it
  const statusOverlay = document.getElementById("statusOverlay");
  if (statusOverlay) {
    statusOverlay.addEventListener("click", () => {
      elStatusPanel.hidden = true;
      statusOverlay.hidden = true;
      elStatusPanel.classList.remove("good", "bad");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) {
      e.preventDefault();
      closeSettings();
    }
  });

  secondsSlider.addEventListener("input", () => {
    settings.secondsPerQuestion = clamp(Number(secondsSlider.value), 3, 20);
    secondsValue.textContent = `${settings.secondsPerQuestion}s`;
  });

  modalDurationSlider.addEventListener("input", () => {
    settings.modalDuration = clamp(Number(modalDurationSlider.value), 500, 5000);
    modalDurationValue.textContent = `${(settings.modalDuration / 1000).toFixed(1)}s`;
  });

  modePractice.addEventListener("click", () => {
    soundDegreeToggle();
    setGameMode("practice");
  });
  modeProgression.addEventListener("click", () => {
    soundDegreeToggle();
    setGameMode("progression");
  });

  difficultyEasy.addEventListener("click", () => {
    soundDegreeToggle();
    setProgressionDifficulty("easy");
  });
  difficultyModerate.addEventListener("click", () => {
    soundDegreeToggle();
    setProgressionDifficulty("moderate");
  });
  difficultyHard.addEventListener("click", () => {
    soundDegreeToggle();
    setProgressionDifficulty("hard");
  });

  modeDiatonic.addEventListener("click", () => {
    soundDegreeToggle();
    setMode("diatonic");
  });
  modeChromatic.addEventListener("click", () => {
    soundDegreeToggle();
    setMode("chromatic");
  });

  toggleSound.addEventListener("click", () => {
    soundDegreeToggle();
    settings.audioOn = !settings.audioOn;
    toggleSound.setAttribute("aria-pressed", settings.audioOn ? "true" : "false");
    toggleSound.textContent = `Sounds: ${settings.audioOn ? "On" : "Off"}`;
    if (settings.audioOn) ensureAudio();
  });

  toggleTick.addEventListener("click", () => {
    soundDegreeToggle();
    settings.tickOn = !settings.tickOn;
    toggleTick.setAttribute("aria-pressed", settings.tickOn ? "true" : "false");
    toggleTick.textContent = `Tick: ${settings.tickOn ? "On" : "Off"}`;
    if (settings.tickOn) ensureAudio();
  });

  toggleAmbient.addEventListener("click", () => {
    soundDegreeToggle();
    settings.ambientOn = !settings.ambientOn;
    toggleAmbient.setAttribute("aria-pressed", settings.ambientOn ? "true" : "false");
    toggleAmbient.textContent = `Music: ${settings.ambientOn ? "On" : "Off"}`;
    if (settings.ambientOn && state.active) {
      startAmbientMusic();
    } else {
      stopAmbientMusic();
    }
  });

  btnSaveSettings.addEventListener("click", () => {
    soundDegreeToggle();
    // Cannot allow zero keys (fallback to all)
    if (!settings.keysEnabled.length) settings.keysEnabled = [...ALL_KEYS];

    saveSettings();
    closeSettings();

    // Apply settings immediately (including chromatic mode)
    if (state.active) {
      stopTimer();
      state.locked = false;
      lockAnswers(false);
      nextQuestion();
    } else {
      renderAnswers();
    }

    setStatusNeutral("Settings saved.");
  });

  // Practice settings confirmation modal handlers
  const practiceSettingsOverlay = document.getElementById("practiceSettingsOverlay");
  const practiceSettingsModal = document.getElementById("practiceSettingsModal");
  const btnClosePracticeSettings = document.getElementById("btnClosePracticeSettings");
  const btnStartPractice = document.getElementById("btnStartPractice");
  
  if (practiceSettingsOverlay && practiceSettingsModal) {
    const closePracticeSettings = () => {
      practiceSettingsOverlay.hidden = true;
      practiceSettingsModal.hidden = true;
    };
    
    if (btnClosePracticeSettings) {
      btnClosePracticeSettings.addEventListener("click", closePracticeSettings);
    }
    
    if (btnStartPractice) {
      btnStartPractice.addEventListener("click", closePracticeSettings);
    }
    
    practiceSettingsOverlay.addEventListener("click", (e) => {
      if (e.target === practiceSettingsOverlay) closePracticeSettings();
    });
  }

  // Stats modal handlers
  if (btnStats && statsOverlay && statsModal) {
    btnStats.addEventListener("click", () => {
      statsOverlay.hidden = false;
      statsModal.hidden = false;
      renderStats();
    });

    btnCloseStats.addEventListener("click", () => {
      statsOverlay.hidden = true;
      statsModal.hidden = true;
    });

    statsOverlay.addEventListener("click", (e) => {
      if (e.target === statsOverlay) {
        statsOverlay.hidden = true;
        statsModal.hidden = true;
      }
    });

    btnClearStats.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all statistics? This cannot be undone.")) {
        clearStats();
      }
    });
  }

  function renderStats() {
    const stats = getStats();
    const questions = stats.questions || [];
    
    if (questions.length === 0) {
      document.getElementById("statTotalQuestions").textContent = "0";
      document.getElementById("statAccuracy").textContent = "0%";
      document.getElementById("statAvgTime").textContent = "0s";
      document.getElementById("statHighScore").textContent = stats.highScore.toLocaleString();
      document.getElementById("statsByKey").innerHTML = "<p>No data yet. Start practicing!</p>";
      document.getElementById("statsByDegree").innerHTML = "";
      document.getElementById("statsNeedsPractice").innerHTML = "";
      return;
    }
    
    // Calculate summary stats
    const totalQuestions = questions.length;
    const correctQuestions = questions.filter(q => q.correct).length;
    const accuracy = ((correctQuestions / totalQuestions) * 100).toFixed(1);
    const avgTime = (questions.reduce((sum, q) => sum + q.responseTime, 0) / totalQuestions).toFixed(2);
    
    document.getElementById("statTotalQuestions").textContent = totalQuestions;
    document.getElementById("statAccuracy").textContent = `${accuracy}%`;
    document.getElementById("statAvgTime").textContent = `${avgTime}s`;
    document.getElementById("statHighScore").textContent = stats.highScore.toLocaleString();
    
    // Stats by key
    const byKey = {};
    questions.forEach(q => {
      if (!byKey[q.keyRoot]) byKey[q.keyRoot] = { correct: 0, total: 0, totalTime: 0 };
      byKey[q.keyRoot].total++;
      if (q.correct) byKey[q.keyRoot].correct++;
      byKey[q.keyRoot].totalTime += q.responseTime;
    });
    
    let keyHtml = "<table><tr><th>Key</th><th>Accuracy</th><th>Avg Time</th></tr>";
    Object.keys(byKey).sort().forEach(key => {
      const data = byKey[key];
      const acc = ((data.correct / data.total) * 100).toFixed(1);
      const avg = (data.totalTime / data.total).toFixed(2);
      keyHtml += `<tr><td>${key}</td><td>${acc}%</td><td>${avg}s</td></tr>`;
    });
    keyHtml += "</table>";
    document.getElementById("statsByKey").innerHTML = keyHtml;
    
    // Stats by degree
    const byDegree = {};
    questions.forEach(q => {
      if (!byDegree[q.degreeLabel]) byDegree[q.degreeLabel] = { correct: 0, total: 0, totalTime: 0 };
      byDegree[q.degreeLabel].total++;
      if (q.correct) byDegree[q.degreeLabel].correct++;
      byDegree[q.degreeLabel].totalTime += q.responseTime;
    });
    
    let degreeHtml = "<table><tr><th>Degree</th><th>Accuracy</th><th>Avg Time</th></tr>";
    Object.keys(byDegree).sort().forEach(degree => {
      const data = byDegree[degree];
      const acc = ((data.correct / data.total) * 100).toFixed(1);
      const avg = (data.totalTime / data.total).toFixed(2);
      degreeHtml += `<tr><td>${degree}</td><td>${acc}%</td><td>${avg}s</td></tr>`;
    });
    degreeHtml += "</table>";
    document.getElementById("statsByDegree").innerHTML = degreeHtml;
    
    // Stats by key+degree combination
    const byKeyDegree = {};
    questions.forEach(q => {
      const combo = `${q.degreeLabel} of ${q.keyRoot}`;
      if (!byKeyDegree[combo]) byKeyDegree[combo] = { correct: 0, total: 0, totalTime: 0, key: q.keyRoot, degree: q.degreeLabel };
      byKeyDegree[combo].total++;
      if (q.correct) byKeyDegree[combo].correct++;
      byKeyDegree[combo].totalTime += q.responseTime;
    });
    
    // Sort combinations by accuracy (worst first) for easier identification
    const sortedCombos = Object.entries(byKeyDegree)
      .sort((a, b) => {
        const accA = (a[1].correct / a[1].total) * 100;
        const accB = (b[1].correct / b[1].total) * 100;
        return accA - accB; // ascending (worst first)
      });
    
    let comboHtml = "<table><tr><th>Degree + Key</th><th>Questions</th><th>Accuracy</th><th>Avg Time</th></tr>";
    sortedCombos.forEach(([combo, data]) => {
      const acc = ((data.correct / data.total) * 100).toFixed(1);
      const avg = (data.totalTime / data.total).toFixed(2);
      comboHtml += `<tr><td>${combo}</td><td>${data.total}</td><td>${acc}%</td><td>${avg}s</td></tr>`;
    });
    comboHtml += "</table>";
    document.getElementById("statsByKeyDegree").innerHTML = comboHtml;
    
    // Areas needing practice (low accuracy or slow response)
    const needsPractice = [];
    
    // Check specific key+degree combinations first (most specific)
    Object.entries(byKeyDegree).forEach(([combo, data]) => {
      const acc = (data.correct / data.total) * 100;
      const avg = data.totalTime / data.total;
      if (acc < 70 && data.total >= 3) {
        needsPractice.push({ type: "Specific", name: combo, reason: `Low accuracy (${acc.toFixed(1)}%)` });
      } else if (avg > 4 && data.total >= 3) {
        needsPractice.push({ type: "Specific", name: combo, reason: `Slow response (${avg.toFixed(2)}s avg)` });
      }
    });
    
    Object.keys(byKey).forEach(key => {
      const data = byKey[key];
      const acc = (data.correct / data.total) * 100;
      if (acc < 70 && data.total >= 5) {
        needsPractice.push({ type: "Key", name: key, reason: `Low accuracy (${acc.toFixed(1)}%)` });
      }
    });
    
    Object.keys(byDegree).forEach(degree => {
      const data = byDegree[degree];
      const acc = (data.correct / data.total) * 100;
      const avg = data.totalTime / data.total;
      if (acc < 70 && data.total >= 5) {
        needsPractice.push({ type: "Degree", name: degree, reason: `Low accuracy (${acc.toFixed(1)}%)` });
      } else if (avg > 4 && data.total >= 5) {
        needsPractice.push({ type: "Degree", name: degree, reason: `Slow response (${avg.toFixed(2)}s avg)` });
      }
    });
    
    if (needsPractice.length === 0) {
      document.getElementById("statsNeedsPractice").innerHTML = "<p>Great job! No areas need extra practice.</p>";
    } else {
      let helpHtml = "<ul>";
      needsPractice.forEach(item => {
        helpHtml += `<li><strong>${item.type}: ${item.name}</strong> - ${item.reason}</li>`;
      });
      helpHtml += "</ul>";
      document.getElementById("statsNeedsPractice").innerHTML = helpHtml;
    }
    
    // Generate practice plan
    generatePracticePlan(byKey, byDegree, byKeyDegree, needsPractice);
  }
  
  function generatePracticePlan(byKey, byDegree, byKeyDegree, needsPractice) {
    const planContainer = document.getElementById("statsPracticePlan");
    
    if (needsPractice.length === 0) {
      planContainer.innerHTML = "<p>You're doing great! Continue practicing all areas to maintain your skills.</p>";
      return;
    }
    
    // Analyze weak areas
    const weakKeys = [];
    const weakDegrees = [];
    const weakCombos = [];
    
    needsPractice.forEach(item => {
      if (item.type === "Key") weakKeys.push(item.name);
      if (item.type === "Degree") weakDegrees.push(item.name);
      if (item.type === "Specific") {
        // Extract key and degree from combo like "6th of C"
        const match = item.name.match(/(.+) of (.+)/);
        if (match) {
          weakCombos.push({ degree: match[1], key: match[2] });
        }
      }
    });
    
    let planHtml = "<div class='practiceSteps'>";
    
    // Step 1: Focus on specific combinations first (most targeted)
    if (weakCombos.length > 0) {
      const topCombos = weakCombos.slice(0, 5); // Top 5 worst combinations
      planHtml += "<div class='practiceStep'>";
      planHtml += "<div class='stepNumber'>1</div>";
      planHtml += "<div class='stepContent'>";
      planHtml += "<h4>Master Specific Combinations</h4>";
      planHtml += "<p>Focus on these specific degree-key combinations:</p>";
      planHtml += "<ul>";
      topCombos.forEach(combo => {
        planHtml += `<li><strong>${combo.degree} of ${combo.key}</strong></li>`;
      });
      planHtml += "</ul>";
      
      // Create suggested settings
      const suggestedKeys = [...new Set(topCombos.map(c => c.key))];
      const suggestedDegrees = [...new Set(topCombos.map(c => c.degree))];
      
      planHtml += `<button class='btn btnApply' onclick='applyPracticeSettings(${JSON.stringify(suggestedKeys)}, ${JSON.stringify(suggestedDegrees)})'>Apply These Settings</button>`;
      planHtml += "</div></div>";
    }
    
    // Step 2: Practice weak keys
    if (weakKeys.length > 0) {
      planHtml += "<div class='practiceStep'>";
      planHtml += "<div class='stepNumber'>2</div>";
      planHtml += "<div class='stepContent'>";
      planHtml += "<h4>Strengthen Weak Keys</h4>";
      planHtml += `<p>Practice all degrees in these keys: <strong>${weakKeys.join(", ")}</strong></p>`;
      planHtml += `<button class='btn btnApply' onclick='applyPracticeSettings(${JSON.stringify(weakKeys)}, null)'>Practice These Keys</button>`;
      planHtml += "</div></div>";
    }
    
    // Step 3: Practice weak degrees
    if (weakDegrees.length > 0) {
      planHtml += "<div class='practiceStep'>";
      planHtml += "<div class='stepNumber'>3</div>";
      planHtml += "<div class='stepContent'>";
      planHtml += "<h4>Master Difficult Degrees</h4>";
      planHtml += `<p>Practice these degrees across all keys: <strong>${weakDegrees.join(", ")}</strong></p>`;
      planHtml += `<button class='btn btnApply' onclick='applyPracticeSettings(null, ${JSON.stringify(weakDegrees)})'>Practice These Degrees</button>`;
      planHtml += "</div></div>";
    }
    
    // General advice
    planHtml += "<div class='practiceStep'>";
    planHtml += "<div class='stepNumber'>💡</div>";
    planHtml += "<div class='stepContent'>";
    planHtml += "<h4>Practice Tips</h4>";
    planHtml += "<ul>";
    planHtml += "<li>Focus on accuracy first, speed will come naturally</li>";
    planHtml += "<li>Practice weak areas in short, focused sessions</li>";
    planHtml += "<li>Take breaks to avoid mental fatigue</li>";
    planHtml += "<li>Return to full practice once accuracy improves</li>";
    planHtml += "</ul>";
    planHtml += "</div></div>";
    
    planHtml += "</div>";
    planContainer.innerHTML = planHtml;
  }
  
  // Global function to apply practice settings (called from onclick)
  window.applyPracticeSettings = function(keys, degrees) {
    if (keys) {
      settings.keysEnabled = keys;
    }
    if (degrees) {
      settings.degreesEnabled = degrees;
    }
    
    // Switch to practice mode
    settings.gameMode = "practice";
    
    // Save and close stats modal
    saveSettings();
    
    // Close stats modal
    document.getElementById("statsOverlay").hidden = true;
    document.getElementById("statsModal").hidden = true;
    
    // Show confirmation modal
    const practiceOverlay = document.getElementById("practiceSettingsOverlay");
    const practiceModal = document.getElementById("practiceSettingsModal");
    const appliedKeys = document.getElementById("appliedKeys");
    const appliedDegrees = document.getElementById("appliedDegrees");
    
    if (practiceOverlay && practiceModal && appliedKeys && appliedDegrees) {
      appliedKeys.textContent = keys ? keys.join(", ") : "All";
      appliedDegrees.textContent = degrees ? degrees.join(", ") : "All";
      
      practiceOverlay.hidden = false;
      practiceModal.hidden = false;
    }
  };

  // Function to apply settings and show confirmation modal (from game over suggestions)
  window.applyPracticeSettingsAndStart = function(keys, degrees) {
    soundDegreeToggle();
    
    if (keys) {
      settings.keysEnabled = keys;
    }
    if (degrees) {
      settings.degreesEnabled = degrees;
    }
    
    // Switch to practice mode
    settings.gameMode = "practice";
    
    // Save settings
    saveSettings();
    
    // Hide suggestions in question box
    const questionSuggestions = document.getElementById("questionSuggestions");
    if (questionSuggestions) {
      questionSuggestions.hidden = true;
      questionSuggestions.innerHTML = "";
    }
    
    // Close game over status modal if showing
    const elStatusOverlay = document.getElementById("statusOverlay");
    const elStatusPanel = document.getElementById("statusPanel");
    if (elStatusPanel && elStatusOverlay) {
      elStatusPanel.hidden = true;
      elStatusOverlay.hidden = true;
      elStatusPanel.classList.remove("good", "bad");
    }
    
    // Show confirmation modal
    const practiceOverlay = document.getElementById("practiceSettingsOverlay");
    const practiceModal = document.getElementById("practiceSettingsModal");
    const appliedKeys = document.getElementById("appliedKeys");
    const appliedDegrees = document.getElementById("appliedDegrees");
    
    if (practiceOverlay && practiceModal && appliedKeys && appliedDegrees) {
      appliedKeys.textContent = keys ? keys.join(", ") : "All";
      appliedDegrees.textContent = degrees ? degrees.join(", ") : "All";
      
      practiceOverlay.hidden = false;
      practiceModal.hidden = false;
    }
  };

  // Initial render
  const lastUpdatedDate = new Date(LAST_UPDATED);
  const month = String(lastUpdatedDate.getMonth() + 1).padStart(2, '0');
  const day = String(lastUpdatedDate.getDate()).padStart(2, '0');
  const year = String(lastUpdatedDate.getFullYear()).slice(-2);
  const dateStr = `${month}/${day}/${year}`;
  
  let hours = lastUpdatedDate.getHours();
  const minutes = String(lastUpdatedDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;
  
  document.getElementById("version").textContent = 
    `v${APP_VERSION} • Updated ${dateStr} ${timeStr}`;
})();
