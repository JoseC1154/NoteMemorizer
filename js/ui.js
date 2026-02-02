// UI rendering functions

export function renderQuestion(state, settings, elQuestionText, elTimerBackground, SCALE_TYPE_NAMES) {
  const q = state.current;
  if (!q) {
    elQuestionText.textContent = "Click to start!";
    if (elTimerBackground) elTimerBackground.textContent = "";
    return;
  }
  
  // In piano mode, ask about the scale type
  if (settings.pianoMode && q.scaleType) {
    const scaleTypeName = SCALE_TYPE_NAMES[q.scaleType] || q.scaleType;
    elQuestionText.textContent = `What ${scaleTypeName} scale is this?`;
  } else {
    elQuestionText.textContent = `What is the ${q.degreeLabel} in the key of ${q.keyRoot} major?`;
  }
}

export function renderAnswers(state, answerButtons) {
  const q = state.current;
  const opts = q?.options ?? [];

  answerButtons.forEach((b, i) => {
    b.textContent = opts[i] ?? "—";
    b.dataset.note = opts[i] ?? "";
    b.disabled = !state.active || state.locked || !q;
  });
}

export function lockAnswers(state, answerButtons, lock) {
  state.locked = lock;
  answerButtons.forEach(b => {
    b.disabled = lock || !state.active;
  });
}

export function setStatusNeutral(elStatusPanel, elStatusText, text) {
  elStatusPanel.classList.remove("good", "bad");
  elStatusText.textContent = text;
}

export function renderLives(state, elLives) {
  if (!elLives) return;
  elLives.textContent = `${state.lives} ♥`;
}

export function renderScore(state, elScore) {
  if (!elScore) return;
  elScore.textContent = state.score.toLocaleString();
}

export function renderBonus(state, elBonusCount, elBonusButton) {
  if (!elBonusCount || !elBonusButton) return;
  
  // Show time remaining if bonus is active, otherwise show bonus points
  if (state.bonusActive) {
    elBonusCount.textContent = String(state.bonusTimeRemaining) + 's';
  } else {
    elBonusCount.textContent = String(state.bonusPoints);
  }
  
  // Show bonus button when game is active and has bonus points or bonus is active
  if (state.active && (state.bonusPoints > 0 || state.bonusActive)) {
    elBonusButton.hidden = false;
    elBonusButton.disabled = state.bonusPoints < 5 || state.bonusActive;
    
    if (state.bonusActive) {
      elBonusButton.classList.add('active');
    } else {
      elBonusButton.classList.remove('active');
    }
  } else {
    elBonusButton.hidden = true;
  }
}

export function renderLevelInfo(state, settings, elLevelInfo) {
  if (!elLevelInfo) return;
  if (settings.gameMode === "progression" && state.active) {
    const modeText = state.progression.currentMode === "diatonic" ? "Diatonic" : "Chromatic";
    elLevelInfo.textContent = `Level ${state.progression.level}: ${state.progression.currentKey} ${modeText}`;
    elLevelInfo.hidden = false;
  } else {
    elLevelInfo.hidden = true;
  }
}

export function flashStatus(settings, elStatusPanel, elStatusText, isGood, text) {
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

export function flashStatusWithSuggestions(elStatusPanel, elStatusText, text, suggestionsHtml) {
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

export function updateRiskVisual(state) {
  // Risk based on (a) low lives and (b) low remaining time.
  const livesDen = Math.max(1, state.maxLives);
  const timeDen = Math.max(1, state.questionSeconds);

  const riskLives = Math.min(Math.max(1 - (state.lives / livesDen), 0), 1);
  const riskTime = Math.min(Math.max(1 - (state.secondsLeft / timeDen), 0), 1);

  const risk = Math.min(Math.max(Math.max(riskLives, riskTime), 0), 1);

  // CSS variable (if you later wire it in styles.css)
  document.documentElement.style.setProperty("--risk", String(risk));

  // Immediate background shift: blue (safe) -> red (danger)
  const hue = Math.round(210 - (210 * risk));
  document.body.style.background = `radial-gradient(1200px 900px at 50% 0%, hsl(${hue} 70% 25%) 0%, #070A12 55%, #02030a 100%)`;
}

export function renderKeyToggles(keyToggles, ALL_KEYS, settings, getVolumeMultiplier, soundDegreeToggle) {
  keyToggles.innerHTML = "";
  const enabled = new Set(settings.keysEnabled);

  for (const k of ALL_KEYS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "keyBtn";
    b.textContent = k;
    b.setAttribute("aria-pressed", enabled.has(k) ? "true" : "false");

    b.addEventListener("click", () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      const isOn = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", isOn ? "false" : "true");
      if (isOn) enabled.delete(k);
      else enabled.add(k);
      settings.keysEnabled = Array.from(enabled);
    });

    keyToggles.appendChild(b);
  }
}

export function renderStats(getStats) {
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

export function initScaleToggles(scaleToggles, SCALE_TYPES, SCALE_TYPE_NAMES, settings, saveSettingsToStorage, soundDegreeToggle, getVolumeMultiplier) {
  if (!scaleToggles) return;
  
  scaleToggles.innerHTML = '';
  
  Object.keys(SCALE_TYPES).forEach(scaleKey => {
    const toggle = document.createElement('button');
    toggle.className = 'scaleToggle';
    toggle.textContent = SCALE_TYPE_NAMES[scaleKey];
    toggle.dataset.scale = scaleKey;
    
    if (settings.scaleTypesEnabled.includes(scaleKey)) {
      toggle.classList.add('active');
    }
    
    toggle.addEventListener('click', () => {
      soundDegreeToggle(settings, getVolumeMultiplier);
      const isActive = toggle.classList.contains('active');
      
      if (isActive) {
        toggle.classList.remove('active');
        settings.scaleTypesEnabled = settings.scaleTypesEnabled.filter(s => s !== scaleKey);
      } else {
        toggle.classList.add('active');
        settings.scaleTypesEnabled.push(scaleKey);
      }
      
      // Ensure at least one scale type is selected
      if (settings.scaleTypesEnabled.length === 0) {
        toggle.classList.add('active');
        settings.scaleTypesEnabled = [scaleKey];
      }
      
      saveSettingsToStorage(settings);
    });
    
    scaleToggles.appendChild(toggle);
  });
}
