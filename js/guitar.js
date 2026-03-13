// =========================
// Guitar Visualization Module
// =========================

const STRING_TUNING = ["E", "B", "G", "D", "A", "E"]; // High E to low E
const TOTAL_FRETS = 24;
const DEFAULT_VISIBLE_FRETS = 5;
const MAX_FRET_RATIO = 1 - (1 / Math.pow(2, TOTAL_FRETS / 12));

function fretRatioForCount(fretCount) {
  return 1 - (1 / Math.pow(2, fretCount / 12));
}

function getVisibleFretCount(guitarFretboard) {
  const rect = guitarFretboard.getBoundingClientRect();
  if (!rect.width || !rect.height) return DEFAULT_VISIBLE_FRETS;

  const targetPxPerFret = Math.max(72, rect.height * 0.44);
  const approx = Math.round(rect.width / targetPxPerFret);
  return Math.max(DEFAULT_VISIBLE_FRETS, Math.min(TOTAL_FRETS, approx));
}

function fretLeftPercent(fretNumber) {
  if (fretNumber <= 0) return 0;
  const ratio = 1 - (1 / Math.pow(2, fretNumber / 12));
  return (ratio / MAX_FRET_RATIO) * 100;
}

export function generateGuitarFretboard(guitarFretboard, NOTE_TO_PC, pcToNote) {
  if (!guitarFretboard) return;

  guitarFretboard.innerHTML = "";
  guitarFretboard.scrollLeft = 0;

  const neck = document.createElement("div");
  neck.className = "guitarNeck";
  neck.style.width = "250.483%";
  guitarFretboard.appendChild(neck);

  const nut = document.createElement("div");
  nut.className = "guitarNut";
  neck.appendChild(nut);

  // Frets
  for (let fret = 1; fret <= TOTAL_FRETS; fret++) {
    const fretEl = document.createElement("div");
    fretEl.className = "guitarFret";
    fretEl.style.left = `${fretLeftPercent(fret)}%`;
    neck.appendChild(fretEl);
  }

  // Inlays
  const singleInlays = [3, 5, 7, 9, 15, 17, 19, 21];
  singleInlays.forEach(fret => {
    const fretStart = fretLeftPercent(fret - 1);
    const fretEnd = fretLeftPercent(fret);
    const center = (fretStart + fretEnd) / 2;

    const inlay = document.createElement("div");
    inlay.className = "guitarInlay";
    inlay.style.left = `${center}%`;
    neck.appendChild(inlay);
  });

  // Double inlays at 12th and 24th
  [12, 24].forEach(fret => {
    const fretStart = fretLeftPercent(fret - 1);
    const fretEnd = fretLeftPercent(fret);
    const center = (fretStart + fretEnd) / 2;

    const inlay1 = document.createElement("div");
    inlay1.className = "guitarInlay";
    inlay1.style.left = `calc(${center}% - 8px)`;
    neck.appendChild(inlay1);

    const inlay2 = document.createElement("div");
    inlay2.className = "guitarInlay";
    inlay2.style.left = `calc(${center}% + 8px)`;
    neck.appendChild(inlay2);
  });

  // Strings and note positions
  STRING_TUNING.forEach((openNote, stringIndex) => {
    const yPercent = (stringIndex + 1) * (100 / (STRING_TUNING.length + 1));

    const stringEl = document.createElement("div");
    stringEl.className = `guitarString s${stringIndex + 1}`;
    stringEl.style.top = `${yPercent}%`;
    neck.appendChild(stringEl);

    const openPc = NOTE_TO_PC.get(openNote);

    for (let fret = 0; fret <= TOTAL_FRETS; fret++) {
      const notePc = (openPc + fret) % 12;
      const noteName = pcToNote(notePc);

      let xPercent = 0;
      if (fret > 0) {
        const fretStart = fretLeftPercent(fret - 1);
        const fretEnd = fretLeftPercent(fret);
        xPercent = fret < TOTAL_FRETS ? (fretStart + fretEnd) / 2 : fretStart;
      }

      const position = document.createElement("div");
      position.className = "guitarPosition";
      position.dataset.note = noteName;
      position.dataset.string = String(stringIndex + 1);
      position.dataset.fret = String(fret);
      position.style.left = `${xPercent}%`;
      position.style.top = `${yPercent}%`;
      position.title = `${noteName} (String ${stringIndex + 1}, Fret ${fret})`;

      neck.appendChild(position);
    }
  });
}

export function updateGuitarVisualization(guitarFretboard, rootKey, scaleType, SCALE_TYPES, NOTE_TO_PC, pcToNote) {
  if (!guitarFretboard || !rootKey || !scaleType) return;

  const scale = SCALE_TYPES[scaleType];
  if (!scale) return;

  const rootPC = NOTE_TO_PC.get(rootKey);
  if (rootPC === undefined) return;

  const scaleNotes = new Set();
  const noteDegrees = new Map();
  scale.forEach((offset, index) => {
    const noteName = pcToNote(rootPC + offset);
    scaleNotes.add(noteName);
    noteDegrees.set(noteName, String(index + 1));
  });

  const positions = guitarFretboard.querySelectorAll(".guitarPosition");
  positions.forEach(position => {
    position.classList.remove("shaded", "inScale", "questionNote");
    if (scaleNotes.has(position.dataset.note)) {
      position.classList.add("inScale");
      position.dataset.scaleLabel = position.dataset.note;
      position.dataset.degree = noteDegrees.get(position.dataset.note) || "";
    } else {
      position.classList.add("shaded");
      position.dataset.scaleLabel = "";
      position.dataset.degree = "";
    }
  });
}

export function highlightGuitarQuestionNote(guitarFretboard, questionNote) {
  if (!guitarFretboard || !questionNote) return;

  const positions = guitarFretboard.querySelectorAll(".guitarPosition");
  positions.forEach(position => {
    position.classList.remove("questionNote");
    if (position.dataset.note === questionNote) {
      position.classList.add("questionNote");
    }
  });
}

export function clearGuitarQuestionHighlight(guitarFretboard) {
  if (!guitarFretboard) return;
  const positions = guitarFretboard.querySelectorAll(".guitarPosition");
  positions.forEach(position => {
    position.classList.remove("questionNote");
  });
}
