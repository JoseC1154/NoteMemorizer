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
  generateBassFretboard,
  updateBassVisualization,
  highlightBassQuestionNote,
  clearBassQuestionHighlight
} from './bass.js';

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
  elRotateHintBar,
  studyBackBtn,
  elRestartHint,
  elTimer,
  elTimerBackground,
  elLives,
  elScore,
  elPlayPauseBtn,
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
  btnDonate,
  instrumentPiano,
  instrumentGuitar,
  instrumentBass,
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
  guitarNeckSlider,
  guitarNeckValue,
  bassNeckSlider,
  bassNeckValue,
  questionHeightSlider,
  questionHeightValue,
  answerHeightSlider,
  answerHeightValue,
  notePositionSlider,
  notePositionValue,
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
  inputChoices,
  inputInstrument,
  inputBoth,
  toggleSound,
  toggleTick,
  toggleAmbient,
  pianoContainer,
  pianoKeyboard,
  pianoExpandBtn,
  pianoNotesBtn,
  pianoQuestionOverlay,
  guitarContainer,
  guitarFretboard,
  guitarExpandBtn,
  guitarNotesBtn,
  guitarQuestionOverlay,
  bassContainer,
  bassFretboard,
  bassExpandBtn,
  bassNotesBtn,
  bassQuestionOverlay,
  scaleToggles,
  scaleTypeSection
} = dom;

// Load settings from storage
let settings = loadSettings();
if (settings.questionMode === "degreeToNote" && settings.answerInputMode === "choices") {
  settings.answerInputMode = "both";
}
if (settings.questionMode === "finishScale" && settings.answerInputMode === "choices") {
  settings.answerInputMode = "instrument";
}

function applyLayoutTestingVars() {
  const instrumentPct = settings.instrument === "bass"
    ? settings.bassNeckThicknessPercent
    : settings.guitarNeckThicknessPercent;
  document.documentElement.style.setProperty("--layout-instrument-pct", String(instrumentPct));
  document.documentElement.style.setProperty("--layout-question-pct", String(settings.questionBoxHeightPercent));
  document.documentElement.style.setProperty("--layout-answer-pct", String(settings.answerButtonHeightPercent));
  document.documentElement.style.setProperty("--note-position-scale", String(settings.notePositionSizePercent / 100));
}

function normalizeLayoutPercents(changedKey = null) {
  const allKeys = ["guitarNeckThicknessPercent", "bassNeckThicknessPercent", "questionBoxHeightPercent", "answerButtonHeightPercent"];
  for (const key of allKeys) {
    settings[key] = clamp(Math.round(Number(settings[key]) || 0), 5, 90);
  }

  const instrumentKey = (changedKey === "guitarNeckThicknessPercent" || changedKey === "bassNeckThicknessPercent")
    ? changedKey
    : (settings.instrument === "bass" ? "bassNeckThicknessPercent" : "guitarNeckThicknessPercent");
  const keys = [instrumentKey, "questionBoxHeightPercent", "answerButtonHeightPercent"];

  const sum = keys.reduce((acc, key) => acc + settings[key], 0);
  if (sum === 100) return;

  if (!changedKey) {
    let first = Math.round((settings[keys[0]] / sum) * 100);
    let second = Math.round((settings[keys[1]] / sum) * 100);
    let third = 100 - first - second;

    if (first < 5) first = 5;
    if (second < 5) second = 5;
    third = 100 - first - second;
    if (third < 5) {
      third = 5;
      const remainder = 95;
      const pair = settings[keys[0]] + settings[keys[1]];
      first = pair > 0 ? Math.round((settings[keys[0]] / pair) * remainder) : Math.floor(remainder / 2);
      second = remainder - first;
    }

    settings[keys[0]] = first;
    settings[keys[1]] = second;
    settings[keys[2]] = third;
    return;
  }

  const primaryKey = changedKey && keys.includes(changedKey) ? changedKey : "guitarNeckThicknessPercent";
  settings[primaryKey] = clamp(settings[primaryKey], 5, 90);

  const others = keys.filter(key => key !== primaryKey);
  const targetOthers = 100 - settings[primaryKey];
  const currentOthers = settings[others[0]] + settings[others[1]];

  let first = currentOthers > 0
    ? Math.round((settings[others[0]] / currentOthers) * targetOthers)
    : Math.floor(targetOthers / 2);
  let second = targetOthers - first;

  if (first < 5) {
    first = 5;
    second = targetOthers - first;
  }
  if (second < 5) {
    second = 5;
    first = targetOthers - second;
  }

  settings[others[0]] = first;
  settings[others[1]] = second;
}

function updateLayoutTestingUI() {
  if (guitarNeckSlider && guitarNeckValue) {
    guitarNeckSlider.value = String(settings.guitarNeckThicknessPercent);
    guitarNeckValue.textContent = `${settings.guitarNeckThicknessPercent}%`;
  }
  if (bassNeckSlider && bassNeckValue) {
    bassNeckSlider.value = String(settings.bassNeckThicknessPercent);
    bassNeckValue.textContent = `${settings.bassNeckThicknessPercent}%`;
  }
  if (questionHeightSlider && questionHeightValue) {
    questionHeightSlider.value = String(settings.questionBoxHeightPercent);
    questionHeightValue.textContent = `${settings.questionBoxHeightPercent}%`;
  }
  if (answerHeightSlider && answerHeightValue) {
    answerHeightSlider.value = String(settings.answerButtonHeightPercent);
    answerHeightValue.textContent = `${settings.answerButtonHeightPercent}%`;
  }
  if (notePositionSlider && notePositionValue) {
    notePositionSlider.value = String(settings.notePositionSizePercent);
    notePositionValue.textContent = `${settings.notePositionSizePercent}%`;
  }
}

function updateResponsiveNoteBaseSizes() {
  const guitarHeight = guitarFretboard?.getBoundingClientRect?.().height || 0;
  const bassHeight = bassFretboard?.getBoundingClientRect?.().height || 0;

  const guitarBase = guitarHeight > 0
    ? clamp(Math.round(guitarHeight * 0.064), 14, 56)
    : 28;
  const bassBase = bassHeight > 0
    ? clamp(Math.round(bassHeight * 0.077), 14, 56)
    : 28;

  document.documentElement.style.setProperty("--guitar-note-base-size", `${guitarBase}px`);
  document.documentElement.style.setProperty("--bass-note-base-size", `${bassBase}px`);
}

normalizeLayoutPercents();

applyLayoutTestingVars();
updateResponsiveNoteBaseSizes();
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
    pausedByUser: false,
    pausedByInstrumentExpand: false,
    pausedByStudyBack: false,
    instrumentExpanded: false,
    expandedNotesVisible: false,
    finishScaleReviewMode: false,
    current: null, // { keyRoot, degreeLabel, correctNote, options[] }
    studyBackupCurrent: null,
    studyHistory: [], // up to 3 previous questions
    studyStepIndex: -1,

    // Progression mode state
    progression: {
      level: 1,
      currentKey: null,
      currentMode: "diatonic", // "diatonic" | "chromatic"
      remainingKeys: [],
      levelStreak: 0 // streak for current level (needs 30 to advance)
    }
  };

  const canInstrumentAnswerCurrentMode = () => settings.questionMode === "degreeToNote" || settings.questionMode === "finishScale";

  const shouldShowInstrument = () => {
    if (settings.questionMode === "degreeToNote" || settings.questionMode === "noteToDegree" || settings.questionMode === "scaleRecognition" || settings.questionMode === "finishScale") return true;
    if (canInstrumentAnswerCurrentMode() && settings.answerInputMode !== "choices") return true;
    return false;
  };

  function areChoiceAnswersEnabled() {
    if (!canInstrumentAnswerCurrentMode()) return true;
    return settings.answerInputMode !== "instrument";
  }

  function areInstrumentAnswersEnabled() {
    if (!canInstrumentAnswerCurrentMode()) return false;
    return settings.answerInputMode === "instrument" || settings.answerInputMode === "both";
  }

  function renderAnswerInputModeButtons() {
    if (!inputChoices || !inputInstrument || !inputBoth) return;
    inputChoices.setAttribute("aria-checked", settings.answerInputMode === "choices" ? "true" : "false");
    inputInstrument.setAttribute("aria-checked", settings.answerInputMode === "instrument" ? "true" : "false");
    inputBoth.setAttribute("aria-checked", settings.answerInputMode === "both" ? "true" : "false");
  }

  function syncAnswerInputAvailability() {
    const choicesEnabled = areChoiceAnswersEnabled();
    const isFinishScaleMode = settings.questionMode === "finishScale";
    const hideAnswerGrid = isFinishScaleMode;

    if (elAnswerGrid) {
      if (hideAnswerGrid) {
        elAnswerGrid.style.display = "none";
      } else {
        elAnswerGrid.style.removeProperty("display");
      }

      elAnswerGrid.style.opacity = choicesEnabled && !hideAnswerGrid ? "1" : "0.45";
      elAnswerGrid.style.pointerEvents = choicesEnabled && !hideAnswerGrid ? "auto" : "none";
    }

    if (elMain) {
      elMain.classList.toggle('no-answer-grid', hideAnswerGrid);
    }

    answerButtons.forEach(btn => {
      btn.disabled = hideAnswerGrid || !choicesEnabled || !state.active || state.locked || !state.current;
    });

    updateRotateHintVisibility();
  }

  function updateRotateHintVisibility() {
    if (!elRotateHintBar) return;
    const isPortrait = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(orientation: portrait)").matches;
    const show = !!(state.active && state.current && settings.questionMode === "finishScale" && isPortrait);
    elRotateHintBar.hidden = !show;
  }

  function getActiveInstrument() {
    if (["piano", "guitar", "bass"].includes(settings.instrument)) {
      return settings.instrument;
    }
    return "piano";
  }

  function applyExpandedNoteLabels() {
    const showLabels = state.instrumentExpanded && state.expandedNotesVisible;
    if (pianoKeyboard) pianoKeyboard.classList.toggle('showNoteLabels', showLabels);
    if (guitarFretboard) guitarFretboard.classList.toggle('showNoteLabels', showLabels);
    if (bassFretboard) bassFretboard.classList.toggle('showNoteLabels', showLabels);
  }

  function getCurrentQuestionText() {
    return elQuestionText?.textContent || "";
  }

  function renderExpandedQuestionOverlay() {
    const expanded = state.instrumentExpanded;
    const active = getActiveInstrument();
    const questionText = state.active && state.current ? getCurrentQuestionText() : "";

    if (pianoQuestionOverlay) {
      const show = expanded && active === "piano" && !!questionText;
      pianoQuestionOverlay.hidden = !show;
      if (show) pianoQuestionOverlay.textContent = questionText;
    }

    if (guitarQuestionOverlay) {
      const show = expanded && active === "guitar" && !!questionText;
      guitarQuestionOverlay.hidden = !show;
      if (show) guitarQuestionOverlay.textContent = questionText;
    }

    if (bassQuestionOverlay) {
      const show = expanded && active === "bass" && !!questionText;
      bassQuestionOverlay.hidden = !show;
      if (show) bassQuestionOverlay.textContent = questionText;
    }
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
    
    if (instrument === "bass") {
      return {
        container: bassContainer,
        surface: bassFretboard,
        generate: () => generateBassFretboard(bassFretboard, NOTE_TO_PC, pcToNote),
        update: (surface, keyRoot, scaleType, scaleTypes, noteToPc, pcToNoteFn) =>
          updateBassVisualization(surface, keyRoot, scaleType, scaleTypes, noteToPc, pcToNoteFn),
        highlight: (surface, note) => highlightBassQuestionNote(surface, note),
        clear: (surface) => clearBassQuestionHighlight(surface)
      };
    }

    return {
      container: pianoContainer,
      surface: pianoKeyboard,
      generate: () => generatePianoKeys(pianoKeyboard, NOTE_TO_PC, NOTE_LIST, { fullRange: state.instrumentExpanded }),
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
    if (instrumentBass) instrumentBass.setAttribute("aria-pressed", active === "bass" ? "true" : "false");
  }

  function renderInstrumentExpandedState() {
    const active = getActiveVisualization();
    const expanded = state.instrumentExpanded;
    const instrumentToggleGroup = document.querySelector('.instrumentToggleGroup');

    [pianoContainer, guitarContainer, bassContainer].forEach(container => {
      if (!container) return;
      container.classList.remove('instrumentExpanded');
    });

    if (expanded && active.container) {
      active.container.classList.add('instrumentExpanded');
    }

    [pianoExpandBtn, guitarExpandBtn, bassExpandBtn].forEach(btn => {
      if (!btn) return;
      btn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      btn.textContent = expanded ? '⤡' : '⤢';
      btn.title = expanded ? 'Collapse instrument view' : 'Expand instrument view';
    });

    [pianoNotesBtn, guitarNotesBtn, bassNotesBtn].forEach(btn => {
      if (!btn) return;
      btn.hidden = !expanded;
      btn.setAttribute('aria-pressed', state.expandedNotesVisible ? 'true' : 'false');
      btn.title = state.expandedNotesVisible ? 'Hide note labels' : 'Show note labels';
    });

    if (instrumentToggleGroup) {
      instrumentToggleGroup.hidden = expanded;
    }

    if (elMain) {
      elMain.classList.toggle('instrument-view-expanded', expanded);
    }

    applyExpandedNoteLabels();
    renderExpandedQuestionOverlay();
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
      if (state.pausedByUser || state.pausedByStudyBack) {
        state.paused = true;
        lockAnswers(state, answerButtons, true);
      } else {
        state.paused = false;
        lockAnswers(state, answerButtons, false);
        startTimerWrapper();
      }
    }

    renderInstrumentVisualization();
  }

  function renderInstrumentVisualization() {
    const visible = shouldShowInstrument();
    const active = getActiveVisualization();

    if (!visible && state.instrumentExpanded) {
      setInstrumentExpanded(false);
    }

    if (pianoContainer) pianoContainer.hidden = !visible || active.container !== pianoContainer;
    if (guitarContainer) guitarContainer.hidden = !visible || active.container !== guitarContainer;
    if (bassContainer) bassContainer.hidden = !visible || active.container !== bassContainer;

    if (elMain) {
      elMain.classList.remove('instrument-piano', 'instrument-guitar', 'instrument-bass');
      if (visible) elMain.classList.add('pianoMode');
      else elMain.classList.remove('pianoMode');

      if (visible) {
        if (active.container === pianoContainer) elMain.classList.add('instrument-piano');
        else if (active.container === guitarContainer) elMain.classList.add('instrument-guitar');
        else if (active.container === bassContainer) elMain.classList.add('instrument-bass');
      }
    }

    if (!visible || !active.surface) {
      if (pianoQuestionOverlay) pianoQuestionOverlay.hidden = true;
      if (guitarQuestionOverlay) guitarQuestionOverlay.hidden = true;
      syncAnswerInputAvailability();
      return;
    }

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
    applyFinishScaleMentionedHighlight(active.surface);

    if (settings.questionMode === "noteToDegree" && state.current?.questionNote) {
      active.highlight(active.surface, state.current.questionNote);
    } else {
      active.clear(active.surface);
    }

    renderInstrumentExpandedState();
    renderExpandedQuestionOverlay();
    syncAnswerInputAvailability();
    updateResponsiveNoteBaseSizes();
  }

  function applyFinishScaleMentionedHighlight(surface) {
    if (settings.questionMode !== "finishScale" || !state.active || !state.current || !surface) return;

    const mentionedNotes = new Set();
    const mentionedPianoSteps = new Set();
    const mentionedPositionTokens = new Set();

    if (state.current.finishType === "partial") {
      if (Array.isArray(state.current.shownSteps)) {
        state.current.shownSteps.forEach(step => {
          if (step && step.note != null && step.octave != null) {
            mentionedPianoSteps.add(`${step.note}|${step.octave}`);
          }
        });
      }
      if (Array.isArray(state.current.shownNotes)) {
        state.current.shownNotes.forEach(note => mentionedNotes.add(note));
      }
      if (Array.isArray(state.current.shownPositionTokens)) {
        state.current.shownPositionTokens.forEach(token => {
          if (token) mentionedPositionTokens.add(token);
        });
      }
    } else if (state.current.finishType === "compound") {
      const stage = state.current.compoundStage || 1;
      if (state.current.sourceKeyRoot) mentionedNotes.add(state.current.sourceKeyRoot);
      if (stage >= 2 && state.current.pivotNote) mentionedNotes.add(state.current.pivotNote);
    } else if (state.current.finishType === "oddOneOut") {
      if (Array.isArray(state.current.shownSteps)) {
        state.current.shownSteps.forEach(step => {
          if (step && step.note != null && step.octave != null) {
            mentionedPianoSteps.add(`${step.note}|${step.octave}`);
          }
        });
      }
      if (Array.isArray(state.current.shownNotes)) {
        state.current.shownNotes.forEach(note => mentionedNotes.add(note));
      }
    }

    let noteSelector = ".pianoKey";
    if (surface === guitarFretboard) noteSelector = ".guitarPosition";
    if (surface === bassFretboard) noteSelector = ".bassPosition";

    const noteElements = surface.querySelectorAll(noteSelector);
    noteElements.forEach(el => {
      el.classList.remove("shaded", "inScale", "questionNote");
    });

    noteElements.forEach(el => {
      if (surface === pianoKeyboard) {
        const keyToken = `${el.dataset.note}|${el.dataset.octave}`;
        if (mentionedPianoSteps.size > 0) {
          if (mentionedPianoSteps.has(keyToken)) {
            el.classList.add("inScale");
          }
        } else if (mentionedNotes.has(el.dataset.note)) {
          el.classList.add("inScale");
        }
      } else {
        const posToken = `${el.dataset.string}|${el.dataset.fret}`;
        if (mentionedPositionTokens.size > 0) {
          if (mentionedPositionTokens.has(posToken)) {
            el.classList.add("inScale");
          }
        } else if (mentionedNotes.has(el.dataset.note)) {
          el.classList.add("inScale");
        }
      }
    });
  }

  function getCorrectValueForQuestion(question, questionMode) {
    if (!question) return "";
    return questionMode === "noteToDegree" ? question.correctDegree : question.correctNote;
  }

  function updateStudyBackButtonState() {
    if (!studyBackBtn) return;
    const canUse = state.active && state.studyHistory.length > 0;
    studyBackBtn.setAttribute("aria-disabled", canUse ? "false" : "true");
  }

  function updatePlayPauseButtonState() {
    if (!elPlayPauseBtn) return;
    const isPressed = !!(state.active && state.pausedByUser);
    elPlayPauseBtn.setAttribute("aria-pressed", isPressed ? "true" : "false");
    elPlayPauseBtn.textContent = isPressed ? "▶" : "⏸";
    elPlayPauseBtn.title = isPressed ? "Resume game" : "Pause game";
  }

  function pauseByUser() {
    if (!state.active || state.locked || state.pausedByUser || state.instrumentExpanded) return;
    state.pausedByUser = true;
    state.paused = true;
    stopTimerWrapper();
    lockAnswers(state, answerButtons, true);
    slowDownAmbientMusic();
    setStatusNeutral(elStatusPanel, elStatusText, "Paused.");
    updatePlayPauseButtonState();
  }

  function resumeByUser() {
    if (!state.active || !state.pausedByUser || state.instrumentExpanded || state.pausedByStudyBack) return;
    state.pausedByUser = false;
    state.paused = false;
    lockAnswers(state, answerButtons, false);
    speedUpAmbientMusic();
    startTimerWrapper();
    setStatusNeutral(elStatusPanel, elStatusText, "Resumed.");
    updatePlayPauseButtonState();
  }

  function pushStudyHistory(question, questionMode) {
    if (!question) return;
    const snapshot = {
      question: structuredClone(question),
      questionMode
    };
    state.studyHistory.push(snapshot);
    if (state.studyHistory.length > 3) {
      state.studyHistory.shift();
    }
    updateStudyBackButtonState();
  }

  function renderStudySnapshot(snapshot) {
    if (!snapshot?.question) return;

    state.current = structuredClone(snapshot.question);

    const settingsForSnapshot = {
      ...settings,
      questionMode: snapshot.questionMode
    };

    renderQuestion(state, settingsForSnapshot, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES);
    renderAnswers(state, answerButtons);

    const correctValue = getCorrectValueForQuestion(state.current, snapshot.questionMode);
    answerButtons.forEach(btn => {
      if (btn.dataset.note === correctValue) {
        btn.classList.add('correctAnswer');
      }
    });

    lockAnswers(state, answerButtons, true);

    const step = state.studyStepIndex + 1;
    const max = state.studyHistory.length;
    setStatusNeutral(elStatusPanel, elStatusText, `Study Back ${step}/${max}: ${correctValue}`);
  }

  function resumeFromStudyBack() {
    if (!state.active || !state.pausedByStudyBack) return;

    if (state.studyBackupCurrent) {
      state.current = structuredClone(state.studyBackupCurrent);
    }

    state.studyBackupCurrent = null;
    state.studyStepIndex = -1;
    state.pausedByStudyBack = false;
    state.paused = false;

    renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES);
    renderAnswers(state, answerButtons);
    lockAnswers(state, answerButtons, false);
    syncAnswerInputAvailability();
    renderInstrumentVisualization();
    startTimerWrapper();
    setStatusNeutral(elStatusPanel, elStatusText, "Resumed.");
    updateStudyBackButtonState();
  }

  function stepBackStudyQuestion() {
    if (!state.active || !state.studyHistory.length || state.locked) return;

    if (!state.pausedByStudyBack) {
      state.studyBackupCurrent = state.current ? structuredClone(state.current) : null;
      state.studyStepIndex = -1;
      state.pausedByStudyBack = true;
      state.paused = true;
      stopTimerWrapper();
    }

    const lastIndex = state.studyHistory.length - 1;
    if (state.studyStepIndex >= lastIndex) {
      resumeFromStudyBack();
      return;
    }

    state.studyStepIndex += 1;
    const snapshot = state.studyHistory[lastIndex - state.studyStepIndex];
    renderStudySnapshot(snapshot);
  }

  function syncGameActiveClass() {
    document.body.classList.toggle('gameActive', !!state.active);
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
    syncGameActiveClass();
    state.pausedByUser = false;
    state.paused = false;
    state.studyHistory = [];
    state.studyStepIndex = -1;
    state.studyBackupCurrent = null;
    state.pausedByStudyBack = false;
    updateStudyBackButtonState();
    updatePlayPauseButtonState();
    // Speed up ambient music when starting game
    speedUpAmbientMusic();
  };
  
  const nextQuestionWrapper = () => {
    if (state.active && state.current && !state.pausedByStudyBack) {
      pushStudyHistory(state.current, settings.questionMode);
    }

    if (state.pausedByStudyBack) {
      state.studyStepIndex = -1;
      state.studyBackupCurrent = null;
      state.pausedByStudyBack = false;
      state.paused = false;
    }

    state.finishScaleReviewMode = false;
    setReviewNextMenuButtonVisible(false);
    if (elQuestionBox) elQuestionBox.classList.remove("reviewVisible");

    const activeView = getActiveVisualization();
    const result = nextQuestion(
      state, settings, ALL_KEYS, DIATONIC_DEGREES, CHROMATIC_DEGREES, NOTE_TO_PC, MAJOR_SCALE_OFFSETS,
      CHROMATIC_TO_OFFSET, NOTE_LIST, SCALE_TYPES, SCALE_TYPE_NAMES, pcToNote, elQuestionText, elTimerBackground,
      answerButtons, elLevelInfo, activeView.surface, renderQuestion, renderAnswers, renderLevelInfo, startTimerWrapper,
      activeView.update, activeView.highlight, getActiveInstrument()
    );

    applyFinishScaleMentionedHighlight(activeView.surface);
    renderExpandedQuestionOverlay();

    syncAnswerInputAvailability();
    updateStudyBackButtonState();
    return result;
  };
  
  const startTimerWrapper = () => startTimer(
    state, settings, elTimerBackground, updateRiskVisual, soundTick, getVolumeMultiplier, handleTimeoutWrapper, clamp
  );
  
  const stopTimerWrapper = () => stopTimer(state);
  
  const initProgressionModeWrapper = () => initProgressionMode(state, settings, ALL_KEYS);
  
  const endGameWrapper = (message) => {
    endGame(
      state, settings, message, answerButtons, elTimerBackground, elQuestionText, lockAnswers, updateRiskVisual,
      getStats, saveStats, flashStatus, elStatusPanel, elStatusText, soundGameOver, getVolumeMultiplier,
      stopTimerWrapper, stopAmbientMusic, generateCompactSuggestionsWrapper
    );
    syncGameActiveClass();
    state.pausedByUser = false;
    state.paused = false;
    updatePlayPauseButtonState();
    updateStudyBackButtonState();
  };
  
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

  function setReviewNextMenuButtonVisible(visible) {
    const menuRoot = document.querySelector('.triangleMenu');
    if (!menuRoot) return;

    let reviewBtn = document.getElementById('btnNextAfterScaleReviewBar');
    if (!reviewBtn) {
      reviewBtn = document.createElement('button');
      reviewBtn.type = 'button';
      reviewBtn.id = 'btnNextAfterScaleReviewBar';
      reviewBtn.className = 'menuReviewNext';
      reviewBtn.textContent = 'Next';
      reviewBtn.hidden = true;
      reviewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        advanceFromFinishScaleReview();
      });
      menuRoot.appendChild(reviewBtn);
    }

    reviewBtn.hidden = !visible;
  }

  const advanceFromFinishScaleReview = () => {
    const statusOverlayEl = document.getElementById("statusOverlay");
    state.finishScaleReviewMode = false;
    state.locked = false;
    setReviewNextMenuButtonVisible(false);
    if (elQuestionBox) elQuestionBox.classList.remove("reviewVisible");
    if (statusOverlayEl) statusOverlayEl.hidden = true;
    elStatusPanel.hidden = true;
    elStatusPanel.classList.remove("good", "bad");
    const statusSuggestions = document.getElementById("statusSuggestions");
    if (statusSuggestions) {
      statusSuggestions.hidden = true;
      statusSuggestions.innerHTML = "";
    }
    const questionSuggestions = document.getElementById("questionSuggestions");
    if (questionSuggestions) {
      questionSuggestions.hidden = true;
      questionSuggestions.innerHTML = "";
    }
    nextQuestionWrapper();
  };

  const showFinishScaleReview = (chosenNote) => {
    soundWrong(settings, getVolumeMultiplier);

    const responseTime = state.questionStartTime ? (Date.now() - state.questionStartTime) / 1000 : 0;
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
    renderLives(state, elLives);
    updateRiskVisual(state);
    lockAnswers(state, answerButtons, true);
    stopTimerWrapper();

    if (state.lives <= 0) {
      flashStatus(settings, elStatusPanel, elStatusText, false, `Incorrect: ${chosenNote}. Game Over.`);
      setTimeout(() => {
        endGameWrapper("No lives left.");
      }, 5000);
      return;
    }

    state.finishScaleReviewMode = true;
    setReviewNextMenuButtonVisible(true);

    const activeView = getActiveVisualization();
    const visualizeKey = state.current?.targetKeyRoot || state.current?.keyRoot;
    const visualizeScale = state.current?.targetScaleType || state.current?.scaleType || "major";
    const scaleLabel = SCALE_TYPE_NAMES[visualizeScale] || visualizeScale;

    if (activeView.surface && visualizeKey) {
      activeView.update(activeView.surface, visualizeKey, visualizeScale, SCALE_TYPES, NOTE_TO_PC, pcToNote);
      activeView.clear(activeView.surface);
    }

    const statusOverlayEl = document.getElementById("statusOverlay");
    if (statusOverlayEl) statusOverlayEl.hidden = true;
    elStatusPanel.hidden = true;

    const questionSuggestions = document.getElementById("questionSuggestions");
    if (questionSuggestions) {
      if (elQuestionBox) elQuestionBox.classList.add("reviewVisible");
      questionSuggestions.hidden = false;
      questionSuggestions.innerHTML = `
        <div class="practiceSteps">
          <div class="practiceStep">
            <strong>Study Mode:</strong> Incorrect: ${chosenNote}. Study the full ${visualizeKey} ${scaleLabel} scale on the instrument.
          </div>
        </div>
      `;
    }
  };
  
  const onAnswerClickWrapper = (btn) => onAnswerClick(state, btn, handleCorrectWrapper, handleWrongWrapper, settings);

  const onInstrumentAnswer = (chosen, selectedElement = null) => {
    if (!state.active || state.locked || !state.current || !areInstrumentAnswersEnabled()) return;

    if (settings.questionMode === "finishScale" && state.current.finishType === "partial" && Array.isArray(state.current.remainingNotes) && state.current.remainingNotes.length === 0) {
      return;
    }

    const chosenNote = typeof chosen === "string" ? chosen : chosen?.note;
    const chosenOctave = typeof chosen === "object" ? chosen?.octave : undefined;
    const chosenString = typeof chosen === "object"
      ? chosen?.string
      : (selectedElement?.dataset?.string ?? undefined);
    const chosenFret = typeof chosen === "object"
      ? chosen?.fret
      : (selectedElement?.dataset?.fret ?? undefined);
    const chosenPositionToken = (chosenString != null && chosenFret != null)
      ? `${chosenString}|${chosenFret}`
      : null;

    const markWrongWithDelay = () => {
      stopTimerWrapper();
      state.locked = true;
      if (selectedElement) {
        selectedElement.classList.add("wrongSelection");
      }
      setTimeout(() => {
        if (selectedElement) {
          selectedElement.classList.remove("wrongSelection");
        }
        state.locked = false;
        showFinishScaleReview(chosenNote);
      }, 2000);
    };

    if (settings.questionMode === "finishScale" && state.current.finishType === "oddOneOut") {
      const isPianoOddMode = Array.isArray(state.current.shownSteps) && state.current.shownSteps.length > 0;
      const isHighlightedTarget = isPianoOddMode
        ? state.current.shownSteps.some(step => step.note === chosenNote && String(step.octave) === String(chosenOctave))
        : (Array.isArray(state.current.shownNotes) && state.current.shownNotes.includes(chosenNote));

      if (!isHighlightedTarget) {
        return;
      }

      if (state.current.correctStep) {
        const stepMatch = state.current.correctStep.note === chosenNote
          && String(state.current.correctStep.octave) === String(chosenOctave);
        if (stepMatch) handleCorrectWrapper(chosenNote);
        else markWrongWithDelay();
      } else if (chosenNote === state.current.correctNote) {
        handleCorrectWrapper(chosenNote);
      } else {
        markWrongWithDelay();
      }
      return;
    }

    if (settings.questionMode === "finishScale" && state.current.finishType === "compound") {
      const stage = state.current.compoundStage || 1;
      const stageOneAnswer = state.current.compoundFirstNote || state.current.pivotNote;
      const stageTwoAnswer = state.current.compoundSecondNote || state.current.correctNote;

      if (stage === 1) {
        if (chosenNote !== stageOneAnswer) {
          markWrongWithDelay();
          return;
        }

        state.current.compoundStage = 2;
        state.current.correctNote = stageTwoAnswer;
        state.current.correctDegree = state.current.targetDegree || state.current.correctDegree;
        state.current.degreeLabel = state.current.targetDegree || state.current.degreeLabel;

        renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES);
        renderInstrumentVisualization();
        setStatusNeutral(elStatusPanel, elStatusText, "Good! Task 1 complete. Now finish task 2.");
        return;
      }

      if (chosenNote === stageTwoAnswer) handleCorrectWrapper(chosenNote);
      else markWrongWithDelay();
      return;
    }

    if (settings.questionMode === "finishScale" && state.current.finishType === "partial" && Array.isArray(state.current.remainingNotes) && state.current.remainingNotes.length) {
      if (Array.isArray(state.current.shownSteps) && state.current.shownSteps.length && chosenOctave != null) {
        const alreadyShownStep = state.current.shownSteps.some(step => (
          step && step.note === chosenNote && String(step.octave) === String(chosenOctave)
        ));
        if (alreadyShownStep) return;
      } else if (Array.isArray(state.current.shownPositionTokens) && chosenPositionToken) {
        if (state.current.shownPositionTokens.includes(chosenPositionToken)) return;
      } else if (Array.isArray(state.current.shownNotes) && state.current.shownNotes.includes(chosenNote)) {
        return;
      }

      let solvedStep = null;
      let solvedNoteIndex = -1;

      if (Array.isArray(state.current.remainingSteps) && state.current.remainingSteps.length) {
        const stepIndex = state.current.remainingSteps.findIndex(step => (
          step && step.note === chosenNote && (step.octave == null || String(step.octave) === String(chosenOctave))
        ));
        if (stepIndex >= 0) {
          solvedStep = state.current.remainingSteps.splice(stepIndex, 1)[0];
          solvedNoteIndex = stepIndex;
        }
      } else {
        solvedNoteIndex = state.current.remainingNotes.findIndex(note => note === chosenNote);
      }

      if (solvedNoteIndex < 0) {
        markWrongWithDelay();
        return;
      }

      const solvedNote = state.current.remainingNotes.splice(solvedNoteIndex, 1)[0];
      if (!Array.isArray(state.current.shownNotes)) state.current.shownNotes = [];
      state.current.shownNotes.push(solvedNote);
      if (Array.isArray(state.current.shownSteps)) {
        state.current.shownSteps.push(solvedStep || { note: solvedNote });
      } else if (Array.isArray(state.current.shownPositionTokens) && chosenPositionToken) {
        state.current.shownPositionTokens.push(chosenPositionToken);
      }

      if (state.current.remainingNotes.length > 0) {
        const nextNote = state.current.remainingNotes[0];
        state.current.correctNote = nextNote;

        const shownCount = state.current.shownNotes.length;
        const nextDegree = DIATONIC_DEGREES[shownCount] || state.current.correctDegree;
        state.current.correctDegree = nextDegree;
        state.current.degreeLabel = nextDegree;

        renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES);
        renderInstrumentVisualization();
        setStatusNeutral(elStatusPanel, elStatusText, `Good! ${state.current.remainingNotes.length} note${state.current.remainingNotes.length === 1 ? '' : 's'} left.`);
        return;
      }

      state.current.correctNote = solvedNote;
      state.locked = true;
      handleCorrectWrapper(chosenNote);
      return;
    }

    const correct = state.current.correctNote;
    if (chosenNote === correct) handleCorrectWrapper(chosenNote);
    else if (settings.questionMode === "finishScale") markWrongWithDelay();
    else handleWrongWrapper(chosenNote);
  };

  // =========================
  // Settings Modal
  // =========================
  function openSettings() {
    // Close stats modal if open
    statsOverlay.hidden = true;
    
    overlay.hidden = false;
    document.body.classList.add("settingsOpen");

    // Pause the game if it's active
    if (state.active && !state.locked) {
      state.paused = true;
      stopTimerWrapper();
      lockAnswers(state, answerButtons, true);
      // Slow down ambient music when entering settings
      slowDownAmbientMusic();
    }

    secondsSlider.value = String(settings.secondsPerQuestion);
    secondsValue.textContent = settings.secondsPerQuestion === 21 ? `∞` : `${settings.secondsPerQuestion}s`;

    modalDurationSlider.value = String(settings.modalDuration);
    modalDurationValue.textContent = `${(settings.modalDuration / 1000).toFixed(1)}s`;

    updateLayoutTestingUI();

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
    if (modeDegreeToNote && modeNoteToDegree && modeScaleRecognition && modeFinishScale) {
      modeDegreeToNote.setAttribute("aria-checked", settings.questionMode === "degreeToNote" ? "true" : "false");
      modeNoteToDegree.setAttribute("aria-checked", settings.questionMode === "noteToDegree" ? "true" : "false");
      modeScaleRecognition.setAttribute("aria-checked", settings.questionMode === "scaleRecognition" ? "true" : "false");
      modeFinishScale.setAttribute("aria-checked", settings.questionMode === "finishScale" ? "true" : "false");
    }

    renderAnswerInputModeButtons();

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
    document.body.classList.remove("settingsOpen");
    btnSettings.focus();

    // Resume the game if it was paused
    if (state.paused && state.active && !state.instrumentExpanded && !state.pausedByUser && !state.pausedByStudyBack) {
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

  function setAnswerInputMode(mode) {
    if (settings.questionMode === "finishScale") {
      settings.answerInputMode = "instrument";
    } else {
      settings.answerInputMode = mode === "instrument" || mode === "both" ? mode : "choices";
    }
    renderAnswerInputModeButtons();
    renderInstrumentVisualization();
    syncAnswerInputAvailability();
    saveSettingsToStorage(settings);
  }

  function toggleExpandedNotesVisibility() {
    state.expandedNotesVisible = !state.expandedNotesVisible;
    renderInstrumentExpandedState();
  }

  // =========================
  // Wire up events
  // =========================
  answerButtons.forEach(b => b.addEventListener("click", () => onAnswerClickWrapper(b)));

  if (pianoKeyboard) {
    pianoKeyboard.addEventListener("click", (e) => {
      const key = e.target.closest('.pianoKey');
      if (!key?.dataset?.note) return;
      onInstrumentAnswer({ note: key.dataset.note, octave: key.dataset.octave }, key);
    });
  }

  if (guitarFretboard) {
    guitarFretboard.addEventListener("click", (e) => {
      const position = e.target.closest('.guitarPosition');
      if (!position?.dataset?.note) return;
      onInstrumentAnswer({
        note: position.dataset.note,
        string: position.dataset.string,
        fret: position.dataset.fret
      }, position);
    });
  }

  if (bassFretboard) {
    bassFretboard.addEventListener("click", (e) => {
      const position = e.target.closest('.bassPosition');
      if (!position?.dataset?.note) return;
      onInstrumentAnswer({
        note: position.dataset.note,
        string: position.dataset.string,
        fret: position.dataset.fret
      }, position);
    });
  }

  if (studyBackBtn) {
    studyBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (studyBackBtn.getAttribute("aria-disabled") === "true") return;
      soundButtonClick(settings, getVolumeMultiplier);
      stepBackStudyQuestion();
    });
  }

  // Bonus button handler
  if (elBonusButton) {
    elBonusButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering questionBox click
      if (state.bonusPoints >= 5 && !state.bonusActive && state.active && !state.locked) {
        activateBonus();
      }
    });
  }

  if (elPlayPauseBtn) {
    elPlayPauseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.active) return;
      if (state.pausedByUser) resumeByUser();
      else pauseByUser();
    });

    elPlayPauseBtn.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      if (!state.active) return;
      if (state.pausedByUser) resumeByUser();
      else pauseByUser();
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
    document.body.classList.remove("settingsOpen");
    // Slow down music when opening stats
    if (state.active) slowDownAmbientMusic();
    renderStats(getStats);
    statsOverlay.hidden = false;
  });

  if (btnDonate) {
    btnDonate.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      const triangleMenu = document.querySelector('.triangleMenu');
      menuDropdown.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      triangleMenu.classList.remove('active');
      setStatusNeutral(elStatusPanel, elStatusText, "💚 GofundMe placeholder ready (coming soon).");
      elStatusPanel.hidden = false;
    });
  }

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
      if (state.paused && state.active && !state.instrumentExpanded && !state.pausedByUser && !state.pausedByStudyBack) {
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
      if (state.paused && state.active && !state.instrumentExpanded && !state.pausedByUser && !state.pausedByStudyBack) {
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
      if (state.finishScaleReviewMode && state.active) {
        advanceFromFinishScaleReview();
        return;
      }
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
    settings.secondsPerQuestion = clamp(Number(secondsSlider.value), 3, 21);
    secondsValue.textContent = settings.secondsPerQuestion === 21 ? `∞` : `${settings.secondsPerQuestion}s`;
  });

  modalDurationSlider.addEventListener("input", () => {
    settings.modalDuration = clamp(Number(modalDurationSlider.value), 500, 5000);
    modalDurationValue.textContent = `${(settings.modalDuration / 1000).toFixed(1)}s`;
  });

  if (guitarNeckSlider) {
    guitarNeckSlider.addEventListener("input", () => {
      settings.guitarNeckThicknessPercent = clamp(Number(guitarNeckSlider.value), 5, 90);
      normalizeLayoutPercents("guitarNeckThicknessPercent");
      updateLayoutTestingUI();
      applyLayoutTestingVars();
    });
  }

  if (bassNeckSlider) {
    bassNeckSlider.addEventListener("input", () => {
      settings.bassNeckThicknessPercent = clamp(Number(bassNeckSlider.value), 5, 90);
      normalizeLayoutPercents("bassNeckThicknessPercent");
      updateLayoutTestingUI();
      applyLayoutTestingVars();
    });
  }

  if (questionHeightSlider) {
    questionHeightSlider.addEventListener("input", () => {
      settings.questionBoxHeightPercent = clamp(Number(questionHeightSlider.value), 5, 90);
      normalizeLayoutPercents("questionBoxHeightPercent");
      updateLayoutTestingUI();
      applyLayoutTestingVars();
    });
  }

  if (answerHeightSlider) {
    answerHeightSlider.addEventListener("input", () => {
      settings.answerButtonHeightPercent = clamp(Number(answerHeightSlider.value), 5, 90);
      normalizeLayoutPercents("answerButtonHeightPercent");
      updateLayoutTestingUI();
      applyLayoutTestingVars();
    });
  }

  if (notePositionSlider) {
    notePositionSlider.addEventListener("input", () => {
      settings.notePositionSizePercent = clamp(Number(notePositionSlider.value), 50, 200);
      if (notePositionValue) notePositionValue.textContent = `${settings.notePositionSizePercent}%`;
      applyLayoutTestingVars();
    });
  }

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
  const modeFinishScale = document.getElementById("modeFinishScale");
  
  function setQuestionMode(mode) {
    settings.questionMode = mode;
    if (mode === "degreeToNote" && settings.answerInputMode === "choices") {
      settings.answerInputMode = "both";
      renderAnswerInputModeButtons();
    }
    if (mode === "finishScale") {
      settings.answerInputMode = "instrument";
      renderAnswerInputModeButtons();
    }
    modeDegreeToNote.setAttribute("aria-checked", mode === "degreeToNote" ? "true" : "false");
    modeNoteToDegree.setAttribute("aria-checked", mode === "noteToDegree" ? "true" : "false");
    modeScaleRecognition.setAttribute("aria-checked", mode === "scaleRecognition" ? "true" : "false");
    if (modeFinishScale) {
      modeFinishScale.setAttribute("aria-checked", mode === "finishScale" ? "true" : "false");
    }
    renderInstrumentVisualization();
    syncAnswerInputAvailability();
    
    saveSettingsToStorage(settings);
  }

  function setInstrument(instrument) {
    if (["piano", "guitar", "bass"].includes(instrument)) {
      settings.instrument = instrument;
    }
    normalizeLayoutPercents();
    updateLayoutTestingUI();
    applyLayoutTestingVars();
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

  if (instrumentBass) {
    instrumentBass.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrument("bass");
    });
  }

  if (pianoExpandBtn) {
    pianoExpandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrumentExpanded(!state.instrumentExpanded);
    });
  }

  if (pianoNotesBtn) {
    pianoNotesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      toggleExpandedNotesVisibility();
    });
  }

  if (guitarNotesBtn) {
    guitarNotesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      toggleExpandedNotesVisibility();
    });
  }

  if (guitarExpandBtn) {
    guitarExpandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrumentExpanded(!state.instrumentExpanded);
    });
  }

  if (bassExpandBtn) {
    bassExpandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      setInstrumentExpanded(!state.instrumentExpanded);
    });
  }

  if (bassNotesBtn) {
    bassNotesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundDegreeToggle(settings, getVolumeMultiplier);
      toggleExpandedNotesVisibility();
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
  if (modeFinishScale) {
    modeFinishScale.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setQuestionMode("finishScale");
    });
  }

  if (inputChoices) {
    inputChoices.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setAnswerInputMode("choices");
    });
  }
  if (inputInstrument) {
    inputInstrument.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setAnswerInputMode("instrument");
    });
  }
  if (inputBoth) {
    inputBoth.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      setAnswerInputMode("both");
    });
  }

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
      syncAnswerInputAvailability();
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
  renderAnswerInputModeButtons();
  syncAnswerInputAvailability();
  syncGameActiveClass();
  updateStudyBackButtonState();
  updatePlayPauseButtonState();
  
  initScaleToggles(scaleToggles, SCALE_TYPES, SCALE_TYPE_NAMES, settings, saveSettingsToStorage, soundDegreeToggle, getVolumeMultiplier);
  updateRotateHintVisibility();

  if (typeof window !== "undefined") {
    window.addEventListener('resize', () => {
      updateRotateHintVisibility();
      updateResponsiveNoteBaseSizes();
    });
    window.addEventListener('orientationchange', () => {
      updateRotateHintVisibility();
      updateResponsiveNoteBaseSizes();
      setTimeout(updateResponsiveNoteBaseSizes, 120);
    });
  }

  // Splash Screen Logic
  const splashScreen = document.getElementById('splashScreen');
  const appContainer = document.getElementById('app');
  const questionBox = document.getElementById('questionBox');

  if (splashScreen && appContainer) {
    let splashTimeout;
    
    const hideSplash = () => {
      splashScreen.style.opacity = '0';
      setTimeout(() => {
        splashScreen.style.display = 'none';
        appContainer.classList.add('visible');
      }, 1000); // Wait for fade transition
    };

    // Fade out splash screen after 8 seconds
    splashTimeout = setTimeout(hideSplash, 8000);

    // Allow clicking splash screen to skip
    splashScreen.addEventListener('click', () => {
      clearTimeout(splashTimeout);
      hideSplash();
    });
  }

  // Initialize audio context on first interaction with the question box
  if (questionBox) {
    const initAudioOnStart = () => {
      if (!state.active) {
        ensureAudio();
        questionBox.removeEventListener('click', initAudioOnStart);
      }
    };
    questionBox.addEventListener('click', initAudioOnStart);
  }
