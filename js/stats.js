// =========================
// Statistics tracking
// =========================

export function getStats() {
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

export function saveStats(stats) {
  localStorage.setItem("keydrillStats", JSON.stringify(stats));
}

export function recordQuestion(keyRoot, degreeLabel, degreeMode, correct, responseTime) {
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

export function clearStats() {
  localStorage.removeItem("keydrillStats");
}
