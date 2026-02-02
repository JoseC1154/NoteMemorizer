// Game logic and question generation
// Cache buster: v1.0.4

export function degreeToNote(keyRoot, degreeLabel, degreeMode, NOTE_TO_PC, MAJOR_SCALE_OFFSETS, DIATONIC_DEGREES, CHROMATIC_TO_OFFSET, pcToNote) {
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

export function buildOptionsForMode(correct, degreeMode, keyRoot, NOTE_TO_PC, MAJOR_SCALE_OFFSETS, NOTE_LIST, pcToNote) {
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

export function stopTimer(state) {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

export function getEffectiveSecondsPerQuestion(settings, state, clamp) {
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
  if (elTimerBackground) elTimerBackground.textContent = String(state.secondsLeft);
  updateRiskVisual(state);
  
  // Fade out header when timer starts
  const elHeader = document.getElementById("header");
  if (elHeader && state.active) {
    elHeader.classList.add("faded");
  }

  state.timerId = setInterval(() => {
    if (!state.active || state.locked) return;

    state.secondsLeft -= 1;
    if (elTimerBackground) elTimerBackground.textContent = String(state.secondsLeft);
    updateRiskVisual(state);

    if (state.secondsLeft > 0) soundTick(settings, getVolumeMultiplier, state);

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
  SCALE_TYPE_NAMES,
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
  updatePianoVisualization
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
  const degreeLabel = pickRandom(availableDegrees.length ? availableDegrees : degreePool);
  
  let correctNote, options, scaleType = null;
  
  // For piano mode, select a scale type and ask for the key
  if (settings.pianoMode) {
    const availableScales = settings.scaleTypesEnabled.length ? settings.scaleTypesEnabled : Object.keys(SCALE_TYPES);
    scaleType = pickRandom(availableScales);
    // In piano mode, the correct answer is the KEY, not a degree
    correctNote = keyRoot;
    // Options are all 12 keys
    options = buildOptions(correctNote, NOTE_LIST);
    console.log(`NEW QUESTION: ${keyRoot} ${scaleType} scale - Correct answer: ${correctNote}`);
    console.log('Available keys:', settings.keysEnabled);
    console.log('Available scales:', availableScales);
  } else {
    // Normal degree mode
    correctNote = degreeToNote(keyRoot, degreeLabel, degreeMode, NOTE_TO_PC, MAJOR_SCALE_OFFSETS, DIATONIC_DEGREES, CHROMATIC_TO_OFFSET, pcToNote);
    options = buildOptionsForMode(correctNote, degreeMode, keyRoot, NOTE_TO_PC, MAJOR_SCALE_OFFSETS, NOTE_LIST, pcToNote);
  }
  
  state.current = { keyRoot, degreeLabel, correctNote, options, scaleType };
  
  // Update piano visualization FIRST if in piano mode
  if (settings.pianoMode && scaleType) {
    console.log(`Updating piano for ${keyRoot} ${scaleType}`);
    updatePianoVisualization(pianoKeyboard, keyRoot, scaleType, SCALE_TYPES, NOTE_TO_PC, pcToNote);
  }
  
  renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES);
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
  
  // Restore opacity to all elements
  const elAnswerGrid = document.getElementById("answerGrid");
  const pianoContainer = document.getElementById("pianoContainer");
  if (elAnswerGrid) elAnswerGrid.style.opacity = '1';
  if (pianoContainer) pianoContainer.style.opacity = '1';
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
  
  // Restore header visibility
  const elHeader = document.getElementById("header");
  if (elHeader) {
    elHeader.classList.remove("faded");
  }
  
  // Hide everything except question box
  const elAnswerGrid = document.getElementById("answerGrid");
  const pianoContainer = document.getElementById("pianoContainer");
  const elBonusButton = document.getElementById("bonusButton");
  if (elAnswerGrid) elAnswerGrid.style.opacity = '0.2';
  if (pianoContainer) pianoContainer.style.opacity = '0.2';
  if (elBonusButton) elBonusButton.style.opacity = '0.2';
  
  // Show game over in status panel
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

export function nextAfterFeedback(state, settings, answerButtons, lockAnswers, nextQuestionFn) {
  setTimeout(() => {
    if (!state.active) return;
    lockAnswers(state, answerButtons, false);
    nextQuestionFn();
  }, settings.modalDuration + 100);
}

export function handleCorrect(
  state,
  settings,
  chosen,
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
  const speedBonus = Math.max(0, (state.questionSeconds - state.secondsLeft) * 5);
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

  if (rewardAt20) {
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} — 🎉 20 correct! +1 life & Speed up! (Score: ${state.score})`);
  } else if (awardedLife) {
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} — +1 life! (Score: ${state.score})`);
  } else if (bonusAwarded) {
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} — ⏳ +5 Bonus! (Streak: ${state.streak}) — Score: ${state.score}`);
  } else {
    const streakText = settings.gameMode === "progression" 
      ? `Level ${state.progression.level} Progress: ${state.progression.levelStreak}/${getProgressionStreakRequiredFn(settings)}`
      : `Streak: ${state.streak}`;
    flashStatus(settings, elStatusPanel, elStatusText, true, `Correct: ${chosen} (${streakText}) — Score: ${state.score}`);
  }

  lockAnswers(state, answerButtons, true);
  stopTimerFn(state);
  nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers);
}

export function handleWrong(
  state,
  settings,
  chosen,
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

  if (state.lives <= 0) {
    flashStatus(settings, elStatusPanel, elStatusText, false, `Wrong: ${chosen} — Correct: ${state.current.correctNote} — Game Over`);
    endGameFn("No lives left.");
    return;
  }

  flashStatus(settings, elStatusPanel, elStatusText, false, `Wrong: ${chosen} — Correct: ${state.current.correctNote} — Lives: ${state.lives}`);
  lockAnswers(state, answerButtons, true);
  stopTimerFn(state);
  nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers);
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

  if (state.lives <= 0) {
    flashStatus(settings, elStatusPanel, elStatusText, false, `Time out — Correct: ${state.current.correctNote} — Game Over`);
    endGameFn("Time out.");
    return;
  }

  flashStatus(settings, elStatusPanel, elStatusText, false, `Time out — Correct: ${state.current.correctNote} — Lives: ${state.lives}`);
  lockAnswers(state, answerButtons, true);
  nextAfterFeedbackFn(state, settings, answerButtons, lockAnswers);
}

export function onAnswerClick(state, btn, handleCorrectFn, handleWrongFn) {
  if (!state.active || state.locked || !state.current) return;

  const chosen = btn.dataset.note;
  const correct = state.current.correctNote;
  
  console.log(`Answer clicked: ${chosen}, Correct: ${correct}`);

  if (chosen === correct) handleCorrectFn(chosen);
  else handleWrongFn(chosen);
}
