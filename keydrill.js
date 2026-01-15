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

  const btnSettings = document.getElementById("btnSettings");
  const btnStats = document.getElementById("btnStats");

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

  // =========================
  // Settings (localStorage)
  // =========================
  const STORAGE_KEY = "keydrill_settings_v1";

  const defaultSettings = {
    keysEnabled: ["C"],
    secondsPerQuestion: 8,
    degreeMode: "diatonic", // "diatonic" | "chromatic"
    gameMode: "practice", // "practice" | "progression"
    progressionDifficulty: "moderate", // "easy" | "moderate" | "hard"
    audioOn: true,
    tickOn: false,
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

      return s;
    } catch {
      return structuredClone(defaultSettings);
    }
  }

  function saveSettings() {
    // Cannot allow zero keys (fallback to all)
    if (!settings.keysEnabled.length) settings.keysEnabled = [...ALL_KEYS];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  let settings = loadSettings();

  // =========================
  // Statistics tracking
  // =========================
  
  function getStats() {
    const stored = localStorage.getItem("keydrillStats");
    if (!stored) return { questions: [] };
    try {
      return JSON.parse(stored);
    } catch {
      return { questions: [] };
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
    const full = "♥".repeat(state.lives);
    const empty = "♡".repeat(Math.max(0, state.maxLives - state.lives));
    elLives.textContent = full + empty;
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
    
    elStatusPanel.classList.remove("good", "bad");
    void elStatusPanel.offsetWidth;
    elStatusPanel.classList.add(isGood ? "good" : "bad");
    elStatusText.textContent = text;
    
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
    const degreeLabel = pickRandom(degreePool);
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

  function endGame(message) {
    state.active = false;
    state.current = null;
    stopTimer();
    lockAnswers(true);
    if (elTimerBackground) elTimerBackground.textContent = "--";
    updateRiskVisual();
    
    // Restore header visibility
    if (elHeader) {
      elHeader.classList.remove("faded");
    }
    
    flashStatus(false, `${message} — Final Score: ${state.score}`);
    elQuestionText.textContent = "Game Over. Press New to try again.";
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
        const isOn = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", isOn ? "false" : "true");
        if (isOn) enabled.delete(k);
        else enabled.add(k);
        settings.keysEnabled = Array.from(enabled);
      });

      keyToggles.appendChild(b);
    }
  }

  function openSettings() {
    overlay.hidden = false;
    modal.hidden = false;

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

    renderKeyToggles();
    btnCloseSettings.focus();
  }

  function closeSettings() {
    overlay.hidden = true;
    modal.hidden = true;
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
    confirmModal.hidden = false;
    btnCancelRestart.focus();
  }

  function hideConfirmRestart() {
    confirmOverlay.hidden = true;
    confirmModal.hidden = true;
    
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
    if (progressionDifficultySection) {
      progressionDifficultySection.style.display = isPractice ? "none" : "block";
    }
    if (keysToMasterSection) {
      keysToMasterSection.style.display = isPractice ? "block" : "none";
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
        showConfirmRestart();
      } else {
        // Game not active, just start
        startGame();
      }
    });
  }

  btnSettings.addEventListener("click", () => openSettings());
  overlay.addEventListener("click", () => closeSettings());
  btnCloseSettings.addEventListener("click", () => closeSettings());

  // Confirmation modal handlers
  btnConfirmRestart.addEventListener("click", () => {
    hideConfirmRestart();
    startGame();
  });
  
  btnCancelRestart.addEventListener("click", () => {
    hideConfirmRestart();
  });
  
  confirmOverlay.addEventListener("click", () => {
    hideConfirmRestart();
  });

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

  modePractice.addEventListener("click", () => setGameMode("practice"));
  modeProgression.addEventListener("click", () => setGameMode("progression"));

  difficultyEasy.addEventListener("click", () => setProgressionDifficulty("easy"));
  difficultyModerate.addEventListener("click", () => setProgressionDifficulty("moderate"));
  difficultyHard.addEventListener("click", () => setProgressionDifficulty("hard"));

  modeDiatonic.addEventListener("click", () => setMode("diatonic"));
  modeChromatic.addEventListener("click", () => setMode("chromatic"));

  toggleSound.addEventListener("click", () => {
    settings.audioOn = !settings.audioOn;
    toggleSound.setAttribute("aria-pressed", settings.audioOn ? "true" : "false");
    toggleSound.textContent = `Sounds: ${settings.audioOn ? "On" : "Off"}`;
    if (settings.audioOn) ensureAudio();
  });

  toggleTick.addEventListener("click", () => {
    settings.tickOn = !settings.tickOn;
    toggleTick.setAttribute("aria-pressed", settings.tickOn ? "true" : "false");
    toggleTick.textContent = `Tick: ${settings.tickOn ? "On" : "Off"}`;
    if (settings.tickOn) ensureAudio();
  });

  btnSaveSettings.addEventListener("click", () => {
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

    statsOverlay.addEventListener("click", () => {
      statsOverlay.hidden = true;
      statsModal.hidden = true;
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
  }

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
