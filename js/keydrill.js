import {
  APP_VERSION,
  LAST_UPDATED,
  NOTE_LIST,
  NOTE_TO_PC,
  pcToNote,
  MAJOR_SCALE_OFFSETS,
  SCALE_TYPES,
  SCALE_TYPE_NAMES,
  DIATONIC_DEGREES,
  CHROMATIC_DEGREES,
  CHROMATIC_TO_OFFSET,
  ALL_KEYS
} from './constants.js';

import { dom } from './dom.js';

import {
  STORAGE_KEY,
  DEFAULTS_KEY,
  defaultSettings,
  clamp,
  loadSettings,
  saveSettings as saveSettingsToStorage,
  getVolumeMultiplier
} from './settings.js';

import {
  getStats,
  saveStats,
  recordQuestion,
  clearStats as clearStatsData
} from './stats.js';

import {
  ensureAudio,
  beep,
  soundCorrect,
  soundWrong,
  soundTick,
  soundButtonClick,
  soundKeyToggle,
  soundDegreeToggle,
  soundGameStart,
  soundGameOver,
  soundBonusActivate,
  soundBonusExpire,
  startAmbientMusic,
  stopAmbientMusic,
  updateAmbientVolume,
  slowDownAmbientMusic,
  speedUpAmbientMusic
} from './audio.js';

import {
  generatePianoKeys,
  updatePianoVisualization,
  highlightQuestionNote,
  clearQuestionHighlight
} from './piano.js';

import {
  generateGuitarFretboard,
  updateGuitarVisualization,
  highlightGuitarQuestionNote,
  clearGuitarQuestionHighlight
} from './guitar.js';

import {
  renderQuestion,
  renderAnswers,
  lockAnswers,
  setStatusNeutral,
  renderLives,
  renderScore,
  renderBonus,
  renderLevelInfo,
  flashStatus,
  flashStatusWithSuggestions,
  updateRiskVisual,
  renderKeyToggles,
  renderDegreeToggles,
  renderStats,
  initScaleToggles
} from './ui.js';

import {
  degreeToNote,
  noteToDegree,
  pickRandom,
  shuffle,
  buildOptions,
  buildOptionsForMode,
  stopTimer,
  getEffectiveSecondsPerQuestion,
  startTimer,
  getProgressionStreakRequired,
  initProgressionMode,
  advanceProgressionLevel,
  nextQuestion,
  startGame,
  generateCompactSuggestions,
  endGame,
  nextAfterFeedback,
  handleCorrect,
  handleWrong,
  handleTimeout,
  onAnswerClick
} from './game-logic.js';

"use strict";

// Cache buster: v1.1.4

// Destructure DOM elements for easier access
const {
  elQuestionText,
  elQuestionBox,
  elRestartHint,
  elTimer,
  elTimerBackground,
  elLives,
  elScore,
  elBonusButton,
  elBonusCount,
  elLevelInfo,
  elHeader,
  elStatusPanel,
  elStatusText,
  elAnswerGrid,
  answerButtons,
  elMain,
  menuToggle,
  menuDropdown,
  btnSettings,
  btnStats,
  instrumentPiano,
  instrumentGuitar,
  menuBackdrop,
  overlay,
  modal,
  btnCloseSettings,
  btnSaveSettings,
  btnSetDefault,
  statsOverlay,
  statsModal,
  btnCloseStats,
  btnClearStats,
  confirmOverlay,
  confirmModal,
  confirmMessage,
  btnConfirmRestart,
  btnCancelRestart,
  keyToggles,
  degreeToggles,
  secondsSlider,
  secondsValue,
  modalDurationSlider,
  modalDurationValue,
  volPadSlider,
  volPadValue,
  volArpeggioSlider,
  volArpeggioValue,
  volTickSlider,
  volTickValue,
  volCorrectSlider,
  volCorrectValue,
  volWrongSlider,
  volWrongValue,
  volButtonSlider,
  volButtonValue,
  volBonusSlider,
  volBonusValue,
  volGameOverSlider,
  volGameOverValue,
  modePractice,
  modeProgression,
  difficultyEasy,
  difficultyModerate,
  difficultyHard,
  progressionDifficultySection,
  keysToMasterSection,
  degreeModeSection,
  modeDiatonic,
  modeChromatic,
  toggleSound,
  toggleTick,
  toggleAmbient,
  pianoContainer,
  pianoKeyboard,
  pianoExpandBtn,
  guitarContainer,
  guitarFretboard,
  guitarExpandBtn,
  scaleToggles,
  scaleTypeSection
} = dom;

// Load settings from storage
let settings = loadSettings();
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

    // Bonus system
    bonusPoints: 0,
    bonusActive: false,
    bonusTimeRemaining: 0, // seconds of real time remaining
    bonusTimerId: null,

    timerId: null,
    secondsLeft: 0,
    questionSeconds: 0,
    locked: false,
    paused: false,
    pausedByInstrumentExpand: false,
    instrumentExpanded: false,
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

  const shouldShowInstrument = () => settings.questionMode === "noteToDegree" || settings.questionMode === "scaleRecognition";

  function getActiveInstrument() {
    return settings.instrument === "guitar" ? "guitar" : "piano";
  }

  function getActiveVisualization() {
    const instrument = getActiveInstrument();
    if (instrument === "guitar") {
      return {
        container: guitarContainer,
        surface: guitarFretboard,
        generate: () => generateGuitarFretboard(guitarFretboard, NOTE_TO_PC, pcToNote),
        update: (surface, keyRoot, scaleType, scaleTypes, noteToPc, pcToNoteFn) =>
          updateGuitarVisualization(surface, keyRoot, scaleType, scaleTypes, noteToPc, pcToNoteFn),
        highlight: (surface, note) => highlightGuitarQuestionNote(surface, note),
        clear: (surface) => clearGuitarQuestionHighlight(surface)
      };
    }

    return {
      container: pianoContainer,
      surface: pianoKeyboard,
      generate: () => generatePianoKeys(pianoKeyboard, NOTE_TO_PC, NOTE_LIST),
      update: (surface, keyRoot, scaleType, scaleTypes, noteToPc, pcToNoteFn) =>
        updatePianoVisualization(surface, keyRoot, scaleType, scaleTypes, noteToPc, pcToNoteFn),
      highlight: (surface, note) => highlightQuestionNote(surface, note),
      clear: (surface) => clearQuestionHighlight(surface)
    };
  }

  function renderInstrumentButtons() {
    const active = getActiveInstrument();
    if (instrumentPiano) instrumentPiano.setAttribute("aria-pressed", active === "piano" ? "true" : "false");
    if (instrumentGuitar) instrumentGuitar.setAttribute("aria-pressed", active === "guitar" ? "true" : "false");
  }

  function renderInstrumentExpandedState() {
    const active = getActiveVisualization();
    const expanded = state.instrumentExpanded;

    [pianoContainer, guitarContainer].forEach(container => {
      if (!container) return;
      container.classList.remove('instrumentExpanded');
    });

    if (expanded && active.container) {
      active.container.classList.add('instrumentExpanded');
    }

    [pianoExpandBtn, guitarExpandBtn].forEach(btn => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      btn.textContent = expanded ? '⤡' : '⤢';
      btn.title = expanded ? 'Collapse instrument view' : 'Expand instrument view';
    });
  }

  function setInstrumentExpanded(expanded) {
    const shouldExpand = !!expanded;
    if (state.instrumentExpanded === shouldExpand) return;

    state.instrumentExpanded = shouldExpand;

    if (shouldExpand) {
      if (state.active && !state.paused) {
        state.paused = true;
        state.pausedByInstrumentExpand = true;
        stopTimerWrapper();
        lockAnswers(state, answerButtons, true);
      }
    } else if (state.pausedByInstrumentExpand && state.active) {
      state.pausedByInstrumentExpand = false;
      state.paused = false;
      lockAnswers(state, answerButtons, false);
      startTimerWrapper();
    }

    renderInstrumentExpandedState();
  }

  function renderInstrumentVisualization() {
    const visible = shouldShowInstrument();
    const active = getActiveVisualization();

    if (!visible && state.instrumentExpanded) {
      setInstrumentExpanded(false);
    }

    if (pianoContainer) pianoContainer.hidden = !visible || active.container !== pianoContainer;
    if (guitarContainer) guitarContainer.hidden = !visible || active.container !== guitarContainer;

    if (elMain) {
      if (visible) elMain.classList.add('pianoMode');
      else elMain.classList.remove('pianoMode');
    }

    if (!visible || !active.surface) return;

    active.generate();

    let keyForView;
    let scaleForView;
    if (state.active && state.current) {
      keyForView = state.current.keyRoot;
      scaleForView = state.current.scaleType || 'major';
    } else {
      keyForView = settings.keysEnabled[0] || 'C';
      scaleForView = settings.scaleTypesEnabled[0] || 'major';
    }

    active.update(active.surface, keyForView, scaleForView, SCALE_TYPES, NOTE_TO_PC, pcToNote);

    if (settings.questionMode === "noteToDegree" && state.current?.questionNote) {
      active.highlight(active.surface, state.current.questionNote);
    } else {
      active.clear(active.surface);
    }

    renderInstrumentExpandedState();
  }

  // =========================
  // Wrapper functions for game logic
  // =========================
  
  const startGameWrapper = () => {
    startGame(
      state, settings, elStatusPanel, elLives, elScore, elBonusCount, elBonusButton, elLevelInfo, elStatusText, answerButtons,
      ensureAudio, startAmbientMusic, getVolumeMultiplier, renderLives, renderScore, renderBonus, renderLevelInfo,
      setStatusNeutral, updateRiskVisual, nextQuestionWrapper, initProgressionModeWrapper, ALL_KEYS
    );
    // Speed up ambient music when starting game
    speedUpAmbientMusic();
  };
  
  const nextQuestionWrapper = () => {
    const activeView = getActiveVisualization();
    return nextQuestion(
      state, settings, ALL_KEYS, DIATONIC_DEGREES, CHROMATIC_DEGREES, NOTE_TO_PC, MAJOR_SCALE_OFFSETS,
      CHROMATIC_TO_OFFSET, NOTE_LIST, SCALE_TYPES, SCALE_TYPE_NAMES, pcToNote, elQuestionText, elTimerBackground,
      answerButtons, elLevelInfo, activeView.surface, renderQuestion, renderAnswers, renderLevelInfo, startTimerWrapper,
      activeView.update, activeView.highlight
    );
  };
  
  const startTimerWrapper = () => startTimer(
    state, settings, elTimerBackground, updateRiskVisual, soundTick, getVolumeMultiplier, handleTimeoutWrapper, clamp
  );
  
  const stopTimerWrapper = () => stopTimer(state);
  
  const initProgressionModeWrapper = () => initProgressionMode(state, settings, ALL_KEYS);
  
  const endGameWrapper = (message) => endGame(
    state, settings, message, answerButtons, elTimerBackground, elQuestionText, lockAnswers, updateRiskVisual,
    getStats, saveStats, flashStatus, elStatusPanel, elStatusText, soundGameOver, getVolumeMultiplier,
    stopTimerWrapper, stopAmbientMusic, generateCompactSuggestionsWrapper
  );
  
  const generateCompactSuggestionsWrapper = () => generateCompactSuggestions(getStats);
  
  const nextAfterFeedbackWrapper = () => nextAfterFeedback(
    state, settings, answerButtons, lockAnswers, nextQuestionWrapper
  );
  
  const handleCorrectWrapper = (chosen) => handleCorrect(
    state, settings, chosen, answerButtons, elLives, elScore, elBonusCount, elBonusButton, elStatusPanel,
    elStatusText, elLevelInfo, soundCorrect, getVolumeMultiplier, recordQuestion, renderBonus, renderScore,
    renderLives, updateRiskVisual, flashStatus, lockAnswers, stopTimerWrapper, nextAfterFeedbackWrapper,
    getProgressionStreakRequired, advanceProgressionLevel, renderLevelInfo
  );
  
  const handleWrongWrapper = (chosen) => handleWrong(
    state, settings, chosen, answerButtons, elLives, elStatusPanel, elStatusText, soundWrong, getVolumeMultiplier,
    recordQuestion, renderLives, updateRiskVisual, flashStatus, lockAnswers, stopTimerWrapper, nextAfterFeedbackWrapper,
    endGameWrapper
  );
  
  const handleTimeoutWrapper = () => handleTimeout(
    state, settings, answerButtons, elLives, elStatusPanel, elStatusText, soundWrong, getVolumeMultiplier,
    recordQuestion, renderLives, updateRiskVisual, flashStatus, lockAnswers, nextAfterFeedbackWrapper, endGameWrapper
  );
  
  const onAnswerClickWrapper = (btn) => onAnswerClick(state, btn, handleCorrectWrapper, handleWrongWrapper, settings);

  // =========================
  // Settings Modal
  // =========================
  function openSettings() {
    // Close stats modal if open
    statsOverlay.hidden = true;
    
    overlay.hidden = false;

    // Pause the game if it's active
    if (state.active && !state.locked) {
      state.paused = true;
      stopTimerWrapper();
      lockAnswers(state, answerButtons, true);
      // Slow down ambient music when entering settings
      slowDownAmbientMusic();
    }

    secondsSlider.value = String(settings.secondsPerQuestion);
    secondsValue.textContent = `${settings.secondsPerQuestion}s`;

    modalDurationSlider.value = String(settings.modalDuration);
    modalDurationValue.textContent = `${(settings.modalDuration / 1000).toFixed(1)}s`;

    // Initialize mixer values
    if (volPadSlider && volPadValue) {
      volPadSlider.value = String(settings.volumes.pad);
      volPadValue.textContent = `${settings.volumes.pad}%`;
    }
    if (volArpeggioSlider && volArpeggioValue) {
      volArpeggioSlider.value = String(settings.volumes.arpeggio);
      volArpeggioValue.textContent = `${settings.volumes.arpeggio}%`;
    }
    if (volTickSlider && volTickValue) {
      volTickSlider.value = String(settings.volumes.tick);
      volTickValue.textContent = `${settings.volumes.tick}%`;
    }
    if (volCorrectSlider && volCorrectValue) {
      volCorrectSlider.value = String(settings.volumes.correct);
      volCorrectValue.textContent = `${settings.volumes.correct}%`;
    }
    if (volWrongSlider && volWrongValue) {
      volWrongSlider.value = String(settings.volumes.wrong);
      volWrongValue.textContent = `${settings.volumes.wrong}%`;
    }
    if (volButtonSlider && volButtonValue) {
      volButtonSlider.value = String(settings.volumes.button);
      volButtonValue.textContent = `${settings.volumes.button}%`;
    }
    if (volBonusSlider && volBonusValue) {
      volBonusSlider.value = String(settings.volumes.bonus);
      volBonusValue.textContent = `${settings.volumes.bonus}%`;
    }
    if (volGameOverSlider && volGameOverValue) {
      volGameOverSlider.value = String(settings.volumes.gameOver);
      volGameOverValue.textContent = `${settings.volumes.gameOver}%`;
    }

    modePractice.setAttribute("aria-checked", settings.gameMode === "practice" ? "true" : "false");
    modeProgression.setAttribute("aria-checked", settings.gameMode === "progression" ? "true" : "false");

    difficultyEasy.setAttribute("aria-checked", settings.progressionDifficulty === "easy" ? "true" : "false");
    difficultyModerate.setAttribute("aria-checked", settings.progressionDifficulty === "moderate" ? "true" : "false");
    difficultyHard.setAttribute("aria-checked", settings.progressionDifficulty === "hard" ? "true" : "false");
    
    // Show/hide sections based on game mode
    const isPractice = settings.gameMode === "practice";
    const degreesToPracticeSection = document.getElementById("degreesToPracticeSection");
    if (progressionDifficultySection) {
      progressionDifficultySection.style.display = isPractice ? "none" : "block";
    }
    if (keysToMasterSection) {
      keysToMasterSection.style.display = isPractice ? "block" : "none";
    }
    if (degreesToPracticeSection) {
      degreesToPracticeSection.style.display = "block";
    }
    if (degreeModeSection) {
      degreeModeSection.style.display = isPractice ? "block" : "none";
    }

    modeDiatonic.setAttribute("aria-checked", settings.degreeMode === "diatonic" ? "true" : "false");
    modeChromatic.setAttribute("aria-checked", settings.degreeMode === "chromatic" ? "true" : "false");

    // Initialize unified game mode UI
    if (modeDegreeToNote && modeNoteToDegree && modeScaleRecognition) {
      modeDegreeToNote.setAttribute("aria-checked", settings.questionMode === "degreeToNote" ? "true" : "false");
      modeNoteToDegree.setAttribute("aria-checked", settings.questionMode === "noteToDegree" ? "true" : "false");
      modeScaleRecognition.setAttribute("aria-checked", settings.questionMode === "scaleRecognition" ? "true" : "false");
    }

    toggleSound.setAttribute("aria-pressed", settings.audioOn ? "true" : "false");
    toggleSound.textContent = `Sounds: ${settings.audioOn ? "On" : "Off"}`;

    toggleTick.setAttribute("aria-pressed", settings.tickOn ? "true" : "false");
    toggleTick.textContent = `Tick: ${settings.tickOn ? "On" : "Off"}`;

    toggleAmbient.setAttribute("aria-pressed", settings.ambientOn ? "true" : "false");
    toggleAmbient.textContent = `Music: ${settings.ambientOn ? "On" : "Off"}`;
    
    renderInstrumentButtons();
    renderInstrumentVisualization();

    renderKeyToggles(keyToggles, ALL_KEYS, settings, getVolumeMultiplier, soundDegreeToggle);
    const degreePool = settings.degreeMode === "diatonic" ? DIATONIC_DEGREES : CHROMATIC_DEGREES;
    renderDegreeToggles(degreeToggles, degreePool, settings, getVolumeMultiplier, soundDegreeToggle);
    initScaleToggles(scaleToggles, SCALE_TYPES, SCALE_TYPE_NAMES, settings, saveSettingsToStorage, soundDegreeToggle, getVolumeMultiplier);
    btnCloseSettings.focus();
  }

  function closeSettings() {
    overlay.hidden = true;
    btnSettings.focus();

    // Resume the game if it was paused
    if (state.paused && state.active && !state.instrumentExpanded) {
      state.paused = false;
      lockAnswers(state, answerButtons, false);
      // Speed up ambient music when resuming from settings
      speedUpAmbientMusic();
      startTimerWrapper();
    }
  }

  function showConfirmRestart() {
    const message = settings.gameMode === "progression"
      ? "Are you sure you want to restart from level 1?"
      : "Are you sure you want to restart?";
    
    confirmMessage.textContent = message;
    
    // Pause the game (stop timer and lock answers)
    if (state.active) {
      stopTimerWrapper();
      lockAnswers(state, answerButtons, true);
    }
    
    confirmOverlay.hidden = false;
    btnCancelRestart.focus();
  }

  function hideConfirmRestart() {
    confirmOverlay.hidden = true;
    
    // Resume the game if user cancels and game is still active
    if (state.active) {
      lockAnswers(state, answerButtons, false);
      startTimerWrapper();
    }
  }

  function setMode(mode) {
    settings.degreeMode = mode;
    modeDiatonic.setAttribute("aria-checked", mode === "diatonic" ? "true" : "false");
    modeChromatic.setAttribute("aria-checked", mode === "chromatic" ? "true" : "false");
    const degreePool = mode === "diatonic" ? DIATONIC_DEGREES : CHROMATIC_DEGREES;
    renderDegreeToggles(degreeToggles, degreePool, settings, getVolumeMultiplier, soundDegreeToggle);
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
      degreesToPracticeSection.style.display = "block";
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
  answerButtons.forEach(b => b.addEventListener("click", () => onAnswerClickWrapper(b)));

  // Bonus button handler
  if (elBonusButton) {
    elBonusButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering questionBox click
      if (state.bonusPoints >= 5 && !state.bonusActive && state.active && !state.locked) {
        activateBonus();
      }
    });
  }

  function activateBonus() {
    if (state.bonusPoints < 5 || state.bonusActive) return;
    
    soundBonusActivate(settings, getVolumeMultiplier);
    state.bonusPoints -= 5;
    state.bonusActive = true;
    state.bonusTimeRemaining = 30;
    renderBonus(state, elBonusCount, elBonusButton);
    
    // Restart timer with doubled time
    stopTimerWrapper();
    startTimerWrapper();
    
    flashStatus(settings, elStatusPanel, elStatusText, true, "⏳ Bonus Activated! Questions have 2x time for 30 seconds!");
    
    // Start countdown timer (real time)
    state.bonusTimerId = setInterval(() => {
      if (!state.active) {
        clearInterval(state.bonusTimerId);
        state.bonusTimerId = null;
        state.bonusActive = false;
        state.bonusTimeRemaining = 0;
        renderBonus(state, elBonusCount, elBonusButton);
        return;
      }
      
      state.bonusTimeRemaining -= 1;
      renderBonus(state, elBonusCount, elBonusButton);
      
      if (state.bonusTimeRemaining <= 0) {
        clearInterval(state.bonusTimerId);
        state.bonusTimerId = null;
        state.bonusActive = false;
        renderBonus(state, elBonusCount, elBonusButton);
        soundBonusExpire(settings, getVolumeMultiplier);
        flashStatus(settings, elStatusPanel, elStatusText, true, "Bonus time expired!");
        
        // Restart timer with normal time if in middle of question
        if (!state.locked) {
          stopTimerWrapper();
          startTimerWrapper();
        }
      }
    }, 1000);
  }

  if (elQuestionBox) {
    elQuestionBox.addEventListener("click", () => {
      // If game is active, show confirmation modal
      if (state.active) {
        soundDegreeToggle(settings, getVolumeMultiplier);
        showConfirmRestart();
      } else {
        // Game not active, just start
        soundGameStart(settings);
        startGameWrapper();
      }
    });
  }

  btnSettings.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    const triangleMenu = document.querySelector('.triangleMenu');
    menuDropdown.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    triangleMenu.classList.remove('active');
    openSettings();
  });

  btnStats.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    const triangleMenu = document.querySelector('.triangleMenu');
    menuDropdown.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    triangleMenu.classList.remove('active');
    // Close settings modal if open
    overlay.hidden = true;
    // Slow down music when opening stats
    if (state.active) slowDownAmbientMusic();
    renderStats(getStats);
    statsOverlay.hidden = false;
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSettings();
  });
  btnCloseSettings.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    closeSettings();
  });

  // Confirmation modal handlers
  btnConfirmRestart.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    hideConfirmRestart();
    startGameWrapper();
  });
  
  btnCancelRestart.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    hideConfirmRestart();
  });
  
  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) hideConfirmRestart();
  });

  // Menu toggle
  menuToggle.addEventListener("click", (e) => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    e.stopPropagation();
    const isHidden = menuDropdown.hidden;
    const triangleMenu = document.querySelector('.triangleMenu');
    
    // Stop timer when opening menu
    if (isHidden && state.active) {
      stopTimerWrapper();
      lockAnswers(state, answerButtons, true);
      state.paused = true;
      // Slow down ambient music when opening menu
      slowDownAmbientMusic();
    }
    
    menuDropdown.hidden = !isHidden;
    menuToggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
    
    if (isHidden) {
      // Opening menu
      triangleMenu.classList.add('active');
    } else {
      // Closing menu - resume if game was paused
      triangleMenu.classList.remove('active');
      if (state.paused && state.active && !state.instrumentExpanded) {
        lockAnswers(state, answerButtons, false);
        // Speed up ambient music when closing menu
        speedUpAmbientMusic();
        startTimerWrapper();
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
      if (state.paused && state.active && !state.instrumentExpanded) {
        lockAnswers(state, answerButtons, false);
        // Speed up ambient music when closing menu
        speedUpAmbientMusic();
        startTimerWrapper();
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

  // Audio mixer sliders
  if (volPadSlider) {
    volPadSlider.addEventListener("input", () => {
      settings.volumes.pad = clamp(Number(volPadSlider.value), 0, 100);
      volPadValue.textContent = `${settings.volumes.pad}%`;
      updateAmbientVolume(settings, getVolumeMultiplier);
    });
  }
  if (volArpeggioSlider) {
    volArpeggioSlider.addEventListener("input", () => {
      settings.volumes.arpeggio = clamp(Number(volArpeggioSlider.value), 0, 100);
      volArpeggioValue.textContent = `${settings.volumes.arpeggio}%`;
      updateAmbientVolume(settings, getVolumeMultiplier);
    });
  }
  if (volTickSlider) {
    volTickSlider.addEventListener("input", () => {
      settings.volumes.tick = clamp(Number(volTickSlider.value), 0, 100);
      volTickValue.textContent = `${settings.volumes.tick}%`;
    });
  }
  if (volCorrectSlider) {
    volCorrectSlider.addEventListener("input", () => {
      settings.volumes.correct = clamp(Number(volCorrectSlider.value), 0, 100);
      volCorrectValue.textContent = `${settings.volumes.correct}%`;
    });
  }
  if (volWrongSlider) {
    volWrongSlider.addEventListener("input", () => {
      settings.volumes.wrong = clamp(Number(volWrongSlider.value), 0, 100);
      volWrongValue.textContent = `${settings.volumes.wrong}%`;
    });
  }
  if (volButtonSlider) {
    volButtonSlider.addEventListener("input", () => {
      settings.volumes.button = clamp(Number(volButtonSlider.value), 0, 100);
      volButtonValue.textContent = `${settings.volumes.button}%`;
    });
  }
  if (volBonusSlider) {
    volBonusSlider.addEventListener("input", () => {
      settings.volumes.bonus = clamp(Number(volBonusSlider.value), 0, 100);
      volBonusValue.textContent = `${settings.volumes.bonus}%`;
    });
  }
  if (volGameOverSlider) {
    volGameOverSlider.addEventListener("input", () => {
      settings.volumes.gameOver = clamp(Number(volGameOverSlider.value), 0, 100);
      volGameOverValue.textContent = `${settings.volumes.gameOver}%`;
    });
  }

  modePractice.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setGameMode("practice");
  });
  modeProgression.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setGameMode("progression");
  });

  difficultyEasy.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setProgressionDifficulty("easy");
  });
  difficultyModerate.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setProgressionDifficulty("moderate");
  });
  difficultyHard.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setProgressionDifficulty("hard");
  });

  modeDiatonic.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setMode("diatonic");
  });
  modeChromatic.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setMode("chromatic");
  });

  // Unified game mode selector event listeners
  const modeDegreeToNote = document.getElementById("modeDegreeToNote");
  const modeNoteToDegree = document.getElementById("modeNoteToDegree");
  const modeScaleRecognition = document.getElementById("modeScaleRecognition");
  
  function setQuestionMode(mode) {
    settings.questionMode = mode;
    modeDegreeToNote.setAttribute("aria-checked", mode === "degreeToNote" ? "true" : "false");
    modeNoteToDegree.setAttribute("aria-checked", mode === "noteToDegree" ? "true" : "false");
    modeScaleRecognition.setAttribute("aria-checked", mode === "scaleRecognition" ? "true" : "false");
    renderInstrumentVisualization();
    
    saveSettingsToStorage(settings);
  }

  function setInstrument(instrument) {
    settings.instrument = instrument === "guitar" ? "guitar" : "piano";
    renderInstrumentButtons();
    renderInstrumentVisualization();
    saveSettingsToStorage(settings);

    if (state.active) {
      stopTimerWrapper();
      state.locked = false;
      lockAnswers(state, answerButtons, false);
      nextQuestionWrapper();
    }
  }

  if (instrumentPiano) {
    instrumentPiano.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrument("piano");
    });
  }

  if (instrumentGuitar) {
    instrumentGuitar.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrument("guitar");
    });
  }

  if (pianoExpandBtn) {
    pianoExpandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrumentExpanded(!state.instrumentExpanded);
    });
  }

  if (guitarExpandBtn) {
    guitarExpandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrumentExpanded(!state.instrumentExpanded);
    });
  }
  
  modeDegreeToNote.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setQuestionMode("degreeToNote");
  });
  modeNoteToDegree.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setQuestionMode("noteToDegree");
  });
  modeScaleRecognition.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    setQuestionMode("scaleRecognition");
  });

  toggleSound.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    settings.audioOn = !settings.audioOn;
    toggleSound.setAttribute("aria-pressed", settings.audioOn ? "true" : "false");
    toggleSound.textContent = `Sounds: ${settings.audioOn ? "On" : "Off"}`;
    if (settings.audioOn) ensureAudio();
  });

  toggleTick.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    settings.tickOn = !settings.tickOn;
    toggleTick.setAttribute("aria-pressed", settings.tickOn ? "true" : "false");
    toggleTick.textContent = `Tick: ${settings.tickOn ? "On" : "Off"}`;
    if (settings.tickOn) ensureAudio();
  });

  toggleAmbient.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    settings.ambientOn = !settings.ambientOn;
    toggleAmbient.setAttribute("aria-pressed", settings.ambientOn ? "true" : "false");
    toggleAmbient.textContent = `Music: ${settings.ambientOn ? "On" : "Off"}`;
    if (settings.ambientOn && state.active) {
      startAmbientMusic(settings, getVolumeMultiplier);
    } else {
      stopAmbientMusic();
    }
  });

  btnSaveSettings.addEventListener("click", () => {
    soundDegreeToggle(settings, getVolumeMultiplier);
    // Cannot allow zero keys (fallback to all)
    if (!settings.keysEnabled.length) settings.keysEnabled = [...ALL_KEYS];

    saveSettingsToStorage(settings);
    closeSettings();

    // Apply settings immediately (including chromatic mode)
    if (state.active) {
      stopTimerWrapper();
      state.locked = false;
      lockAnswers(state, answerButtons, false);
      nextQuestionWrapper();
    } else {
      renderAnswers(state, answerButtons);
      renderInstrumentVisualization();
    }

    setStatusNeutral(elStatusPanel, elStatusText, "Settings saved.");
  });

  if (btnSetDefault) {
    btnSetDefault.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      
      // Save current settings as the new persistent defaults
      const currentDefaults = structuredClone(settings);
      localStorage.setItem(DEFAULTS_KEY, JSON.stringify(currentDefaults));
      
      // Clear temporary settings so defaults take effect
      localStorage.removeItem(STORAGE_KEY);
      
      // Show feedback
      const originalText = btnSetDefault.textContent;
      btnSetDefault.textContent = "✓ Saved as Default!";
      btnSetDefault.disabled = true;
      
      setTimeout(() => {
        btnSetDefault.textContent = originalText;
        btnSetDefault.disabled = false;
      }, 2000);
    });
  }

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
      renderStats(getStats);
    });

    btnCloseStats.addEventListener("click", () => {
      statsOverlay.hidden = true;
      statsModal.hidden = true;
      // Speed up music when closing stats and game is active
      if (state.active) speedUpAmbientMusic();
    });

    statsOverlay.addEventListener("click", (e) => {
      if (e.target === statsOverlay) {
        statsOverlay.hidden = true;
        statsModal.hidden = true;
        // Speed up music when closing stats and game is active
        if (state.active) speedUpAmbientMusic();
      }
    });

    btnClearStats.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all statistics? This cannot be undone.")) {
        clearStatsData();
      }
    });
  }

  // Piano mode toggle removed - now controlled by unified game mode selector
  // (Piano shows automatically for "Note → Degree" and "Scale Recognition" modes)

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
  
  renderInstrumentButtons();
  renderInstrumentVisualization();
  
  initScaleToggles(scaleToggles, SCALE_TYPES, SCALE_TYPE_NAMES, settings, saveSettingsToStorage, soundDegreeToggle, getVolumeMultiplier);
