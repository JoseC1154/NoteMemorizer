/* Key Drill — JS (GitHub Pages / PWA)
 * FIXED:
 * - Do NOT use the old blank/duplicate canvas.
 * - Stick figure feet sit ON the highlighted step.
 * - Stairs slide under a fixed figure.
 * - Step numbers added.
 */

/*************************************************
 * Small utilities
 *************************************************/
const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/*************************************************
 * DOM refs
 *************************************************/
const appEl        = $("app");
const questionText = $("questionText");
const timerText    = $("timerText");
const answersEl    = $("answers");
const statusText   = $("statusText");

const startBtn   = $("startBtn");
const skipBtn    = $("skipBtn");
const modeBtn    = $("modeBtn");
const resetBtn   = $("resetBtn");
const installBtn = $("installBtn");

const modeLabel   = $("modeLabel");
const streakLabel = $("streakLabel");
const scoreLabel  = $("scoreLabel");
const stepsLabel  = $("stepsLabel");
const triesLabel  = $("triesLabel");
const qLabel      = $("qLabel");

const overlayBad  = $("overlayBad");
const fxBadBig    = $("fxBadBig");
const fxBadSmall  = $("fxBadSmall");
const overlayGood = $("overlayGood");
const fxGoodBig   = $("fxGoodBig");
const fxGoodSmall = $("fxGoodSmall");

const overlayEnd  = $("overlayEnd");
const endTitle    = $("endTitle");
const endBody     = $("endBody");
const endStats    = $("endStats");
const restartBtn  = $("restartBtn");
const closeEndBtn = $("closeEndBtn");

// SVG
const stairSvg      = $("stairSvg");
const stairsPath    = $("stairsPath");
const stepHighlight = $("stepHighlight");
const figureWrap    = $("figureWrap");
const figure        = $("figure");

/*************************************************
 * Game constants
 *************************************************/
const ANSWER_PAUSE_MS = 2000;
const MAX_STEPS = 12;
const STEP_UP = 1;
const STEP_DOWN = 2;
const DEFAULT_SECONDS_PER_Q = 10;

/*************************************************
 * State
 *************************************************/
const state = {
  running: false,
  locked: false,
  mode: "Major",
  score: 0,
  streak: 0,
  qNum: 1,
  secondsPerQ: DEFAULT_SECONDS_PER_Q,
  timeLeft: DEFAULT_SECONDS_PER_Q,
  timerId: null,
  current: null,
  climb: 0,
  firstTriesLeft: 3,
};

/*************************************************
 * Notes & helpers
 *************************************************/
const KEYS = ["C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

// === Mastery filter (choose which KEYS can appear as the question key) ===
const KEY_PREF_STORAGE = "keydrill.masterKeys.v1";

function loadMasterKeys(){
  try{
    const raw = localStorage.getItem(KEY_PREF_STORAGE);
    if(!raw) return new Set(KEYS);
    const arr = JSON.parse(raw);
    const set = new Set((Array.isArray(arr) ? arr : []).filter(k => KEYS.includes(k)));
    return (set.size ? set : new Set(KEYS));
  }catch{
    return new Set(KEYS);
  }
}

function saveMasterKeys(set){
  try{ localStorage.setItem(KEY_PREF_STORAGE, JSON.stringify(Array.from(set))); }catch{}
}

state.masterKeys = loadMasterKeys();

function getEnabledKeys(){
  const enabled = KEYS.filter(k => state.masterKeys?.has(k));
  return enabled.length ? enabled : KEYS.slice();
}

function setMasterKeys(set){
  state.masterKeys = new Set(set);
  if(state.masterKeys.size === 0) state.masterKeys = new Set(KEYS);
  saveMasterKeys(state.masterKeys);
  statusText.textContent = `Key filter: ${Array.from(state.masterKeys).join(", ")}`;
}

function createKeyMasteryUI(){
  // Inject a small toggle + drawer UI without requiring HTML edits
  const host = document.querySelector(".controls") || document.querySelector("header") || document.body;

  // Style
  if(!document.getElementById("keyMasteryStyle")){
    const style = document.createElement("style");
    style.id = "keyMasteryStyle";
    style.textContent = `
      .km-btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;font-weight:800;cursor:pointer}
      .km-btn:hover{filter:brightness(1.12)}
      .km-drawer{position:fixed;inset:auto 12px 12px 12px;max-width:760px;margin:0 auto;z-index:9999;
        background:rgba(12,12,12,.92);border:1px solid rgba(255,255,255,.16);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.55);
        padding:12px;backdrop-filter: blur(10px);display:none}
      .km-drawer.show{display:block}
      .km-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
      .km-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:10px}
      @media (max-width:520px){.km-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}
      .km-chip{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);user-select:none}
      .km-chip input{transform:scale(1.1)}
      .km-title{font-weight:900;letter-spacing:.5px}
      .km-sub{opacity:.85;font-size:.92rem}
      .km-actions{display:flex;gap:8px;flex-wrap:wrap}
    `;
    document.head.appendChild(style);
  }

  // Button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "km-btn";
  btn.id = "masterKeysBtn";
  btn.textContent = "Keys";

  // Drawer
  const drawer = document.createElement("div");
  drawer.className = "km-drawer";
  drawer.id = "masterKeysDrawer";
  drawer.setAttribute("aria-hidden","true");

  drawer.innerHTML = `
    <div class="km-row">
      <div>
        <div class="km-title">Keys to practice</div>
        <div class="km-sub">Turn keys on/off. Questions will only use enabled keys.</div>
      </div>
      <div class="km-actions">
        <button type="button" class="km-btn" id="kmAll">All</button>
        <button type="button" class="km-btn" id="kmNone">None</button>
        <button type="button" class="km-btn" id="kmClose">Close</button>
      </div>
    </div>
    <div class="km-grid" id="kmGrid"></div>
  `;

  const grid = drawer.querySelector("#kmGrid");

  function render(){
    grid.innerHTML = "";
    KEYS.forEach(k => {
      const chip = document.createElement("label");
      chip.className = "km-chip";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = state.masterKeys.has(k);
      cb.addEventListener("change", () => {
        const next = new Set(state.masterKeys);
        if(cb.checked) next.add(k); else next.delete(k);
        setMasterKeys(next);
        render();
      });
      const span = document.createElement("span");
      span.textContent = pretty(k);
      chip.appendChild(cb);
      chip.appendChild(span);
      grid.appendChild(chip);
    });
  }

  function open(){ drawer.classList.add("show"); drawer.setAttribute("aria-hidden","false"); }
  function close(){ drawer.classList.remove("show"); drawer.setAttribute("aria-hidden","true"); }

  btn.addEventListener("click", () => {
    const openNow = drawer.classList.contains("show");
    if(openNow) close(); else { render(); open(); }
  });

  drawer.querySelector("#kmClose").addEventListener("click", close);
  drawer.querySelector("#kmAll").addEventListener("click", () => { setMasterKeys(new Set(KEYS)); render(); });
  drawer.querySelector("#kmNone").addEventListener("click", () => { setMasterKeys(new Set()); render(); });

  // Close on outside tap
  document.addEventListener("click", (e) => {
    if(!drawer.classList.contains("show")) return;
    if(e.target === btn || drawer.contains(e.target)) return;
    close();
  });

  // Mount next to reset if possible
  try{
    if(resetBtn && resetBtn.parentElement){
      resetBtn.parentElement.insertBefore(btn, resetBtn.nextSibling);
    } else {
      host.appendChild(btn);
    }
  }catch{
    document.body.appendChild(btn);
  }
  document.body.appendChild(drawer);

  // Sync label
  setInterval(() => {
    const n = getEnabledKeys().length;
    btn.textContent = (n === KEYS.length) ? "Keys" : `Keys (${n})`;
  }, 800);
}

const MAJOR_STEPS = [0,2,4,5,7,9,11];
const NAT_MINOR_STEPS = [0,2,3,5,7,8,10];

const DEGREE_POOL = [
  "1","2","3","4","5","6","7",
  "b2","#2","b3","#3","b5","#4","#5","b6","#6","b7","#7"
];

function pretty(note){ return note.replace(/b/g,"♭").replace(/#/g,"♯"); }
function keyToIndex(k){ return KEYS.indexOf(k); }
function noteFromIndex(i){ return KEYS[((i%12)+12)%12]; }

function normalizeDegreeToken(token){
  const t = token.trim();
  const m = t.match(/^([1-7])([b#]+)$/);
  return m ? (m[2] + m[1]) : t;
}

function parseDegree(deg){
  let s = normalizeDegreeToken(deg);
  let acc = 0;
  while(s.startsWith("b")) { acc -= 1; s = s.slice(1); }
  while(s.startsWith("#")) { acc += 1; s = s.slice(1); }
  const num = Number(s);
  return { acc, num: clamp(num,1,7) };
}

function scaleNote(key, mode, degreeNum){
  const root = keyToIndex(key);
  const steps = (mode === "Major") ? MAJOR_STEPS : NAT_MINOR_STEPS;
  return noteFromIndex(root + steps[degreeNum-1]);
}

function applyAccidental(note, acc){
  return noteFromIndex(keyToIndex(note) + acc);
}

function computeAnswer(key, mode, degreeToken){
  const {acc, num} = parseDegree(degreeToken);
  const base = scaleNote(key, mode, num);
  return applyAccidental(base, acc);
}

function randomPick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

/*************************************************
 * Audio (Web Audio API)
 *************************************************/
let audioCtx;
function getAudioCtx(){
  if(!audioCtx){ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  return audioCtx;
}
function beep({freq=440, duration=0.12, type="sine", gain=0.12}){
  const ctx = getAudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + duration);
}
function soundCorrect(){ beep({freq:880, duration:0.09, gain:0.14}); setTimeout(()=>beep({freq:1175, duration:0.12, gain:0.14}), 90); }
function soundWrong(){ beep({freq:220, duration:0.18, type:"square", gain:0.12}); }
function soundTick(){ beep({freq:1000, duration:0.03, type:"square", gain:0.05}); }

/*************************************************
 * Stairs (move stairs; fixed figure)
 *************************************************/
let stairsGroup = null;
let numbersGroup = null;

function ensureStairsGroup(){
  stairsGroup = $("stairsGroup");
  if(stairsGroup) return;

  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  g.setAttribute("id", "stairsGroup");
  stairSvg.insertBefore(g, figureWrap); // behind figure
  if(stairsPath) g.appendChild(stairsPath);
  if(stepHighlight) g.appendChild(stepHighlight);
  stairsGroup = g;
}

function ensureNumbersGroup(){
  ensureStairsGroup();
  numbersGroup = $("stepNumbers");
  if(numbersGroup) return;
  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  g.setAttribute("id", "stepNumbers");
  g.setAttribute("fill", "#ffffff");
  g.setAttribute("opacity", "0.9");
  g.setAttribute("font-family", "Arial, sans-serif");
  g.setAttribute("font-weight", "900");
  g.setAttribute("font-size", "9");
  stairsGroup.appendChild(g);
  numbersGroup = g;
}

function initStairs(){
  ensureNumbersGroup();

  const startX = 10;
  const startY = 98;
  const stepW = 14;
  const stepH = 7;
  const platformLen = 18;

  const BASE_INDEX = 5;
  const EXTRA = 14;
  const STEPS_DRAW = MAX_STEPS + BASE_INDEX + EXTRA;

  let d = "";
  for(let i=0;i<=STEPS_DRAW;i++){
    const x0 = startX + stepW * i;
    const y  = startY - stepH * i;
    const x1 = x0 + platformLen;
    d += `M ${x0} ${y} L ${x1} ${y} `;
    d += `M ${x1} ${y} L ${x1} ${y - stepH} `;
  }
  stairsPath.setAttribute("d", d.trim());

  stairSvg.dataset.startX = String(startX);
  stairSvg.dataset.startY = String(startY);
  stairSvg.dataset.stepW = String(stepW);
  stairSvg.dataset.stepH = String(stepH);
  stairSvg.dataset.platformLen = String(platformLen);
  stairSvg.dataset.baseIndex = String(BASE_INDEX);

  // Place figure so ANKLES sit on the step.
  // Our figure ankle y is ~44px below its local origin.
  const ANKLE_Y = 44;
  const homeX0 = startX + stepW * BASE_INDEX;
  const homeX  = homeX0 + platformLen * 0.55;
  const stepY  = startY - stepH * BASE_INDEX;
  const homeY  = stepY - ANKLE_Y;
  figureWrap.setAttribute("transform", `translate(${homeX},${homeY})`);

  // Build step numbers for game steps 1..MAX_STEPS (fixed to world, moves with stairs)
  numbersGroup.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";
  for(let n=1; n<=MAX_STEPS; n++){
    const i = BASE_INDEX + n; // step index in the drawn staircase
    const x0 = startX + stepW * i;
    const y  = startY - stepH * i;
    const t = document.createElementNS(ns, "text");
    t.textContent = String(n);
    t.setAttribute("x", String(x0 + 2));
    t.setAttribute("y", String(y - 2));
    t.setAttribute("paint-order", "stroke");
    t.setAttribute("stroke", "rgba(0,0,0,0.65)");
    t.setAttribute("stroke-width", "2");
    numbersGroup.appendChild(t);
  }

  renderFigure();
}

function updateStepHighlight(){
  const startX = Number(stairSvg.dataset.startX || 10);
  const startY = Number(stairSvg.dataset.startY || 98);
  const stepW = Number(stairSvg.dataset.stepW || 14);
  const stepH = Number(stairSvg.dataset.stepH || 7);
  const platformLen = Number(stairSvg.dataset.platformLen || 18);
  const BASE_INDEX = Number(stairSvg.dataset.baseIndex || 5);

  const i = BASE_INDEX + clamp(state.climb, 0, MAX_STEPS);
  const x0 = startX + stepW * i;
  const y  = startY - stepH * i;
  const x1 = x0 + platformLen;

  stepHighlight.setAttribute("d", `M ${x0} ${y} L ${x1} ${y}`);
  stepHighlight.classList.add("stepPulse");
}

function renderFigure(){
  ensureNumbersGroup();
  const stepW = Number(stairSvg.dataset.stepW || 14);
  const stepH = Number(stairSvg.dataset.stepH || 7);
  const dx = -stepW * state.climb;
  const dy =  stepH * state.climb;
  stairsGroup.setAttribute("transform", `translate(${dx},${dy})`);
  updateStepHighlight();
}

function doFallFX(){
  stairSvg.classList.remove("fallShake");
  void stairSvg.offsetWidth;
  stairSvg.classList.add("fallShake");

  figureWrap.classList.remove("tumble");
  void figureWrap.getBBox();
  figureWrap.classList.add("tumble");
}

function setRunner(active){ figure.classList.toggle("running", !!active); }

function moveClimb(delta, {shake=false, suppressEnd=false} = {}){
  const before = state.climb;
  state.climb = clamp(state.climb + delta, 0, MAX_STEPS);

  if(state.climb !== before){
    renderFigure();
    updateHUD();
  }

  if(shake) doFallFX();

  if(!suppressEnd){
    if(delta > 0 && state.climb >= MAX_STEPS){
      endGame({ title: "You Win!", body: "You made it to the top of the stairs.", variant: "win" });
      return;
    }
    if(delta < 0 && state.climb === 0){
      endGame({ title: "Game Over", body: "You fell to the bottom of the stairs.", variant: "lose" });
      return;
    }
  }
}

function resetClimb(){ state.climb = 0; renderFigure(); }

/*************************************************
 * UI helpers
 *************************************************/
function updateHUD(){
  modeLabel.textContent = state.mode;
  streakLabel.textContent = String(state.streak);
  scoreLabel.textContent = String(state.score);
  stepsLabel.textContent = String(state.climb);
  triesLabel.textContent = (state.qNum === 1) ? String(state.firstTriesLeft) : "—";
  qLabel.textContent = String(state.qNum);
}

function setButtonsEnabled(enabled){
  answersEl.querySelectorAll('button.answer').forEach(b => b.disabled = !enabled);
  startBtn.disabled = state.running;
  skipBtn.disabled = !state.running;
  modeBtn.disabled = state.running;
}

function hideOverlays(){
  overlayBad.classList.remove("show");
  overlayBad.setAttribute("aria-hidden","true");
  overlayGood.classList.remove("show");
  overlayGood.setAttribute("aria-hidden","true");
}

function showBad(big, small){
  fxBadBig.textContent = big;
  fxBadSmall.textContent = small;
  overlayBad.classList.add("show");
  overlayBad.setAttribute("aria-hidden","false");
  appEl.classList.add("shake");
  setTimeout(()=>appEl.classList.remove("shake"), 280);
}

function showGood(big, small){
  fxGoodBig.textContent = big;
  fxGoodSmall.textContent = small;
  overlayGood.classList.add("show");
  overlayGood.setAttribute("aria-hidden","false");
}

function lockForFeedback(){ state.locked = true; setButtonsEnabled(false); }
function unlockAfterFeedback(){ state.locked = false; hideOverlays(); }

/*************************************************
 * Question generation
 *************************************************/
function makeQuestion(){
  const key = randomPick(getEnabledKeys());
  const degree = randomPick(DEGREE_POOL);
  const answer = computeAnswer(key, state.mode, degree);
  return { key, degree, answerNote: answer, prompt: `What is the ${degree} in the key of ${key} ${state.mode}?` };
}

function buildOptions(correct){
  // Prefer options from enabled keys; if fewer than 7, fill from full set.
  const enabledPool = getEnabledKeys();
  const basePool = enabledPool.includes(correct) ? enabledPool : [correct, ...enabledPool];
  const otherFromEnabled = shuffle(basePool.filter(n => n !== correct));
  let others = otherFromEnabled.slice(0, 6);

  if(others.length < 6){
    const fill = shuffle(KEYS.filter(n => n !== correct && !others.includes(n)));
    others = others.concat(fill.slice(0, 6 - others.length));
  }

  return shuffle([correct, ...others]);
}

function setQuestionUI(q){
  questionText.textContent = q.prompt;
  qLabel.textContent = String(state.qNum);
}

function renderAnswers(options){
  answersEl.innerHTML = "";
  options.forEach(note => {
    const b = document.createElement("button");
    b.className = "answer";
    b.textContent = pretty(note);
    b.addEventListener("click", () => onAnswer(note));
    answersEl.appendChild(b);
  });
}

function replayCurrentQuestion(){
  if(!state.running) return;
  hideOverlays();
  setQuestionUI(state.current);
  renderAnswers(buildOptions(state.current.answerNote));
  setButtonsEnabled(true);
  startTimer();
  statusText.textContent = "Try again!";
}

function nextQuestion(){
  if(!state.running) return;
  state.current = makeQuestion();
  setQuestionUI(state.current);
  renderAnswers(buildOptions(state.current.answerNote));
  setButtonsEnabled(true);
  startTimer();
}

/*************************************************
 * Timer
 *************************************************/
function paintTimer(){
  timerText.textContent = String(state.timeLeft);
  timerText.classList.remove("timeLow","timeOut");
  if(state.timeLeft <= 3 && state.timeLeft > 0) timerText.classList.add("timeLow");
  if(state.timeLeft <= 0) timerText.classList.add("timeOut");
}

function stopTimer(){ if(state.timerId){ clearInterval(state.timerId); state.timerId = null; } }

function startTimer(){
  stopTimer();
  state.timeLeft = state.secondsPerQ;
  paintTimer();
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    soundTick();
    paintTimer();
    if(state.timeLeft <= 0) timeUp();
  }, 1000);
}

/*************************************************
 * End modal
 *************************************************/
function showEnd(){ overlayEnd.classList.add("show"); overlayEnd.setAttribute("aria-hidden", "false"); }
function hideEnd(){ overlayEnd.classList.remove("show"); overlayEnd.setAttribute("aria-hidden", "true"); }

function endGame({title="Game Over", body="", variant="lose"} = {}){
  stopTimer();
  hideOverlays();
  state.running = false;
  state.locked = true;
  setButtonsEnabled(false);
  setRunner(false);

  endTitle.textContent = title;
  endBody.textContent = body;
  endStats.textContent = `Score: ${state.score} • Streak: ${state.streak} • Steps: ${state.climb} • Q#: ${state.qNum}`;
  endTitle.style.color = (variant === "win") ? "var(--good)" : "var(--bad)";
  statusText.textContent = title;
  showEnd();
}

/*************************************************
 * Answer handling
 *************************************************/
function onAnswer(note){
  if(!state.running || state.locked) return;
  try{ getAudioCtx(); }catch{}

  lockForFeedback();
  stopTimer();

  const correct = state.current?.answerNote;
  const isCorrect = (note === correct);

  if(isCorrect){
    const bonus = 10 + Math.min(10, state.streak);
    state.score += bonus;
    state.streak += 1;
    statusText.textContent = `✅ Correct: ${pretty(correct)} (+${bonus})`;
    showGood("Correct!", `Yes — ${pretty(correct)}.`);
    soundCorrect();
    moveClimb(STEP_UP);
  } else {
    if(state.qNum === 1 && state.climb === 0){
      state.firstTriesLeft = Math.max(0, state.firstTriesLeft - 1);
      updateHUD();
      if(state.firstTriesLeft <= 0){
        doFallFX();
        soundWrong();
        endGame({ title: "Game Over", body: "Out of tries on Question 1.", variant: "lose" });
        return;
      }
      doFallFX();
      soundWrong();
      statusText.textContent = `❌ Wrong — Try again (Q1). Tries left: ${state.firstTriesLeft}`;
      showBad("Try again!", `Tries left for Question 1: ${state.firstTriesLeft}`);
      setTimeout(() => { unlockAfterFeedback(); replayCurrentQuestion(); }, ANSWER_PAUSE_MS);
      return;
    }

    state.score = Math.max(0, state.score - 4);
    state.streak = 0;
    statusText.textContent = `❌ Wrong: you picked ${pretty(note)}.`;
    showBad("Wrong!", `Correct was ${pretty(correct)}.`);
    soundWrong();
    moveClimb(-STEP_DOWN, { shake:true });
  }

  updateHUD();
  setTimeout(() => {
    unlockAfterFeedback();
    if(!state.running) return;
    state.qNum += 1;
    updateHUD();
    nextQuestion();
  }, ANSWER_PAUSE_MS);
}

function timeUp(){
  if(!state.running || state.locked) return;
  lockForFeedback();
  stopTimer();
  try{ getAudioCtx(); }catch{}

  const correct = state.current?.answerNote;
  statusText.textContent = "⏱️ Time up!";
  soundWrong();

  if(state.qNum === 1 && state.climb === 0){
    state.firstTriesLeft = Math.max(0, state.firstTriesLeft - 1);
    updateHUD();
    if(state.firstTriesLeft <= 0){
      doFallFX();
      endGame({ title: "Game Over", body: "Out of tries on Question 1 (time ran out).", variant: "lose" });
      return;
    }
    doFallFX();
    showBad("Try again!", `Time up — Tries left for Question 1: ${state.firstTriesLeft}`);
    setTimeout(() => { unlockAfterFeedback(); replayCurrentQuestion(); }, ANSWER_PAUSE_MS);
    return;
  }

  if(state.climb === 0){
    endGame({ title: "Game Over", body: "Time ran out at the bottom of the stairs.", variant: "lose" });
    return;
  }

  moveClimb(-STEP_DOWN, { shake:true });
  showBad("Time!", correct ? `Correct was ${pretty(correct)}.` : "Try the next one…");
  state.streak = 0;
  state.score = Math.max(0, state.score - 2);
  updateHUD();

  setTimeout(() => {
    unlockAfterFeedback();
    if(!state.running) return;
    state.qNum += 1;
    updateHUD();
    nextQuestion();
  }, ANSWER_PAUSE_MS);
}

/*************************************************
 * Controls
 *************************************************/
function startGame(){
  if(state.running) return;

  state.running = true;
  state.locked = false;
  state.qNum = 1;
  state.score = 0;
  state.streak = 0;
  state.current = null;
  state.climb = 0;
  state.firstTriesLeft = 3;

  hideEnd();
  hideOverlays();
  setRunner(true);
  renderFigure();
  updateHUD();

  statusText.textContent = "Game started.";
  nextQuestion();
}

function resetGame(){
  stopTimer();
  hideOverlays();
  hideEnd();

  state.running = false;
  state.locked = false;
  state.score = 0;
  state.streak = 0;
  state.qNum = 1;
  state.current = null;
  state.firstTriesLeft = 3;

  resetClimb();
  setRunner(false);
  updateHUD();

  questionText.textContent = "Press Start";
  timerText.textContent = "--";
  answersEl.innerHTML = "";
  statusText.textContent = "Ready.";

  startBtn.disabled = false;
  modeBtn.disabled = false;
  skipBtn.disabled = true;
}

function skipQuestion(){
  if(!state.running || state.locked) return;
  lockForFeedback();
  stopTimer();

  statusText.textContent = "↪️ Skipped.";
  showBad("Skipped", "No penalty this time.");

  setTimeout(() => {
    unlockAfterFeedback();
    if(!state.running) return;
    state.qNum += 1;
    updateHUD();
    nextQuestion();
  }, ANSWER_PAUSE_MS);
}

function toggleMode(){
  if(state.running) return;
  state.mode = (state.mode === "Major") ? "Minor" : "Major";
  updateHUD();
}

/*************************************************
 * Install prompt button
 *************************************************/
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-block";
});
installBtn.addEventListener('click', async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  try{ await deferredPrompt.userChoice; }catch{}
  deferredPrompt = null;
  installBtn.style.display = "none";
});

/*************************************************
 * Runtime manifest + service worker
 *************************************************/
(async function setupPWA(){
  const isSecure = (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
  if(!isSecure) return;

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  function makeIcon(size){
    const c = document.createElement("canvas"); c.width=c.height=size;
    const ctx=c.getContext("2d");
    const g=ctx.createLinearGradient(0,0,size,size);
    g.addColorStop(0,"#2a2a2a"); g.addColorStop(1,"#121212");
    ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
    ctx.strokeStyle="#444"; ctx.lineWidth=Math.max(8,size*0.03);
    ctx.strokeRect(ctx.lineWidth/2,ctx.lineWidth/2,size-ctx.lineWidth,size-ctx.lineWidth);
    const pad=size*0.18,w=size-pad*2,r=w*0.18;
    const gg=ctx.createLinearGradient(0,pad,0,pad+w);
    gg.addColorStop(0,"rgba(56,212,106,1)"); gg.addColorStop(1,"rgba(27,142,61,1)");
    ctx.fillStyle=gg; roundRect(ctx,pad,pad,w,w,r); ctx.fill();
    ctx.fillStyle="#fff"; const eyeR=w*0.09;
    ctx.beginPath(); ctx.arc(pad+w*0.32,pad+w*0.38,eyeR,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad+w*0.68,pad+w*0.38,eyeR,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.55)"; ctx.lineWidth=Math.max(6,w*0.06); ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(pad+w*0.5,pad+w*0.58,w*0.22,0,Math.PI,false); ctx.stroke();
    ctx.fillStyle="#ffcc00"; ctx.font=`900 ${Math.floor(size*0.18)}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("KD",size/2,size*0.79);
    return c.toDataURL("image/png");
  }

  const icon192=makeIcon(192), icon512=makeIcon(512);
  const manifest={
    name:"Key Drill",
    short_name:"KeyDrill",
    start_url:"./",
    scope:"./",
    display:"standalone",
    background_color:"#1e1e1e",
    theme_color:"#1e1e1e",
    icons:[
      {src:icon192,sizes:"192x192",type:"image/png"},
      {src:icon512,sizes:"512x512",type:"image/png"}
    ]
  };

  const manifestURL=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"}));
  let link=document.querySelector('link[rel="manifest"]') || Object.assign(document.createElement('link'),{rel:'manifest'});
  document.head.appendChild(link);
  link.href=manifestURL;

  let apple=document.querySelector('link[rel="apple-touch-icon"]') || Object.assign(document.createElement('link'),{rel:'apple-touch-icon'});
  document.head.appendChild(apple);
  apple.href=icon512;

  if('serviceWorker' in navigator){
    const swCode=`const CACHE='keydrill-v6';
const PRECACHE=['./','./index.html','./styles.css','./keydrill.js'];

self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  try{await c.addAll(PRECACHE);}catch{}
  self.skipWaiting();
})()));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.map(k=>k!==CACHE?caches.delete(k):null));
  self.clients.claim();
})()));

// Allow the page to force-activate an updated SW
self.addEventListener('message',(e)=>{
  if(e?.data && e.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',e=>e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  const m=await c.match(e.request,{ignoreSearch:true});
  if(m) return m;
  try{
    const f=await fetch(e.request);
    if(e.request.method==='GET' && new URL(e.request.url).origin===location.origin){
      c.put(e.request,f.clone());
    }
    return f;
  }catch{
    return (await c.match('./',{ignoreSearch:true})) || new Response('Offline');
  }
})()));`;

    const swURL=URL.createObjectURL(new Blob([swCode],{type:'text/javascript'}));
    try{ 
      const reg = await navigator.serviceWorker.register(swURL,{scope:'./'});
      // Force update/activation so GitHub Pages doesn't keep an old cached JS
      try{ await reg.update(); }catch{}
      if(reg.waiting){
        try{ reg.waiting.postMessage({type:'SKIP_WAITING'}); }catch{}
      }
    }catch{}
  }
})();

/*************************************************
 * Wire events + init
 *************************************************/
restartBtn.addEventListener("click", () => { resetGame(); startGame(); });
closeEndBtn.addEventListener("click", hideEnd);

startBtn.addEventListener("click", startGame);
skipBtn.addEventListener("click", skipQuestion);
modeBtn.addEventListener("click", toggleMode);
resetBtn.addEventListener("click", resetGame);

updateHUD();
initStairs();
createKeyMasteryUI();
setRunner(false);
setButtonsEnabled(false);
skipBtn.disabled = true;

window.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && !state.running) startGame();
  if(e.key === 'r' || e.key === 'R') resetGame();
});
