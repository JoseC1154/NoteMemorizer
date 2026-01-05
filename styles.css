/* Basic reset only */
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; }

/* App layout */
:root{
  --bg0: #070A12;
  --bg1: #0A1022;
  --panel: rgba(255,255,255,0.06);
  --panel2: rgba(255,255,255,0.09);
  --border: rgba(255,255,255,0.14);
  --text: rgba(255,255,255,0.92);
  --muted: rgba(255,255,255,0.72);
  --shadow: 0 14px 45px rgba(0,0,0,0.55);
  --radius: 16px;
}

body{
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: var(--text);
  background: radial-gradient(1200px 900px at 50% 0%, #15214a 0%, var(--bg0) 55%, #02030a 100%);
}

.app{
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 12px;
  max-width: 860px;
  margin: 0 auto;
}

.header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.titleBlock{ display:flex; flex-direction:column; gap:2px; }
.title{ margin: 0; font-size: 22px; letter-spacing: 0.3px; }
.subtitle{ margin: 0; font-size: 12px; color: var(--muted); }

.controls{ display:flex; gap: 10px; align-items:center; }

.btn{
  appearance: none;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.06);
  color: var(--text);
  padding: 10px 12px;
  border-radius: 12px;
  font-weight: 650;
  letter-spacing: 0.2px;
  cursor: pointer;
  touch-action: manipulation;
}
.btn:active{ transform: translateY(1px); }
.btn.primary{
  background: linear-gradient(180deg, rgba(64,230,160,0.20), rgba(64,230,160,0.10));
  border-color: rgba(64,230,160,0.35);
}

.iconBtn{
  appearance: none;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.06);
  color: var(--text);
  width: 40px;
  height: 40px;
  border-radius: 12px;
  font-size: 22px;
  cursor: pointer;
}

.main{
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.questionBox{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03));
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.questionText{
  font-size: clamp(18px, 4.2vw, 30px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0.2px;
}

.timerRow{
  display:flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid rgba(255,255,255,0.10);
}
.timerLabel{
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.timer{
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: 900;
}

/* Status panel with animated moving gradient */
.statusPanel{
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
  min-height: 88px;
  background: rgba(255,255,255,0.03);
}
.statusPanel::before{
  content:"";
  position:absolute;
  inset: -40%;
  background: linear-gradient(110deg,
      rgba(20,180,255,0.65),
      rgba(60,255,190,0.55),
      rgba(255,60,60,0.55),
      rgba(20,180,255,0.65));
  background-size: 300% 300%;
  animation: drift 5s linear infinite;
  filter: blur(22px);
  opacity: 0.55;
  transform: translateZ(0);
}
@keyframes drift{
  0% { background-position: 0% 50%; transform: translate(-2%, -2%) rotate(0deg); }
  50%{ background-position: 100% 50%; transform: translate(2%, 2%) rotate(4deg); }
  100%{ background-position: 0% 50%; transform: translate(-2%, -2%) rotate(0deg); }
}

/* Good / Bad emphasis (JS toggles ONLY these classes) */
.statusPanel.good::before{ opacity: 0.65; filter: blur(20px) saturate(1.2); }
.statusPanel.bad::before { opacity: 0.75; filter: blur(20px) saturate(1.3) contrast(1.05); }

.statusInner{
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  align-items: center;
}

.statusText{
  font-size: 14px;
  font-weight: 750;
  color: rgba(255,255,255,0.92);
  line-height: 1.2;
}

/* Faces rendered via CSS (no images) */
.face{
  width: 54px;
  height: 54px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.22);
  background: rgba(0,0,0,0.28);
  position: relative;
  display: none; /* shown by good/bad only */
  box-shadow: 0 10px 20px rgba(0,0,0,0.35);
}
.face::before, .face::after{
  content:"";
  position:absolute;
  top: 18px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
}
.face::before{ left: 16px; }
.face::after{ right: 16px; }

/* Mouths via background strokes */
.faceGood{
  border-color: rgba(80,255,190,0.35);
  background:
    linear-gradient(rgba(230,255,248,0.92), rgba(230,255,248,0.92));
  background-size: 22px 3px;
  background-position: 50% 34px;
  background-repeat: no-repeat;
  box-shadow:
    inset 0 -10px 0 rgba(60,255,190,0.08),
    0 10px 20px rgba(0,0,0,0.35);
}
.faceBad{
  border-color: rgba(255,90,90,0.42);
  background:
    linear-gradient(rgba(255,240,240,0.92), rgba(255,240,240,0.92));
  background-size: 22px 3px;
  background-position: 50% 37px;
  background-repeat: no-repeat;
  box-shadow:
    inset 0 -10px 0 rgba(255,70,70,0.08),
    0 10px 20px rgba(0,0,0,0.35);
}

/* Show the correct face based on panel class */
.statusPanel.good .faceGood{ display:block; }
.statusPanel.bad  .faceBad { display:block; }
.statusPanel.good .faceBad { display:none; }
.statusPanel.bad  .faceGood{ display:none; }

/* Answers */
.answers{
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 12px;
}

.answerGrid{
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.answerBtn{
  appearance: none;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(0,0,0,0.22);
  color: var(--text);
  border-radius: 14px;
  padding: 14px 12px;
  font-size: clamp(18px, 4.2vw, 26px);
  font-weight: 900;
  letter-spacing: 0.3px;
  cursor: pointer;
  min-height: 54px;
  touch-action: manipulation;
  box-shadow: 0 10px 25px rgba(0,0,0,0.28);
  transition: transform 120ms ease, background 180ms ease, border-color 180ms ease;
}
.answerBtn:active{ transform: translateY(1px) scale(0.99); }
.answerBtn[disabled]{
  opacity: 0.55;
  cursor: not-allowed;
}

/* 7th button spans full width */
.answerBtn:nth-child(7){
  grid-column: 1 / -1;
}

/* Modal */
.modalOverlay{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  z-index: 50;
}

.modal{
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(92vw, 560px);
  max-height: 86vh;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(10,14,26,0.92);
  box-shadow: 0 28px 80px rgba(0,0,0,0.65);
  z-index: 60;
}

.modalHeader{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.10);
}
.modalHeader h2{
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.2px;
}

.modalBody{
  padding: 14px;
  display: grid;
  gap: 14px;
}
.modalFooter{
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(255,255,255,0.10);
  display:flex;
  justify-content: flex-end;
}

.settingGroup{
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 12px;
  display:grid;
  gap: 10px;
}
.settingLabel{
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.3px;
}
.settingHint{
  margin: -6px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.keyToggles{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.keyBtn{
  appearance:none;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.18);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 8px;
  font-weight: 850;
  cursor: pointer;
}
.keyBtn[aria-pressed="true"]{
  background: rgba(60,255,190,0.12);
  border-color: rgba(60,255,190,0.34);
}

.sliderRow{
  display:flex;
  align-items:center;
  gap: 10px;
}
.slider{
  width: 100%;
}
.sliderValue{
  min-width: 46px;
  text-align: right;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}

.segmented{
  display:flex;
  gap: 8px;
}
.segBtn{
  flex:1;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.18);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 10px;
  font-weight: 850;
  cursor: pointer;
}
.segBtn[aria-checked="true"]{
  background: rgba(20,180,255,0.13);
  border-color: rgba(20,180,255,0.34);
}

.toggleRow{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.toggleBtn{
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.18);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 850;
  cursor: pointer;
}
.toggleBtn[aria-pressed="true"]{
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.22);
}

/* Responsive: landscape mobile hides non-essential UI (CSS only) */
@media (orientation: landscape) and (max-height: 520px){
  .header{ display:none; }
  .statusPanel{ display:none; }
  .app{ padding: 10px; gap: 10px; }
  .questionBox{ padding: 12px; }
  .answers{ padding: 10px; }
}

/* Ensure no overflow on mobile portrait */
@media (max-width: 420px){
  .keyToggles{ grid-template-columns: repeat(3, 1fr); }
  .btn{ padding: 10px 10px; }
}
