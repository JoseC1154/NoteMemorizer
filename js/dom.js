// DOM References Module
export const dom = {
  // Question elements
  elQuestionText: document.getElementById("questionText"),
  elQuestionBox: document.getElementById("questionBox"),
  elRestartHint: document.getElementById("restartHint"),
  elTimer: document.getElementById("timer"),
  elTimerBackground: document.getElementById("timerBackground"),
  elLives: document.getElementById("lives"),
  elScore: document.getElementById("score"),
  elBonusButton: document.getElementById("bonusButton"),
  elBonusCount: document.getElementById("bonusCount"),
  elLevelInfo: document.getElementById("levelInfo"),
  elHeader: document.querySelector(".header"),
  elStatusPanel: document.getElementById("statusPanel"),
  elStatusText: document.getElementById("statusText"),
  elAnswerGrid: document.getElementById("answerGrid"),
  answerButtons: Array.from(document.querySelectorAll(".answerBtn")),
  elMain: document.querySelector(".main"),

  // Menu elements
  menuToggle: document.getElementById("menuToggle"),
  menuDropdown: document.getElementById("menuDropdown"),
  btnSettings: document.getElementById("btnSettings"),
  btnStats: document.getElementById("btnStats"),
  instrumentPiano: document.getElementById("instrumentPiano"),
  instrumentGuitar: document.getElementById("instrumentGuitar"),
  menuBackdrop: document.querySelector(".menuBackdrop"),

  // Settings modal
  overlay: document.getElementById("settingsOverlay"),
  modal: document.getElementById("settingsModal"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
  btnSaveSettings: document.getElementById("btnSaveSettings"),
  btnSetDefault: document.getElementById("btnSetDefault"),

  // Stats modal
  statsOverlay: document.getElementById("statsOverlay"),
  statsModal: document.getElementById("statsModal"),
  btnCloseStats: document.getElementById("btnCloseStats"),
  btnClearStats: document.getElementById("btnClearStats"),

  // Confirm modal
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmModal: document.getElementById("confirmModal"),
  confirmMessage: document.getElementById("confirmMessage"),
  btnConfirmRestart: document.getElementById("btnConfirmRestart"),
  btnCancelRestart: document.getElementById("btnCancelRestart"),

  // Settings controls
  keyToggles: document.getElementById("keyToggles"),
  degreeToggles: document.getElementById("degreeToggles"),
  secondsSlider: document.getElementById("secondsSlider"),
  secondsValue: document.getElementById("secondsValue"),
  modalDurationSlider: document.getElementById("modalDurationSlider"),
  modalDurationValue: document.getElementById("modalDurationValue"),

  // Audio mixer controls
  volPadSlider: document.getElementById("volPad"),
  volPadValue: document.getElementById("volPadValue"),
  volArpeggioSlider: document.getElementById("volArpeggio"),
  volArpeggioValue: document.getElementById("volArpeggioValue"),
  volTickSlider: document.getElementById("volTick"),
  volTickValue: document.getElementById("volTickValue"),
  volCorrectSlider: document.getElementById("volCorrect"),
  volCorrectValue: document.getElementById("volCorrectValue"),
  volWrongSlider: document.getElementById("volWrong"),
  volWrongValue: document.getElementById("volWrongValue"),
  volButtonSlider: document.getElementById("volButton"),
  volButtonValue: document.getElementById("volButtonValue"),
  volBonusSlider: document.getElementById("volBonus"),
  volBonusValue: document.getElementById("volBonusValue"),
  volGameOverSlider: document.getElementById("volGameOver"),
  volGameOverValue: document.getElementById("volGameOverValue"),

  // Game mode controls
  modePractice: document.getElementById("modePractice"),
  modeProgression: document.getElementById("modeProgression"),
  difficultyEasy: document.getElementById("difficultyEasy"),
  difficultyModerate: document.getElementById("difficultyModerate"),
  difficultyHard: document.getElementById("difficultyHard"),
  progressionDifficultySection: document.getElementById("progressionDifficultySection"),
  keysToMasterSection: document.getElementById("keysToMasterSection"),
  degreeModeSection: document.getElementById("degreeModeSection"),
  modeDiatonic: document.getElementById("modeDiatonic"),
  modeChromatic: document.getElementById("modeChromatic"),

  // Audio toggles
  toggleSound: document.getElementById("toggleSound"),
  toggleTick: document.getElementById("toggleTick"),
  toggleAmbient: document.getElementById("toggleAmbient"),

  // Piano visualization
  pianoContainer: document.getElementById("pianoContainer"),
  pianoKeyboard: document.getElementById("pianoKeyboard"),
  pianoExpandBtn: document.getElementById("pianoExpandBtn"),
  guitarContainer: document.getElementById("guitarContainer"),
  guitarFretboard: document.getElementById("guitarFretboard"),
  guitarExpandBtn: document.getElementById("guitarExpandBtn"),
  scaleToggles: document.getElementById("scaleToggles"),
  scaleTypeSection: document.getElementById("scaleTypeSection")
};
