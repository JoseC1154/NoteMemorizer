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

// === Settings (Keys to master + other logical options) ===
const SETTINGS_STORAGE = "keydrill.settings.v2";

const DEFAULT_SETTINGS = {
  masterKeys: KEYS.slice(),     // which KEYS can appear as the question key
  secondsPerQ: DEFAULT_SECONDS_PER_Q,
  soundOn: true,
  tickOn: true,
  degreeSet: "chromatic",      // "diatonic" or "chromatic"
};

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_STORAGE);
    if(!raw) return { ...DEFAULT_SETTINGS };
    const obj = JSON.parse(raw) || {};

    const mk = Array.isArray(obj.masterKeys) ? obj.masterKeys.filter(k => KEYS.includes(k)) : null;

    return {
      masterKeys: (mk && mk.length) ? mk : DEFAULT_SETTINGS.masterKeys.slice(),
      secondsPerQ: (Number.isFinite(+obj.secondsPerQ) && +obj.secondsPerQ >= 3 && +obj.secondsPerQ <= 60) ? Math.round(+obj.secondsPerQ) : DEFAULT_SETTINGS.secondsPerQ,
      soundOn: (typeof obj.soundOn === "boolean") ? obj.soundOn : DEFAULT_SETTINGS.soundOn,
      tickOn: (typeof obj.tickOn === "boolean") ? obj.tickOn : DEFAULT_SETTINGS.tickOn,
      degreeSet: (obj.degreeSet === "diatonic" || obj.degreeSet === "chromatic") ? obj.degreeSet : DEFAULT_SETTINGS.degreeSet,
    };
  }catch{
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(){
  try{ localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(state.settings)); }catch{}
}

state.settings = loadSettings();
state.secondsPerQ = state.settings.secondsPerQ;

function getEnabledKeys(){
  const enabled = KEYS.filter(k => state.settings.masterKeys.includes(k));
  return enabled.length ? enabled : KEYS.slice();
}

function setMasterKeys(keysArr){
  const clean = (Array.isArray(keysArr) ? keysArr : []).filter(k => KEYS.includes(k));
  state.settings.masterKeys = clean.length ? clean : KEYS.slice();
  saveSettings();
}

function setSecondsPerQ(n){
  const v = clamp(Math.round(+n || DEFAULT_SECONDS_PER_Q), 3, 60);
  state.settings.secondsPerQ = v;
  state.secondsPerQ = v;
  saveSettings();
  if(state.running && !state.locked){
    // restart timer for the current question using the new value
    startTimer();
  }
}

function setSoundOn(on){
  state.settings.soundOn = !!on;
  saveSettings();
}

function setTickOn(on){
  state.settings.tickOn = !!on;
  saveSettings();
}

function setDegreeSet(v){
  state.settings.degreeSet = (v === "diatonic") ? "diatonic" : "chromatic";
  saveSettings();
}

function createSettingsModal(){
  // Inject a Settings button + modal (no HTML edits required)
  const host = document.querySelector(".controls") || document.querySelector("header") || document.body;

  // Styles
  if(!document.getElementById("kdSettingsStyle")){
    const style = document.createElement("style");
    style.id = "kdSettingsStyle";
    style.textContent = `
      .kd-btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;font-weight:800;cursor:pointer}
      .kd-btn:hover{filter:brightness(1.12)}
      .kd-modalBack{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:14px}
      .kd-modalBack.show{display:flex}
      .kd-modal{width:min(860px,100%);max-height:calc(100dvh - 28px);background:rgba(12,12,12,.94);border:1px solid rgba(255,255,255,.16);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.65);backdrop-filter: blur(10px);overflow:hidden;display:flex;flex-direction:column}
      .kd-modalHead{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.12)}
      @media (max-width:520px){.kd-modalHead{flex-direction:column;align-items:stretch}.kd-modalHead .kd-row{justify-content:flex-end}}
      .kd-modalTitle{font-weight:950;letter-spacing:.6px}
      .kd-modalBody{padding:14px;display:grid;grid-template-columns: 1.2fr .8fr;gap:14px;overflow:auto;-webkit-overflow-scrolling:touch;min-height:0}
      @media (max-width:780px){.kd-modalBody{grid-template-columns:1fr}}
      @media (max-width:520px){.kd-modalBack{padding:10px}.kd-modalBody{padding:12px;gap:12px}.kd-card{padding:10px}}
      .kd-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);border-radius:16px;padding:12px}
      .kd-sub{opacity:.85;font-size:.92rem;margin-top:4px}
      .kd-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:10px}
      @media (max-width:520px){.kd-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}

      /* Key toggle buttons (replace checkboxes) */
      .kd-keyBtn{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.06);color:#fff;font-weight:950;cursor:pointer;user-select:none;min-width:0}
      .kd-keyBtn:hover{filter:brightness(1.12)}
      .kd-keyBtn.active{border-color:rgba(56,212,106,.75);background:rgba(56,212,106,.26);
        box-shadow:0 0 0 2px rgba(56,212,106,.18) inset, 0 10px 26px rgba(0,0,0,.35), 0 0 22px rgba(56,212,106,.20);
        text-shadow:0 0 10px rgba(56,212,106,.35)}
      .kd-keyBtn:focus{outline:2px solid rgba(255,255,255,.35);outline-offset:2px}

      /* Range: extend closer to edges */
      .kd-rangeWrap{margin-top:10px;margin-inline:-8px}
      @media (max-width:520px){.kd-rangeWrap{margin-inline:-10px}}
      .kd-rangeWrap input[type="range"]{width:100%}
      .kd-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
      .kd-field{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:10px}
      @media (max-width:520px){.kd-field{flex-direction:column;align-items:stretch}.kd-field label{display:flex;justify-content:space-between}} 
      .kd-field label{font-weight:900}
      .kd-pill{padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);font-weight:900}
      .kd-smallBtn{padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);color:#fff;font-weight:850;cursor:pointer}
      .kd-smallBtn:hover{filter:brightness(1.12)}
      .kd-note{opacity:.82;font-size:.9rem;line-height:1.25;margin-top:10px}

      /* --- Core layout safety (prevents buttons from spilling out on small screens) --- */
      #app{max-width:100%;box-sizing:border-box;overflow:hidden}
      .controls{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center}
      .controls > *{min-width:0}
      .controls button, .controls select{max-width:100%;flex:1 1 auto}
      @media (max-width:520px){
        .controls button, .controls select{flex:1 1 44%;}
      }
      #answers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      @media (max-width:760px){#answers{grid-template-columns:repeat(3,minmax(0,1fr));}}
      @media (max-width:520px){#answers{grid-template-columns:repeat(2,minmax(0,1fr));}}
      #answers .answer{min-width:0;width:100%}
    `;
    document.head.appendChild(style);
  }

  // Button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "kd-btn";
  btn.id = "settingsBtn";
  btn.textContent = "Settings";

  // Modal
  const back = document.createElement("div");
  back.className = "kd-modalBack";
  back.id = "kdSettingsBack";
  back.setAttribute("aria-hidden","true");

  back.innerHTML = `
    <div class="kd-modal" role="dialog" aria-modal="true" aria-label="Settings" tabindex="-1">
      <div class="kd-modalHead">
        <div>
          <div class="kd-modalTitle">Settings</div>
          <div class="kd-sub">Choose keys to master + timing + sounds.</div>
        </div>
        <div class="kd-row">
          <button type="button" class="kd-smallBtn" id="kdClose">Close</button>
        </div>
      </div>
      <div class="kd-modalBody">
        <div class="kd-card">
          <div class="kd-row">
            <div>
              <div style="font-weight:950">Keys to Master</div>
              <div class="kd-sub">Questions will only use enabled keys (you can enable multiple).</div>
            </div>
            <div class="kd-row">
              <button type="button" class="kd-smallBtn" id="kdAll">All</button>
            </div>
          </div>
          <div class="kd-grid" id="kdKeyGrid" aria-label="Keys to master"></div>
          <div class="kd-note">Tip: if you enable only <span class="kd-pill">C</span>, you’ll drill ALL degrees/accidentals in the key of C (based on your selected degree set).</div>
        </div>

        <div class="kd-card">
          <div style="font-weight:950">Game Options</div>

          <div class="kd-field">
            <label for="kdSec">Seconds per question</label>
            <span class="kd-pill" id="kdSecVal"></span>
          </div>
          <div class="kd-rangeWrap"><input id="kdSec" type="range" min="3" max="25" step="1" /></div>

          <div class="kd-field">
            <label>Degrees</label>
            <select id="kdDegreeSet" class="kd-smallBtn" style="padding:8px 10px;">
              <option value="chromatic">Chromatic (includes ♭/♯ degrees)</option>
              <option value="diatonic">Diatonic (1–7 only)</option>
            </select>
          </div>

          <div class="kd-field">
            <label for="kdSound">Sounds</label>
            <input id="kdSound" type="checkbox" />
          </div>

          <div class="kd-field">
            <label for="kdTick">Timer tick</label>
            <input id="kdTick" type="checkbox" />
          </div>

          <div class="kd-note">These settings save automatically on this device (GitHub Pages/PWA friendly).</div>
        </div>
      </div>
    </div>
  `;

  const keyGrid = back.querySelector("#kdKeyGrid");
  const sec = back.querySelector("#kdSec");
  const secVal = back.querySelector("#kdSecVal");
  const degreeSel = back.querySelector("#kdDegreeSet");
  const soundCb = back.querySelector("#kdSound");
  const tickCb = back.querySelector("#kdTick");

  function renderKeys(){
    keyGrid.innerHTML = "";
    const enabled = new Set(state.settings.masterKeys);

    KEYS.forEach(k => {
      const btnKey = document.createElement("button");
      btnKey.type = "button";
      btnKey.className = "kd-keyBtn" + (enabled.has(k) ? " active" : "");
      btnKey.textContent = pretty(k);
      btnKey.setAttribute("aria-pressed", enabled.has(k) ? "true" : "false");
      btnKey.dataset.key = k;

      btnKey.addEventListener("click", () => {
        const next = new Set(state.settings.masterKeys);
        if(next.has(k)) next.delete(k); else next.add(k);
        // Never allow empty: if user turns all off, revert to All (logical default)
        const arr = Array.from(next);
        setMasterKeys(arr);
        renderKeys();
      });

      keyGrid.appendChild(btnKey);
    });
  }

  function syncOptionControls(){
    sec.value = String(clamp(state.settings.secondsPerQ, 3, 25));
    secVal.textContent = String(state.settings.secondsPerQ);
    degreeSel.value = state.settings.degreeSet;
    soundCb.checked = !!state.settings.soundOn;
    tickCb.checked = !!state.settings.tickOn;
  }

  function open(){
    renderKeys();
    syncOptionControls();
    back.classList.add("show");
    back.setAttribute("aria-hidden","false");
  }

  function close(){
    back.classList.remove("show");
    back.setAttribute("aria-hidden","true");
  }

  btn.addEventListener("click", open);
  back.querySelector("#kdClose").addEventListener("click", close);

  // Backdrop click closes
  back.addEventListener("click", (e) => {
    if(e.target === back) close();
  });

  // All
  back.querySelector("#kdAll").addEventListener("click", () => { setMasterKeys(KEYS); renderKeys(); });

  // Seconds
  sec.addEventListener("input", () => {
    secVal.textContent = String(sec.value);
  });
  sec.addEventListener("change", () => {
    setSecondsPerQ(sec.value);
    secVal.textContent = String(state.settings.secondsPerQ);
  });

  // Degree set
  degreeSel.addEventListener("change", () => setDegreeSet(degreeSel.value));

  // Sounds
  soundCb.addEventListener("change", () => setSoundOn(soundCb.checked));
  tickCb.addEventListener("change", () => setTickOn(tickCb.checked));

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
  document.body.appendChild(back);

  // ESC closes
  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && back.classList.contains("show")) close();
  });
}

const MAJOR_STEPS = [0,2,4,5,7,9,11];
const NAT_MINOR_STEPS = [0,2,3,5,7,8,10];

const DEGREE_POOL_CHROMATIC = [
  "1","2","3","4","5","6","7",
  "b2","#2","b3","#3","b5","#4","#5","b6","#6","b7","#7"
];
const DEGREE_POOL_DIATONIC = ["1","2","3","4","5","6","7"];

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
function soundCorrect(){
  if(!state.settings?.soundOn) return;
  beep({freq:880, duration:0.09, gain:0.14});
  setTimeout(()=>beep({freq:1175, duration:0.12, gain:0.14}), 90);
}
function soundWrong(){
  if(!state.settings?.soundOn) return;
  beep({freq:220, duration:0.18, type:"square", gain:0.12});
}
function soundTick(){
  if(!state.settings?.soundOn) return;
  if(!state.settings?.tickOn) return;
  beep({freq:1000, duration:0.03, type:"square", gain:0.05});
}

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
  const pool = (state.settings?.degreeSet === "diatonic") ? DEGREE_POOL_DIATONIC : DEGREE_POOL_CHROMATIC;
  const degree = randomPick(pool);
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
createSettingsModal();
setRunner(false);
setButtonsEnabled(false);
skipBtn.disabled = true;

window.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && !state.running) startGame();
  if(e.key === 'r' || e.key === 'R') resetGame();
});
