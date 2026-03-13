// Game logic and question generation
// Cache buster: v1.1.2

export function degreeToNote(
  keyRoot,
  degreeLabel,
  degreeMode,
  scaleType,
  NOTE_TO_PC,
  MAJOR_SCALE_OFFSETS,
  SCALE_TYPES,
  DIATONIC_DEGREES,
  CHROMATIC_TO_OFFSET,
  pcToNote
) {
  const rootPc = NOTE_TO_PC.get(keyRoot);
  if (rootPc == null) throw new Error("Unknown key root");

  if (degreeMode === "diatonic") {
    const idx = DIATONIC_DEGREES.indexOf(degreeLabel);
    if (idx < 0) throw new Error("Unknown diatonic degree");
    const scaleOffsets = SCALE_TYPES[scaleType] || MAJOR_SCALE_OFFSETS;
    const degreeOffset = scaleOffsets[idx];
    if (typeof degreeOffset !== "number") throw new Error("Unknown diatonic degree offset");
    return pcToNote(rootPc + degreeOffset);
  }

  const off = CHROMATIC_TO_OFFSET[degreeLabel];
  if (typeof off !== "number") throw new Error("Unknown chromatic degree");
  return pcToNote(rootPc + off);
}

// New function: Find what degree a note is in a given key
export function noteToDegree(note, keyRoot, degreeMode, scaleType, NOTE_TO_PC, SCALE_TYPES, DIATONIC_DEGREES, CHROMATIC_DEGREES, CHROMATIC_TO_OFFSET, pcToNote) {
  const rootPc = NOTE_TO_PC.get(keyRoot);
  const notePc = NOTE_TO_PC.get(note);
  if (rootPc == null || notePc == null) throw new Error("Unknown key or note");
  
  // Calculate semitone distance from root
  const semitones = ((notePc - rootPc) + 12) % 12;
  
  if (degreeMode === "diatonic") {
    // For diatonic mode with scale types
    const scaleOffsets = SCALE_TYPES[scaleType];
    const degreeIndex = scaleOffsets.indexOf(semitones);
    if (degreeIndex < 0) return null; // Note not in this scale
    return DIATONIC_DEGREES[degreeIndex];
  } else {
    // For chromatic mode, find the degree label
    for (const [degree, offset] of Object.entries(CHROMATIC_TO_OFFSET)) {
      if (offset === semitones) {
        return degree;
      }
    }
    return null;
  }
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildOptions(correct, NOTE_LIST) {
  const pool = NOTE_LIST.filter(n => n !== correct);
  shuffle(pool);
  return shuffle([correct, ...pool.slice(0, 5)]);
}

export function buildOptionsForMode(
  correct,
  degreeMode,
  keyRoot,
  scaleType,
  NOTE_TO_PC,
  MAJOR_SCALE_OFFSETS,
  SCALE_TYPES,
  NOTE_LIST,
  pcToNote
) {
  if (degreeMode === "diatonic") {
    // For diatonic: use 6 notes from the scale, ensuring correct note is included
    const rootPc = NOTE_TO_PC.get(keyRoot);
    const scaleOffsets = SCALE_TYPES[scaleType] || MAJOR_SCALE_OFFSETS;
    const scaleNotes = scaleOffsets.map(offset => pcToNote(rootPc + offset));
    
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

export function stopTimer(state) {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

export function getEffectiveSecondsPerQuestion(settings, state, clamp) {
  if (settings.secondsPerQuestion === 21) {
    return Infinity;
  }
  // After 20 correct streak, drop by 1 second (persists). Every additional 20 streak drops another second.
  const baseSeconds = clamp(settings.secondsPerQuestion - state.speedLevel, 3, 20);
  // Double the time if bonus is active
  return state.bonusActive ? baseSeconds * 2 : baseSeconds;
}

export function startTimer(state, settings, elTimerBackground, updateRiskVisual, soundTick, getVolumeMultiplier, handleTimeout, clamp) {
  stopTimer(state);

  state.questionSeconds = getEffectiveSecondsPerQuestion(settings, state, clamp);
  state.secondsLeft = state.questionSeconds;
  state.questionStartTime = Date.now(); // Start timing response
  if (elTimerBackground) elTimerBackground.textContent = state.secondsLeft === Infinity ? "∞" : String(state.secondsLeft);
  updateRiskVisual(state);
  

  state.timerId = setInterval(() => {
    if (!state.active || state.locked) return;

    if (state.secondsLeft !== Infinity) {
      state.secondsLeft -= 1;
    }
    if (elTimerBackground) elTimerBackground.textContent = state.secondsLeft === Infinity ? "∞" : String(state.secondsLeft);
    updateRiskVisual(state);

    if (state.secondsLeft > 0 && state.secondsLeft !== Infinity) soundTick(settings, getVolumeMultiplier, state);

    if (state.secondsLeft <= 0) {
      stopTimer(state);
      handleTimeout();
    }
  }, 1000);
}

export function getProgressionStreakRequired(settings) {
  switch (settings.progressionDifficulty) {
    case "easy": return 15;
    case "hard": return 45;
    default: return 30; // moderate
  }
}

export function initProgressionMode(state, settings, ALL_KEYS) {
  const enabledKeys = settings.keysEnabled.length ? settings.keysEnabled : [...ALL_KEYS];
  const shuffledKeys = shuffle([...enabledKeys]);
  
  state.progression.level = 1;
  state.progression.currentKey = shuffledKeys[0];
  state.progression.currentMode = "diatonic";
  state.progression.remainingKeys = shuffledKeys.slice(1);
  state.progression.levelStreak = 0;
}

export function advanceProgressionLevel(state, settings, flashStatus, elStatusPanel, elStatusText, renderLevelInfo, elLevelInfo, endGame) {
  // Show victory message
  const currentLevelDesc = `${state.progression.currentKey} ${state.progression.currentMode === "diatonic" ? "Diatonic" : "Chromatic"}`;
  flashStatus(settings, elStatusPanel, elStatusText, true, `🎉 Level ${state.progression.level} Complete! ${currentLevelDesc} Mastered!`);

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
  renderLevelInfo(state, settings, elLevelInfo);
  
  return true;
}

export function nextQuestion(
  state,
  settings,
  ALL_KEYS,
  DIATONIC_DEGREES,
  CHROMATIC_DEGREES,
  NOTE_TO_PC,
  MAJOR_SCALE_OFFSETS,
  CHROMATIC_TO_OFFSET,
  NOTE_LIST,
  SCALE_TYPES,
  CHORD_TYPES,
  SCALE_TYPE_NAMES,
  CHORD_TYPE_NAMES,
  pcToNote,
  elQuestionText,
  elTimerBackground,
  answerButtons,
  elLevelInfo,
  pianoKeyboard,
  renderQuestion,
  renderAnswers,
  renderLevelInfo,
  startTimerFn,
  updatePianoVisualization,
  highlightQuestionNote,
  activeInstrument = "piano"
) {
  state.questionIndex += 1;
  
  let keyRoot, degreePool, degreeMode;

  if (settings.gameMode === "progression") {
    // Use fixed key and mode from progression state
    keyRoot = state.progression.currentKey;
    degreeMode = state.progression.currentMode;
    
    // Safety check: if progression key is null, reinitialize
    if (!keyRoot) {
      console.warn("Progression mode had null key, reinitializing...");
      initProgressionMode(state, settings, ALL_KEYS);
      keyRoot = state.progression.currentKey;
      degreeMode = state.progression.currentMode;
    }
  } else {
    // Practice mode: random
    const enabledKeys = settings.keysEnabled.length ? settings.keysEnabled : [...ALL_KEYS];
    keyRoot = pickRandom(enabledKeys);
    degreeMode = settings.degreeMode;
  }

  degreePool = degreeMode === "diatonic" ? DIATONIC_DEGREES : CHROMATIC_DEGREES;
  
  // Safety check: ensure we have a valid key
  if (!keyRoot) {
    console.error("Failed to get valid keyRoot, falling back to C");
    keyRoot = "C";
  }
  
  // Filter by enabled degrees
  const enabledDegrees = settings.degreesEnabled.length ? settings.degreesEnabled : degreePool;
  const availableDegrees = degreePool.filter(d => enabledDegrees.includes(d));
  let degreeLabel = pickRandom(availableDegrees.length ? availableDegrees : degreePool);
  
  let correctNote, correctDegree, options, scaleType = null, questionNote = null;
  let finishType = null;
  let shownNotes = null;
  let hintNote = null;
  let sourceKeyRoot = null;
  let targetKeyRoot = null;
  let targetDegree = null;
  let targetScaleType = null;
  let pivotDegree = null;
  let pivotNote = null;
  let remainingNotes = null;
  let shownSteps = null;
  let remainingSteps = null;
  let shownPositionTokens = null;
  let hintStep = null;
  let totalSteps = 7;
  let enforceOrder = false;
  let correctStep = null;
  let compoundStage = null;
  let compoundFirstNote = null;
  let compoundSecondNote = null;
  let compoundFirstDegree = null;
  
  // Determine question type based on questionMode setting
  const isScaleRecognition = settings.questionMode === "scaleRecognition";
  const isNoteToDegree = settings.questionMode === "noteToDegree";
  const isFinishScale = settings.questionMode === "finishScale";
  const isChordBuilder = settings.questionMode === "chordBuilder";
  
  if (isChordBuilder) {
    const availableChordTypes = settings.chordTypesEnabled?.length
      ? settings.chordTypesEnabled.filter(chordType => CHORD_TYPES[chordType])
      : ["majorTriad"];
    const chordType = pickRandom(availableChordTypes.length ? availableChordTypes : ["majorTriad"]);
    const chordOffsets = CHORD_TYPES[chordType] || [0, 4, 7];
    const rootPc = NOTE_TO_PC.get(keyRoot);
    const chordNotes = Array.from(new Set(chordOffsets.map(offset => pcToNote(rootPc + offset))));

    const remainingNotesForQuestion = [...chordNotes];
    const selectedNotes = [];
    correctNote = remainingNotesForQuestion[0];
    correctDegree = chordType;
    degreeLabel = `chord:${chordType}`;

    const distractors = NOTE_LIST.filter(note => !chordNotes.includes(note));
    shuffle(distractors);
    options = shuffle([...chordNotes, ...distractors.slice(0, Math.max(0, 6 - chordNotes.length))]).slice(0, 6);

    state.current = {
      keyRoot,
      degreeLabel,
      correctNote,
      correctDegree,
      options,
      scaleType: null,
      questionNote: null,
      finishType: null,
      shownNotes: null,
      hintNote: null,
      sourceKeyRoot: null,
      targetKeyRoot: null,
      targetDegree: null,
      targetScaleType: null,
      pivotDegree: null,
      pivotNote: null,
      remainingNotes: remainingNotesForQuestion,
      shownSteps: null,
      remainingSteps: null,
      shownPositionTokens: null,
      hintStep: null,
      totalSteps: chordNotes.length,
      enforceOrder: false,
      correctStep: null,
      compoundStage: null,
      compoundFirstNote: null,
      compoundSecondNote: null,
      compoundFirstDegree: null,
      chordType,
      chordNotes,
      selectedNotes
    };

    renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES, CHORD_TYPE_NAMES);
    renderAnswers(state, answerButtons);
    renderLevelInfo(state, settings, elLevelInfo);
    startTimerFn();
    return;
  }

  if (isFinishScale) {
    const availableScales = settings.scaleTypesEnabled.length ? settings.scaleTypesEnabled : ["major"];
    scaleType = pickRandom(availableScales);

    const rootPc = NOTE_TO_PC.get(keyRoot);
    const scaleOffsets = SCALE_TYPES[scaleType] || MAJOR_SCALE_OFFSETS;
    const scaleNotes = scaleOffsets.map(offset => pcToNote(rootPc + offset));

    const questionRoll = Math.random();
    const isOddOneOut = questionRoll < 0.30;
    const isCompound = !isOddOneOut && questionRoll < 0.55;

    if (isOddOneOut) {
      finishType = "oddOneOut";

      const intruderNote = pickRandom(NOTE_LIST.filter(note => !scaleNotes.includes(note)));
      correctNote = intruderNote;

      if (activeInstrument === "piano") {
        const inScalePool = shuffle([...scaleNotes]).slice(0, 5);
        shownSteps = shuffle([
          ...inScalePool.map(note => ({ note, octave: 0 })),
          { note: intruderNote, octave: 0 }
        ]);
        shownNotes = shownSteps.map(step => step.note);
        correctStep = { note: intruderNote, octave: 0 };
      } else {
        const inScalePool = shuffle([...scaleNotes]).slice(0, 5);
        shownNotes = shuffle([...inScalePool, intruderNote]);
      }

      totalSteps = Array.isArray(shownNotes) ? shownNotes.length : 6;
      correctDegree = null;
      degreeLabel = "odd-note-out";

      const distractors = NOTE_LIST.filter(n => n !== correctNote).slice(0, 5);
      options = shuffle([correctNote, ...distractors]);
    } else if (isCompound) {
      finishType = "compound";
      sourceKeyRoot = keyRoot;
      pivotDegree = pickRandom(["2", "3", "4", "5", "6"]);
      const pivotIndex = DIATONIC_DEGREES.indexOf(pivotDegree);
      pivotNote = scaleNotes[pivotIndex];

      compoundStage = 1;
      compoundFirstDegree = pivotDegree;
      compoundFirstNote = pivotNote;

      targetKeyRoot = pivotNote;
      targetScaleType = scaleType;
      targetDegree = "6";
      keyRoot = targetKeyRoot;

      const targetRootPc = NOTE_TO_PC.get(targetKeyRoot);
      const targetScaleOffsets = SCALE_TYPES[targetScaleType] || MAJOR_SCALE_OFFSETS;
      const targetScaleNotes = targetScaleOffsets.map(offset => pcToNote(targetRootPc + offset));

      correctDegree = targetDegree;
      degreeLabel = targetDegree;
  compoundSecondNote = targetScaleNotes[5];
  correctNote = compoundFirstNote;

      const inScaleDistractors = targetScaleNotes.filter(n => n !== correctNote);
      const outOfScaleDistractors = NOTE_LIST.filter(n => !targetScaleNotes.includes(n));
      const distractors = shuffle([...inScaleDistractors, ...outOfScaleDistractors]).slice(0, 5);
      options = shuffle([correctNote, ...distractors]);
    } else {
      finishType = "partial";
      enforceOrder = false;
      const shownCount = Math.random() < 0.5 ? 3 : 4;

      if (activeInstrument === "piano") {
        const fullSteps = [];
        for (let octave = 0; octave < 2; octave++) {
          scaleNotes.forEach(note => {
            fullSteps.push({ note, octave });
          });
        }

        shownSteps = fullSteps.slice(0, shownCount);
        remainingSteps = fullSteps.slice(shownCount);
        shownNotes = shownSteps.map(step => step.note);
        remainingNotes = remainingSteps.map(step => step.note);
        totalSteps = fullSteps.length;

        if (shownCount === 3 && remainingSteps.length > 1) {
          hintStep = pickRandom(remainingSteps.slice(1));
          hintNote = hintStep.note;
          questionNote = hintNote;
        }

        correctDegree = DIATONIC_DEGREES[shownCount % 7] || "1";
        degreeLabel = correctDegree;
        correctNote = remainingSteps[0]?.note || scaleNotes[0];
      } else {
        shownNotes = scaleNotes.slice(0, shownCount);
        const hiddenNotes = scaleNotes.slice(shownCount);
        remainingNotes = [...hiddenNotes];
        shownPositionTokens = [];
        totalSteps = scaleNotes.length;

        if (shownCount === 3 && hiddenNotes.length > 1) {
          hintNote = pickRandom(hiddenNotes.slice(1));
          questionNote = hintNote;
        }

        correctDegree = DIATONIC_DEGREES[shownCount];
        degreeLabel = correctDegree;
        correctNote = remainingNotes[0];
      }

      const inScaleDistractors = scaleNotes.filter(n => n !== correctNote);
      const outOfScaleDistractors = NOTE_LIST.filter(n => !scaleNotes.includes(n));
      const distractors = shuffle([...inScaleDistractors, ...outOfScaleDistractors]).slice(0, 5);
      options = shuffle([correctNote, ...distractors]);
    }
  } else if (isScaleRecognition) {
    // Scale recognition mode: show piano, ask "What scale is this?"
    const availableScales = settings.scaleTypesEnabled.length ? settings.scaleTypesEnabled : Object.keys(SCALE_TYPES);
    scaleType = pickRandom(availableScales);
    // In scale recognition mode, the correct answer is the KEY
    correctNote = keyRoot;
    correctDegree = null;
    // Options are all 12 keys
    options = buildOptions(correctNote, NOTE_LIST);
  } else if (isNoteToDegree) {
    // Note to Degree mode: "Eb is what degree in the Db major scale?"
    // First pick a scale type (for more interesting questions)
    const availableScales = settings.scaleTypesEnabled.length ? settings.scaleTypesEnabled : ["major"];
    scaleType = pickRandom(availableScales);
    
    // Pick a note that matches enabled degree filters
    const rootPc = NOTE_TO_PC.get(keyRoot);
    const scaleOffsets = SCALE_TYPES[scaleType];
    let candidateDegrees = availableDegrees.length ? [...availableDegrees] : [...degreePool];

    if (degreeMode === "diatonic") {
      candidateDegrees = candidateDegrees.filter(d => DIATONIC_DEGREES.includes(d));
      if (!candidateDegrees.length) {
        candidateDegrees = [...DIATONIC_DEGREES];
      }

      correctDegree = pickRandom(candidateDegrees);
      const degreeIndex = DIATONIC_DEGREES.indexOf(correctDegree);
      const degreeOffset = scaleOffsets[Math.max(0, degreeIndex)];
      questionNote = pcToNote(rootPc + degreeOffset);
    } else {
      // In chromatic mode, only use enabled degrees that are present in this scale
      candidateDegrees = candidateDegrees.filter(d => {
        const off = CHROMATIC_TO_OFFSET[d];
        return typeof off === "number" && scaleOffsets.includes(off);
      });

      if (!candidateDegrees.length) {
        candidateDegrees = CHROMATIC_DEGREES.filter(d => {
          const off = CHROMATIC_TO_OFFSET[d];
          return typeof off === "number" && scaleOffsets.includes(off);
        });
      }

      correctDegree = pickRandom(candidateDegrees);
      const degreeOffset = CHROMATIC_TO_OFFSET[correctDegree];
      questionNote = pcToNote(rootPc + degreeOffset);
    }

    correctNote = questionNote; // For stats tracking
    
    // Generate degree options
    options = shuffle([...degreePool]).slice(0, 6);
    if (!options.includes(correctDegree)) {
      options[0] = correctDegree;
      shuffle(options);
    }
  } else {
    // Normal degree to note mode: "What is the 3 in the key of C major?"
    const availableScales = settings.scaleTypesEnabled.length ? settings.scaleTypesEnabled : ["major"];
    scaleType = pickRandom(availableScales);
    correctNote = degreeToNote(
      keyRoot,
      degreeLabel,
      degreeMode,
      scaleType,
      NOTE_TO_PC,
      MAJOR_SCALE_OFFSETS,
      SCALE_TYPES,
      DIATONIC_DEGREES,
      CHROMATIC_TO_OFFSET,
      pcToNote
    );
    correctDegree = degreeLabel;
    options = buildOptionsForMode(
      correctNote,
      degreeMode,
      keyRoot,
      scaleType,
      NOTE_TO_PC,
      MAJOR_SCALE_OFFSETS,
      SCALE_TYPES,
      NOTE_LIST,
      pcToNote
    );
  }
  
  state.current = {
    keyRoot,
    degreeLabel,
    correctNote,
    correctDegree,
    options,
    scaleType,
    questionNote,
    finishType,
    shownNotes,
    hintNote,
    sourceKeyRoot,
    targetKeyRoot,
    targetDegree,
    targetScaleType,
    pivotDegree,
    pivotNote,
    remainingNotes,
    shownSteps,
    remainingSteps,
    shownPositionTokens,
    hintStep,
    totalSteps,
    enforceOrder,
    correctStep,
    compoundStage,
    compoundFirstNote,
    compoundSecondNote,
    compoundFirstDegree
  };
  
  // Update piano visualization if in scale recognition mode
  if (isScaleRecognition && scaleType) {
    updatePianoVisualization(pianoKeyboard, keyRoot, scaleType, SCALE_TYPES, NOTE_TO_PC, pcToNote);
  } else if (isFinishScale && scaleType) {
    const visualizeKey = state.current.targetKeyRoot || keyRoot;
    const visualizeScale = state.current.targetScaleType || scaleType;
    updatePianoVisualization(pianoKeyboard, visualizeKey, visualizeScale, SCALE_TYPES, NOTE_TO_PC, pcToNote);
    if (questionNote) {
      highlightQuestionNote(pianoKeyboard, questionNote);
    }
  } else if (isNoteToDegree && scaleType && questionNote) {
    // Show piano for note-to-degree mode and highlight the question note
    updatePianoVisualization(pianoKeyboard, keyRoot, scaleType, SCALE_TYPES, NOTE_TO_PC, pcToNote);
    highlightQuestionNote(pianoKeyboard, questionNote);
  }
  
  renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES, CHORD_TYPE_NAMES);
  renderAnswers(state, answerButtons);
  renderLevelInfo(state, settings, elLevelInfo);
  startTimerFn();
}

export function startGame(
  state,
  settings,
  elStatusPanel,
  elLives,
  elScore,
  elBonusCount,
  elBonusButton,
  elLevelInfo,
  elStatusText,
  answerButtons,
  ensureAudio,
  startAmbientMusic,
  getVolumeMultiplier,
  renderLives,
  renderScore,
  renderBonus,
  renderLevelInfo,
  setStatusNeutral,
  updateRiskVisual,
  nextQuestionFn,
  initProgressionModeFn,
  ALL_KEYS
) {
  ensureAudio();
  startAmbientMusic(settings, getVolumeMultiplier);
  const elQuestionBox = document.getElementById("questionBox");

  // Close game over modal if it's showing
  const elStatusOverlay = document.getElementById("statusOverlay");
  if (elStatusPanel && elStatusOverlay) {
    elStatusPanel.hidden = true;
    elStatusOverlay.hidden = true;
    elStatusPanel.classList.remove("good", "bad", "gameOver");
  }
  document.body.classList.remove("gameOverVisible");
  if (elQuestionBox) {
    elQuestionBox.classList.remove("gameOverLayout");
  }
  
  // Hide suggestions in question box
  const questionSuggestions = document.getElementById("questionSuggestions");
  if (questionSuggestions) {
    questionSuggestions.hidden = true;
    questionSuggestions.innerHTML = "";
  }
  
  // Restore opacity to all elements
  const elAnswerGrid = document.getElementById("answerGrid");
  const pianoContainer = document.getElementById("pianoContainer");
  const guitarContainer = document.getElementById("guitarContainer");
  if (elAnswerGrid) elAnswerGrid.style.opacity = '1';
  if (pianoContainer) pianoContainer.style.opacity = '1';
  if (guitarContainer) guitarContainer.style.opacity = '1';
  if (elBonusButton) elBonusButton.style.opacity = '1';

  state.active = true;
  state.locked = false;

  state.questionIndex = 0;
  state.streak = 0;
  state.speedLevel = 0;
  state.score = 0;
  state.bonusPoints = 0;
  state.bonusActive = false;
  state.bonusTimeRemaining = 0;
  if (state.bonusTimerId) {
    clearInterval(state.bonusTimerId);
    state.bonusTimerId = null;
  }

  // Start with 3 lives (matches the original "3 tries" feeling, now used for endless mode)
  state.lives = 3;
  state.maxLives = 3;

  // Initialize progression mode if needed
  if (settings.gameMode === "progression") {
    initProgressionModeFn(state, settings, ALL_KEYS);
  }

  state.current = null;
  renderLives(state, elLives);
  renderScore(state, elScore);
  renderBonus(state, elBonusCount, elBonusButton);
  renderLevelInfo(state, settings, elLevelInfo);
  
  // Update restart hint
  const elRestartHint = document.getElementById("restartHint");
  if (elRestartHint) {
    elRestartHint.textContent = settings.gameMode === "progression" 
      ? "Press to restart from level 1"
      : "Press to restart";
  }
  
  setStatusNeutral(elStatusPanel, elStatusText, "Ready.");
  updateRiskVisual(state);
  
  nextQuestionFn();
}

export function generateCompactSuggestions(getStats) {
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

export function endGame(state, settings, message, answerButtons, elTimerBackground, elQuestionText, lockAnswers, updateRiskVisual, getStats, saveStats, flashStatus, elStatusPanel, elStatusText, soundGameOver, getVolumeMultiplier, stopTimerFn, stopAmbientMusic, generateCompactSuggestionsFn) {
  state.active = false;
  state.current = null;
  stopTimerFn(state);
  stopAmbientMusic();
  soundGameOver(settings, getVolumeMultiplier);
  lockAnswers(state, answerButtons, true);
  if (elTimerBackground) elTimerBackground.textContent = "";
  updateRiskVisual(state);
  
  // Update high score if needed
  const stats = getStats();
  if (state.score > stats.highScore) {
    stats.highScore = state.score;
    saveStats(stats);
  }
  
  // Hide everything except question box
  const elAnswerGrid = document.getElementById("answerGrid");
  const pianoContainer = document.getElementById("pianoContainer");
  const guitarContainer = document.getElementById("guitarContainer");
  const elBonusButton = document.getElementById("bonusButton");
  if (elAnswerGrid) elAnswerGrid.style.opacity = '0.2';
  if (pianoContainer) pianoContainer.style.opacity = '0.2';
  if (guitarContainer) guitarContainer.style.opacity = '0.2';
  if (elBonusButton) elBonusButton.style.opacity = '0.2';
  
  // Show game over in status panel
  if (elStatusPanel) {
    elStatusPanel.classList.add("gameOver");
  }
  document.body.classList.add("gameOverVisible");
  const elQuestionBox = document.getElementById("questionBox");
  if (elQuestionBox) {
    elQuestionBox.classList.add("gameOverLayout");
  }
  flashStatus(settings, elStatusPanel, elStatusText, false, `${message} — Final Score: ${state.score}`);
  
  // Show suggestions in question box
  elQuestionText.textContent = "Game Over. Press New to try again.";
  const questionSuggestions = document.getElementById("questionSuggestions");
  if (questionSuggestions) {
    const suggestions = generateCompactSuggestionsFn(getStats);
    questionSuggestions.innerHTML = suggestions;
    questionSuggestions.hidden = false;
  }
}

export function nextAfterFeedback(state, settings, answerButtons, lockAnswers, nextQuestionFn, delayMs) {
  const effectiveDelay = Math.max(0, delayMs ?? settings.modalDuration) + 100;
  setTimeout(() => {
    if (!state.active) return;
    // Clear answer feedback markers before the next question
    answerButtons.forEach(btn => btn.classList.remove('correctAnswer', 'wrongSelection'));
    lockAnswers(state, answerButtons, false);
    nextQuestionFn();
  }, effectiveDelay);
}

export function handleCorrect(
  state,
  settings,
  chosen,
  selectedButton,
  answerButtons,
  elLives,
  elScore,
  elBonusCount,
  elBonusButton,
  elStatusPanel,
  elStatusText,
  elLevelInfo,
  soundCorrect,
  getVolumeMultiplier,
  recordQuestion,
  renderBonus,
  renderScore,
  renderLives,
  updateRiskVisual,
  flashStatus,
  lockAnswers,
  stopTimerFn,
  nextAfterFeedbackFn,
  getProgressionStreakRequiredFn,
  advanceProgressionLevelFn,
  renderLevelInfo
) {
  soundCorrect(settings, getVolumeMultiplier);
  
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
  
  // Award bonus points every 5 streak
  let bonusAwarded = false;
  if (state.streak > 0 && state.streak % 5 === 0) {
    state.bonusPoints += 5;
    bonusAwarded = true;
    renderBonus(state, elBonusCount, elBonusButton);
  }
  
  // Calculate score: base points + streak bonus + speed bonus
  const basePoints = 100;
  const streakBonus = state.streak * 10;
  const speedBonus = state.questionSeconds === Infinity ? 0 : Math.max(0, (state.questionSeconds - state.secondsLeft) * 5);
  const pointsEarned = basePoints + streakBonus + speedBonus;
  
  state.score += pointsEarned;
  renderScore(state, elScore);

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
    renderLives(state, elLives);
  }

  // After 20 correct answers total, give extra life AND speed up
  let rewardAt20 = false;
  if (state.questionIndex > 0 && state.questionIndex % 20 === 0) {
    state.speedLevel += 1;
    state.lives += 1;
    state.maxLives = Math.max(state.maxLives, state.lives);
    rewardAt20 = true;
    renderLives(state, elLives);
  }

  updateRiskVisual(state);

  if (selectedButton) {
    selectedButton.classList.add('correctSelection');
  }

  const correctValue = settings.questionMode === "noteToDegree"
    ? state.current.correctDegree
    : state.current.correctNote;

  answerButtons.forEach(btn => {
    if (btn.dataset.note === correctValue) {
      btn.classList.add('correctAnswer');
    }
  });

  // Check for progression level advancement
  const streakRequired = getProgressionStreakRequiredFn(settings);
  if (settings.gameMode === "progression" && state.progression.levelStreak >= streakRequired) {
    lockAnswers(state, answerButtons, true);
    stopTimerFn(state);
    const canContinue = advanceProgressionLevelFn(state, settings, flashStatus, elStatusPanel, elStatusText, renderLevelInfo, elLevelInfo);
    if (canContinue) {
      nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers);
    }
    return;
  }

  const shouldUseStatusModal = rewardAt20 || awardedLife || bonusAwarded;

  if (rewardAt20) {
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} — 🎉 20 correct! +1 life & Speed up! (Score: ${state.score})`);
  } else if (awardedLife) {
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} — +1 life! (Score: ${state.score})`);
  } else if (bonusAwarded) {
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} — ⏳ +5 Bonus! (Streak: ${state.streak}) — Score: ${state.score}`);
  }

  lockAnswers(state, answerButtons, true);
  stopTimerFn(state);
  nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers, shouldUseStatusModal ? undefined : 450);
}

export function handleWrong(
  state,
  settings,
  chosen,
  selectedButton,
  answerButtons,
  elLives,
  elStatusPanel,
  elStatusText,
  soundWrong,
  getVolumeMultiplier,
  recordQuestion,
  renderLives,
  updateRiskVisual,
  flashStatus,
  lockAnswers,
  stopTimerFn,
  nextAfterFeedbackFn,
  endGameFn
) {
  soundWrong(settings, getVolumeMultiplier);
  
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
  renderLives(state, elLives);
  updateRiskVisual(state);

  const correctValue = settings.questionMode === "noteToDegree"
    ? state.current.correctDegree
    : state.current.correctNote;

  // Highlight the correct answer
  answerButtons.forEach(btn => {
    if (btn.dataset.note === correctValue) {
      btn.classList.add('correctAnswer');
    }
  });

  if (selectedButton && selectedButton.dataset.note !== correctValue) {
    selectedButton.classList.add('wrongSelection');
  }

  if (state.lives <= 0) {
    flashStatus(settings, elStatusPanel, elStatusText, false, `The correct answer is ${correctValue}. Game Over.`);
    lockAnswers(state, answerButtons, true);
    stopTimerFn(state);
    setTimeout(() => {
      endGameFn("No lives left.");
    }, 5000);
    return;
  }

  lockAnswers(state, answerButtons, true);
  stopTimerFn(state);
  nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers, 650);
}

export function handleTimeout(
  state,
  settings,
  answerButtons,
  elLives,
  elStatusPanel,
  elStatusText,
  soundWrong,
  getVolumeMultiplier,
  recordQuestion,
  renderLives,
  updateRiskVisual,
  flashStatus,
  lockAnswers,
  nextAfterFeedbackFn,
  endGameFn
) {
  soundWrong(settings, getVolumeMultiplier);
  
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
  renderLives(state, elLives);
  updateRiskVisual(state);

  const correctValue = settings.questionMode === "noteToDegree"
    ? state.current.correctDegree
    : state.current.correctNote;

  if (state.lives <= 0) {
    flashStatus(settings, elStatusPanel, elStatusText, false, `The correct answer is ${correctValue}. Game Over.`);
    endGameFn("Time out.");
    return;
  }

  flashStatus(settings, elStatusPanel, elStatusText, false, `The correct answer is ${correctValue}.`);
  lockAnswers(state, answerButtons, true);
  nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers);
}

export function onAnswerClick(state, btn, handleCorrectFn, handleWrongFn, settings) {
  if (!state.active || state.locked || !state.current) return;

  const chosen = btn.dataset.note;
  
  // Determine correct answer based on question mode
  let correct;
  if (settings.questionMode === "noteToDegree") {
    // In note-to-degree mode, check against correctDegree
    correct = state.current.correctDegree;
  } else if (settings.questionMode === "chordBuilder") {
    correct = state.current.correctNote;
  } else {
    // In all other modes, check against correctNote
    correct = state.current.correctNote;
  }
  
  console.log(`Answer clicked: ${chosen}, Correct: ${correct}`);

  if (chosen === correct) handleCorrectFn(chosen);
  else handleWrongFn(chosen, btn);
}
