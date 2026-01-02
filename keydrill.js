/*************************************************
 * PWA-in-one-file (GitHub Pages friendly)
 * - Generates icons + manifest at runtime
 * - Registers a blob service worker with scope "./"
 *************************************************/
(async function setupPWA(){
  const isSecure = (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
  if(!isSecure) return;

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function makeIcon(size){
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");

    const g = ctx.createLinearGradient(0,0,size,size);
    g.addColorStop(0, "#2a2a2a");
    g.addColorStop(1, "#121212");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,size,size);

    ctx.strokeStyle = "#444";
    ctx.lineWidth = Math.max(8, size * 0.03);
    ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, size-ctx.lineWidth, size-ctx.lineWidth);

    const pad = size * 0.18;
    const w = size - pad*2;
    const r = w * 0.18;

    const gg = ctx.createLinearGradient(0,pad,0,pad+w);
    gg.addColorStop(0, "rgba(56,212,106,1)");
    gg.addColorStop(1, "rgba(27,142,61,1)");
    ctx.fillStyle = gg;
    roundRect(ctx, pad, pad, w, w, r);
    ctx.fill();

    ctx.fillStyle = "#fff";
    const eyeR = w * 0.09;
    ctx.beginPath(); ctx.arc(pad + w*0.32, pad + w*0.38, eyeR, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad + w*0.68, pad + w*0.38, eyeR, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,.55)";
    ctx.lineWidth = Math.max(6, w*0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(pad + w*0.5, pad + w*0.58, w*0.22, 0, Math.PI, false);
    ctx.stroke();

    ctx.fillStyle = "#ffcc00";
    ctx.font = `900 ${Math.floor(size*0.18)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("KD", size/2, size*0.79);

    return c.toDataURL("image/png");
  }

  const icon192 = makeIcon(192);
  const icon512 = makeIcon(512);

  // GitHub Pages-friendly: start_url/scope should be "./" for project pages
  const manifest = {
    name: "Key Drill",
    short_name: "KeyDrill",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#1e1e1e",
    theme_color: "#1e1e1e",
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png" },
      { src: icon512, sizes: "512x512", type: "image/png" }
    ]
  };

  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const manifestURL = URL.createObjectURL(manifestBlob);

  let link = document.querySelector('link[rel="manifest"]');
  if(!link){
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = manifestURL;

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if(!appleIcon){
    appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = icon512;

  if("serviceWorker" in navigator){
    const swCode = `
      const CACHE = "keydrill-onefile-v2";
      const PRECACHE = ["./", "./index.html"];

      self.addEventListener("install", (event) => {
        event.waitUntil((async () => {
          const cache = await caches.open(CACHE);
          try { await cache.addAll(PRECACHE); } catch(e) {}
          self.skipWaiting();
        })());
      });

      self.addEventListener("activate", (event) => {
        event.waitUntil((async () => {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : null));
          self.clients.claim();
        })());
      });

      self.addEventListener("fetch", (event) => {
        const req = event.request;
        event.respondWith((async () => {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(req, { ignoreSearch: true });
          if(cached) return cached;

          try{
            const fresh = await fetch(req);
            if(req.method === "GET" && new URL(req.url).origin === location.origin){
              cache.put(req, fresh.clone());
            }
            return fresh;
          }catch(e){
            // Offline fallback to app shell
            const fallback = await cache.match("./", { ignoreSearch: true }) || await cache.match("./index.html", { ignoreSearch: true });
            return fallback || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
          }
        })());
      });
    `;

    const swBlob = new Blob([swCode], { type: "text/javascript" });
    const swURL = URL.createObjectURL(swBlob);

    try{
      await navigator.serviceWorker.register(swURL, { scope: "./" });
    }catch(e){
      // App still runs normally.
    }
  }
})();

/*************************************************
 * Game logic
 *************************************************/
const ANSWER_PAUSE_MS = 2000;

const questionBox = document.getElementById("questionBox");
const questionText = document.getElementById("questionText");
const timerText = document.getElementById("timerText");
const answersEl = document.getElementById("answers");
const statusText = document.getElementById("statusText");

const modeLabel = document.getElementById("modeLabel");
const streakLabel = document.getElementById("streakLabel");
const scoreLabel  = document.getElementById("scoreLabel");
const qLabel      = document.getElementById("qLabel");
const stepsLabel  = document.getElementById("stepsLabel");
const triesLabel  = document.getElementById("triesLabel");

const overlayBad = document.getElementById("overlayBad");
const overlayGood = document.getElementById("overlayGood");
const fxBadBig = document.getElementById("fxBadBig");
const fxBadSmall = document.getElementById("fxBadSmall");
const fxGoodBig = document.getElementById("fxGoodBig");
const fxGoodSmall = document.getElementById("fxGoodSmall");

const overlayEnd = document.getElementById("overlayEnd");
const endTitle = document.getElementById("endTitle");
const endBody = document.getElementById("endBody");
const endStats = document.getElementById("endStats");
const restartBtn = document.getElementById("restartBtn");
const closeEndBtn = document.getElementById("closeEndBtn");

const startBtn = document.getElementById("startBtn");
const skipBtn  = document.getElementById("skipBtn");
const modeBtn  = document.getElementById("modeBtn");
const resetBtn = document.getElementById("resetBtn");
const installBtn = document.getElementById("installBtn");

const SHARPS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_TO_SHARP = {"Db":"C#","Eb":"D#","Gb":"F#","Ab":"G#","Bb":"A#"};

function toSharp(note){ return FLAT_TO_SHARP[note] || note; }
function pcIndex(note){ return SHARPS.indexOf(toSharp(note)); }
function fromPcIndex(i){ return SHARPS[((i%12)+12)%12]; }
function pretty(note){ return note.replace("b","♭").replace("#","♯"); }

const MAJOR_STEPS = [0,2,4,5,7,9,11];
const NAT_MINOR_STEPS = [0,2,3,5,7,8,10];

const DEGREE_BANK_MAJOR = ["1","2","3","4","5","6","7","b2","b3","b6","b7","#4","#5"];
const DEGREE_BANK_MINOR = ["1","2","b3","4","5","b6","b7","b2","3","6","7","#4","#5"];

const KEY_BANK = ["C","G","D","A","E","B","F#","F","Bb","Eb","Ab","Db"];

const MAX_STEPS = 12;
const STEP_UP = 1;
const STEP_DOWN = 2;

let state = {
  running:false,
  locked:false,
  mode:"Major",
  score:0,
  streak:0,
  qNum:1,
  secondsPerQ: 10,
  timeLeft: 10,
  timerId:null,
  current:null,
  climb: 0,
  firstTriesLeft: 3
};

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function degreeToSemitones(degStr, mode){
  const accidental = degStr.startsWith("b") ? -1 : degStr.startsWith("#") ? +1 : 0;
  const num = parseInt(degStr.replace(/[b#]/g,""), 10);
  const steps = (mode==="Major") ? MAJOR_STEPS : NAT_MINOR_STEPS;
  const base = steps[num-1];
  return base + accidental;
}

function buildQuestion(){
  const key = pick(KEY_BANK);
  const bank = (state.mode==="Major") ? DEGREE_BANK_MAJOR : DEGREE_BANK_MINOR;
  const degree = pick(bank);

  const rootPc = pcIndex(key);
  const semis = degreeToSemitones(degree, state.mode);
  const answerNote = fromPcIndex(rootPc + semis);

  return { key, degree, answerNote };
}

function buildOptions(correct){
  const others = SHARPS.filter(n => n !== correct);
  const chosen = shuffle(others).slice(0,6);
  return shuffle([correct, ...chosen]);
}

function setQuestionUI(q){
  const degPretty = q.degree.replace("b","♭").replace("#","♯");
  questionText.textContent = `What is the ${degPretty} in the key of ${q.key} ${state.mode}?`;
  qLabel.textContent = String(state.qNum);
}

function renderAnswers(options){
  answersEl.innerHTML = "";
  options.forEach(note => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.textContent = pretty(note);
    btn.addEventListener("click", () => onAnswer(note));
    answersEl.appendChild(btn);
  });
}

function setButtonsEnabled(enabled){
  answersEl.querySelectorAll("button.answer").forEach(b => b.disabled = !enabled);
}

function updateHUD(){
  modeLabel.textContent = state.mode;
  streakLabel.textContent = String(state.streak);
  scoreLabel.textContent = String(state.score);
  stepsLabel.textContent = String(state.climb);
  triesLabel.textContent = (state.qNum === 1) ? String(state.firstTriesLeft) : "—";
}

function stopTimer(){
  if(state.timerId){
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function paintTimer(){
  timerText.textContent = String(state.timeLeft).padStart(2,"0");
  timerText.classList.remove("timeLow","timeOut");
  if(state.timeLeft <= 3 && state.timeLeft > 0) timerText.classList.add("timeLow");
  if(state.timeLeft <= 0) timerText.classList.add("timeOut");
}

/*************************************************
 * AUDIO (Web Audio API) — single-file, no assets
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
  beep({freq:880, duration:0.09, gain:0.14});
  setTimeout(() => beep({freq:1175, duration:0.12, gain:0.14}), 90);
}
function soundWrong(){
  beep({freq:220, duration:0.18, type:"square", gain:0.12});
}
function soundTick(){
  beep({freq:1000, duration:0.03, type:"square", gain:0.05});
}

/*************************************************
 * STAIR PROGRESS (SVG line art)
 *************************************************/
const stairSvg = document.getElementById("stairSvg");
const stairsPath = document.getElementById("stairsPath");
const stepHighlight = document.getElementById("stepHighlight");
const figureWrap = document.getElementById("figureWrap");
const figure = document.getElementById("figure");

function initStairs(){
  // Stair geometry
  const startX = 26;
  const startY = 98;
  const stepW = 14;
  const stepH = 7;
  const platformLen = 18;

  // Option 1: flat step platforms (disconnected segments)
  // Draw each step as a short horizontal line, plus a small riser at the far right.
  let d = "";
  for(let i=0;i<=MAX_STEPS;i++){
    const x0 = startX + stepW * i;
    const y  = startY - stepH * i;
    const x1 = x0 + platformLen;
    d += `M ${x0} ${y} L ${x1} ${y} `;
    d += `M ${x1} ${y} L ${x1} ${y - stepH} `;
  }
  stairsPath.setAttribute("d", d.trim());

  // Store for positioning
  stairSvg.dataset.startX = String(startX);
  stairSvg.dataset.startY = String(startY);
  stairSvg.dataset.stepW = String(stepW);
  stairSvg.dataset.stepH = String(stepH);
  stairSvg.dataset.platformLen = String(platformLen);

  renderFigure();
}

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function updateStepHighlight(){
  const startX = Number(stairSvg.dataset.startX || 26);
  const startY = Number(stairSvg.dataset.startY || 98);
  const stepW = Number(stairSvg.dataset.stepW || 14);
  const stepH = Number(stairSvg.dataset.stepH || 7);
  const platformLen = Number(stairSvg.dataset.platformLen || 18);

  const i = clamp(state.climb, 0, MAX_STEPS);
  const x0 = startX + stepW * i;
  const y  = startY - stepH * i;
  const x1 = x0 + platformLen;

  stepHighlight.setAttribute("d", `M ${x0} ${y} L ${x1} ${y}`);
  stepHighlight.classList.add("stepPulse");
}

function renderFigure(){
  const startX = Number(stairSvg.dataset.startX || 30);
  const startY = Number(stairSvg.dataset.startY || 98);
  const stepW = Number(stairSvg.dataset.stepW || 14);
  const stepH = Number(stairSvg.dataset.stepH || 7);

  // position the figure at the center of the current step
  const i = clamp(state.climb, 0, MAX_STEPS);
  const platformLen = Number(stairSvg.dataset.platformLen || 18);

  // Center the figure over the current platform segment
  const x0 = startX + stepW * i;
  const x = x0 + platformLen * 0.5;

  // Lift the figure so it stands above the platform
  const y = startY - stepH * i - 28;
  figureWrap.setAttribute("transform", `translate(${x},${y})`);
  updateStepHighlight();
}

function setRunner(active){
  figure.classList.toggle("running", !!active);
}

function doFallFX(){
  stairSvg.classList.remove("fallShake");
  void stairSvg.offsetWidth;
  stairSvg.classList.add("fallShake");
  figureWrap.classList.remove("tumble");
  void figureWrap.getBBox();
  figureWrap.classList.add("tumble");
}

function moveClimb(delta, {shake=false, suppressEnd=false} = {}){
  const before = state.climb;
  state.climb = clamp(state.climb + delta, 0, MAX_STEPS);
  if(state.climb !== before){
    renderFigure();
    updateHUD();
  }

  // End conditions
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
  if(shake){
    doFallFX();
  }
}

function resetClimb(){
  state.climb = 0;
  renderFigure();
}

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

function _old_startTimer(){
  stopTimer();
  state.timeLeft = state.secondsPerQ;
  paintTimer();
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    paintTimer();
    if(state.timeLeft <= 0) timeUp();
  }, 1000);
}

function hideOverlays(){
  overlayBad.classList.remove("show");
  overlayGood.classList.remove("show");
}

function showBad(title, subtitle){
  fxBadBig.textContent = title || "Wrong!";
  fxBadSmall.textContent = subtitle || "Try the next one…";
  overlayBad.classList.add("show");
  questionBox.classList.add("shake");
  setTimeout(() => questionBox.classList.remove("shake"), 300);
}

function showGood(title, subtitle){
  fxGoodBig.textContent = title || "Correct!";
  fxGoodSmall.textContent = subtitle || "Nice — keep going…";
  overlayGood.classList.add("show");
}

function lockForFeedback(){
  state.locked = true;
  setButtonsEnabled(false);
  stopTimer();
}

function unlockAfterFeedback(){
  state.locked = false;
  hideOverlays();
  setButtonsEnabled(true);
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
  hideOverlays();
  state.current = buildQuestion();
  setQuestionUI(state.current);
  renderAnswers(buildOptions(state.current.answerNote));
  setButtonsEnabled(true);
  startTimer();
  statusText.textContent = "Pick the correct note.";
}

function onAnswer(note){
  if(!state.running || state.locked) return;

  const correct = state.current.answerNote;
  lockForFeedback();

  if(note === correct){
    const bonus = 10 + Math.min(10, state.streak);
    state.score += bonus;
    state.streak += 1;
    updateHUD();

    statusText.textContent = `✅ Correct: ${pretty(correct)} (+${bonus})`;
    showGood("Correct!", `Yes — ${pretty(correct)}.`);
    soundCorrect();

    // Stair climb: up 1 step
    moveClimb(STEP_UP);
  } else {
    state.score = Math.max(0, state.score - 4);
    state.streak = 0;
    updateHUD();
    statusText.textContent = `❌ Wrong: you picked ${pretty(note)}.`;
    showBad("Wrong!", `Correct was ${pretty(correct)}.`);
    soundWrong();
    // First-question grace: 3 tries while still on the ground floor
    if(state.qNum === 1 && state.climb === 0){
      state.firstTriesLeft = Math.max(0, state.firstTriesLeft - 1);
      updateHUD();

      if(state.firstTriesLeft <= 0){
        // No tries left → game over
        doFallFX();
        endGame({ title: "Game Over", body: "Out of tries on Question 1.", variant: "lose" });
        return;
      }

      // Feedback + fall FX, then retry SAME question (do not advance qNum)
      doFallFX();
      statusText.textContent = `❌ Wrong — Try again (Q1). Tries left: ${state.firstTriesLeft}`;
      showBad("Try again!", `Tries left for Question 1: ${state.firstTriesLeft}`);

      setTimeout(() => {
        unlockAfterFeedback();
        replayCurrentQuestion();
      }, ANSWER_PAUSE_MS);

      return;
    }

    // Stair fall: down 2 steps
    moveClimb(-STEP_DOWN, { shake:true });
  }

  state.qNum += 1;

  setTimeout(() => {
    unlockAfterFeedback();
    nextQuestion();
  }, ANSWER_PAUSE_MS);
}

function timeUp(){
  if(!state.running || state.locked) return;

  const correct = state.current?.answerNote || "";
  lockForFeedback();

  state.score = Math.max(0, state.score - 2);
  state.streak = 0;
  updateHUD();
  paintTimer();

  statusText.textContent = "⏱️ Time up!";
  soundWrong();

  // Stair fall: down 2 steps
  // First-question grace: 3 tries while still on the ground floor
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

    setTimeout(() => {
      unlockAfterFeedback();
      replayCurrentQuestion();
    }, ANSWER_PAUSE_MS);

    return;
  }

  // If already at bottom after Q1, game over
  if(state.climb === 0){
    endGame({ title: "Game Over", body: "Time ran out at the bottom of the stairs.", variant: "lose" });
    return;
  }

  moveClimb(-STEP_DOWN, { shake:true });

  showBad("Time!",  correct ? `Correct was ${pretty(correct)}.` : "Try the next one…");

  state.qNum += 1;

  setTimeout(() => {
    unlockAfterFeedback();
    nextQuestion();
  }, ANSWER_PAUSE_MS);
}

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
}

function skipQuestion(){
  if(!state.running || state.locked) return;

  lockForFeedback();
  statusText.textContent = "↪️ Skipped.";
  showBad("Skipped", "No penalty this time.");
  state.qNum += 1;

  setTimeout(() => {
    unlockAfterFeedback();
    nextQuestion();
  }, ANSWER_PAUSE_MS);
}

function toggleMode(){
  state.mode = (state.mode === "Major") ? "Minor" : "Major";
  updateHUD();
  statusText.textContent = `Mode set to ${state.mode}.`;
  if(state.running && !state.locked){
    stopTimer();
    nextQuestion();
  }
}

restartBtn.addEventListener("click", () => {
  resetGame();
  startGame();
});
closeEndBtn.addEventListener("click", () => {
  hideEnd();
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);
skipBtn.addEventListener("click", skipQuestion);
modeBtn.addEventListener("click", toggleMode);

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if(e.key === "Enter") startGame();
  if(k === "r") resetGame();
  if(k === "m") toggleMode();
  if(k === "s") skipQuestion();
});

/*************************************************
 * Install button (Chrome/Edge on GitHub Pages)
 *************************************************/
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-block";
  statusText.textContent = "Install available (click Install).";
});

installBtn.addEventListener("click", async () => {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = "none";
  statusText.textContent = "Installed (or install dismissed).";
});

function showEnd(){
  overlayEnd.classList.add("show");
  overlayEnd.setAttribute("aria-hidden", "false");
}
function hideEnd(){
  overlayEnd.classList.remove("show");
  overlayEnd.setAttribute("aria-hidden", "true");
}
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

updateHUD();
initStairs();
setRunner(false);
