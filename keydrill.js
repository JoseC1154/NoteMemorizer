(() => {
  "use strict";

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
  const elTimer = document.getElementById("timer");
  const elStatusPanel = document.getElementById("statusPanel");
  const elStatusText = document.getElementById("statusText");
  const elAnswerGrid = document.getElementById("answerGrid");
  const answerButtons = Array.from(elAnswerGrid.querySelectorAll(".answerBtn"));

  const btnNew = document.getElementById("btnNew");
  const btnSettings = document.getElementById("btnSettings");

  const overlay = document.getElementById("settingsOverlay");
  const modal = document.getElementById("settingsModal");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");

  const keyToggles = document.getElementById("keyToggles");
  const secondsSlider = document.getElementById("secondsSlider");
  const secondsValue = document.getElementById("secondsValue");

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
    audioOn: true,
    tickOn: false
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
      if (typeof parsed.audioOn === "boolean") s.audioOn = parsed.audioOn;
      if (typeof parsed.tickOn === "boolean") s.tickOn = parsed.tickOn;

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

    timerId: null,
    secondsLeft: 0,
    questionSeconds: 0,
    locked: false,
    current: null // { keyRoot, degreeLabel, correctNote, options[] }
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
    return shuffle([correct, ...pool.slice(0, 6)]);
  }

  function renderQuestion() {
    const q = state.current;
    if (!q) {
      elQuestionText.textContent = "Press New to begin.";
      elTimer.textContent = "--";
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

  function flashStatus(isGood, text) {
    elStatusPanel.classList.remove("good", "bad");
    void elStatusPanel.offsetWidth;
    elStatusPanel.classList.add(isGood ? "good" : "bad");
    elStatusText.textContent = text;

    setTimeout(() => {
      if (!state.active) return;
      elStatusPanel.classList.remove("good", "bad");
    }, 2000);
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
    elTimer.textContent = String(state.secondsLeft);
    updateRiskVisual();

    state.timerId = setInterval(() => {
      if (!state.active || state.locked) return;

      state.secondsLeft -= 1;
      elTimer.textContent = String(state.secondsLeft);
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
    const riskTime = clamp(1 - (sfunction nextQuestion() {
    // Endless questions
    state.questionIndex += 1;n), 0, 1);

    const risk = clamp(Math.max(riskLives, riskTime), 0, 1);
    document.documentElement.style.setProperty("--risk", String(risk));
  }

  function startTimer() {
    stopTimer();

    state.questionSeconds = getEffectiveSecondsPerQuestion();
    state.secondsLeft = state.questionSeconds;

    elTimer.textContent = String(state.secondsLeft);
    updateRiskVisual();

    state.timerId = setInterval(() => {
      if (!state.active || state.locked) return;

      state.secondsLeft -= 1;
      elTimer.textContent = String(state.secondsLeft);
      function startGame() {
    ensureAudio();

    state.active = true;
    state.locked = false;

    state.questionIndex = 0;
    state.streak = 0;
    state.speedLevel = 0;

    // Start with 3 lives (matches the original "3 tries" feeling, now used for endless mode)
    state.lives = 3;
    state.maxLives = 3;

    state.current = null;
    setStatusNeutral("Ready.");
    updateRiskVisual();
    nextQuestion();
  }st efunction endGame(message) {
    state.active = false;
    state.current = null;
    stopTimer();
    lockAnswers(true);
    elTimer.textContent = "--";
    updateRiskVisual();
    flashStatus(false, message);
    elQuestionText.textContent = "Game Over. Press New to try again.";
  }

  function nextAfterFeedback() {
    setTimeout(() => {
      if (!state.active) return;
      lockAnswers(false);
      nextQuestion();
    }, 450);
  }

  function handleCorrect(chosen) {
    soundCorrect();

    state.streak += 1;

    // After 10 correct streak the user gets an extra life (every 10)
    let awardedLife = false;
    if (state.streak > 0 && state.streak % 10 === 0) {
      state.lives += 1;
      state.maxLives = Math.max(state.maxLives, s

    if (awardedLife) {
      flashStatus(true, `Correct: ${chosen} — +1 life! (Lives: ${state.lives})`);
    } else {
      flashStatus(true, `Correct: ${chosen} (Streak: ${state.streak})`);
    }

    lockAnswers(true);
    stopTimer();
    nextAfterFeedback();
  }

  function handleWrong(chosen) {
    soundWrong();

    state.streak = 0;
    state.lives -= 1;
    updateRiskVisual();

    if (state.lives <= 0) {
      flashStatus(false, `Wrong: ${chosen} — 0 lives left.`);
      endGame("No lives left.");
      return;
    }

    flashStatus(false, `Wrong: ${chosen} — lives left: ${state.lives}`);
    lockAnswers(true);
    stopTimer();
    nextAfterFeedback();
  }

  function handleTimeout() {
    soundWrong();

    state.streak = 0;
    state.lives -= 1;
    updateRiskVisual();

    if (state.lives <= 0) {
      flashStatus(false, "Time out — 0 lives left.");
      endGame("Time out.");
      return;
    }

    flashStatus(false, `Time out — lives left: ${state.lives}`);
    lockAnswers(true);
    nextAfterFeedback();
  }

  function onAnswerClicke.triesLeft <= 0) {
        flashStatus(false, `Wrong: ${chosen} — no tries left.`);
        endGame("No tries left.");
        return;
      }
      flashStatus(false, `Wrong: ${chosen} — tries left: ${state.triesLeft}`);
      return; // same question; timer continues
    }

    flashStatus(false, `Wrong: ${chosen}`);
    endGame("Incorrect.");
  }

  function handleTimeout() {
    soundWrong();

    if (state.questionIndex === 0) {
      state.triesLeft -= 1;
      if (state.triesLeft <= 0) {
        flashStatus(false, "Time out — no tries left.");
        endGame("Time out.");
        return;
      }
      flashStatus(false, `Time out — tries left: ${state.triesLeft}`);
      startTimer(); // restart for same question
      return;
    }

    flashStatus(false, "Time out.");
    endGame("Time out.");
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

    secondsSlider.value = String(settings.secondsPerQuestion);
    secondsValue.textContent = `${settings.secondsPerQuestion}s`;

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
  }

  function setMode(mode) {
    settings.degreeMode = mode;
    modeDiatonic.setAttribute("aria-checked", mode === "diatonic" ? "true" : "false");
    modeChromatic.setAttribute("aria-checked", mode === "chromatic" ? "true" : "false");
  }

  // =========================
  // Wire up events
  // =========================
  answerButtons.forEach(b => b.addEventListener("click", () => onAnswerClick(b)));

  btnNew.addEventListener("click", () => startGame());

  btnSettings.addEventListener("click", () => openSettings());
  overlay.addEventListener("click", () => closeSettings());
  btnCloseSettings.addEventListener("click", () => closeSettings());

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

  // Initial render
  renderQuestion();
  renderAnswers();
  setStatusNeutral("Ready.");
})();
