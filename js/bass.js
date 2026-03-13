// =========================
// Bass Visualization Module
// =========================

const STRING_TUNING = ["G", "D", "A", "E"]; // High G to low E (4-string bass)
const TOTAL_FRETS = 24;
const DEFAULT_VISIBLE_FRETS = 5;
const MAX_FRET_RATIO = 1 - (1 / Math.pow(2, TOTAL_FRETS / 12));

function fretRatioForCount(fretCount) {
  return 1 - (1 / Math.pow(2, fretCount / 12));
}

function getVisibleFretCount(bassFretboard) {
  const rect = bassFretboard.getBoundingClientRect();
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

export function generateBassFretboard(bassFretboard, NOTE_TO_PC, pcToNote) {
  if (!bassFretboard) return;

  bassFretboard.innerHTML = "";
  bassFretboard.scrollLeft = 0;

  const neck = document.createElement("div");
  neck.className = "bassNeck";
  const isPhoneSizedViewport = window.matchMedia("(max-width: 767px)").matches;
  neck.style.width = isPhoneSizedViewport ? "250.483%" : "159.483%";
  bassFretboard.appendChild(neck);

  const nut = document.createElement("div");
  nut.className = "bassNut";
  neck.appendChild(nut);

  // Frets
  for (let fret = 1; fret <= TOTAL_FRETS; fret++) {
    const fretEl = document.createElement("div");
    fretEl.className = "bassFret";
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
    inlay.className = "bassInlay";
    inlay.style.left = `${center}%`;
    neck.appendChild(inlay);
  });

  // Double inlays at 12th and 24th
  [12, 24].forEach(fret => {
    const fretStart = fretLeftPercent(fret - 1);
    const fretEnd = fretLeftPercent(fret);
    const center = (fretStart + fretEnd) / 2;

    const inlay1 = document.createElement("div");
    inlay1.className = "bassInlay";
    inlay1.style.left = `calc(${center}% - 8px)`;
    neck.appendChild(inlay1);

    const inlay2 = document.createElement("div");
    inlay2.className = "bassInlay";
    inlay2.style.left = `calc(${center}% + 8px)`;
    neck.appendChild(inlay2);
  });

  // Strings
  for (let stringIndex = 0; stringIndex < STRING_TUNING.length; stringIndex++) {
    const stringEl = document.createElement("div");
    stringEl.className = `bassString s${stringIndex + 1}`;
    stringEl.style.top = (stringIndex / (STRING_TUNING.length - 1)) * 80 + 10 + "%";
    neck.appendChild(stringEl);

    // Positions (note clickables)
    for (let fret = 0; fret <= TOTAL_FRETS; fret++) {
      const position = document.createElement("div");
      position.className = "bassPosition";

      let xPercent = 0;
      if (fret > 0) {
        const fretStart = fretLeftPercent(fret - 1);
        const fretEnd = fretLeftPercent(fret);
        xPercent = fret < TOTAL_FRETS ? (fretStart + fretEnd) / 2 : fretStart;
      }

      position.style.left = `${xPercent}%`;
      position.style.top = (stringIndex / (STRING_TUNING.length - 1)) * 80 + 10 + "%";

      // Calculate note at this position
      const openStringNote = STRING_TUNING[stringIndex];
      const openStringPC = NOTE_TO_PC.get(openStringNote);
      const notePC = (openStringPC + fret) % 12;
      const note = pcToNote(notePC);

      position.dataset.note = note;
      position.dataset.string = stringIndex;
      position.dataset.fret = fret;
      position.title = `${note} (Fret ${fret})`;

      neck.appendChild(position);
    }
  }
}

export function updateBassVisualization(bassFretboard, keyRoot, scaleType, SCALE_TYPES, NOTE_TO_PC, pcToNote) {
  if (!bassFretboard) return;

  // Get scale notes
  const scaleOffsets = SCALE_TYPES[scaleType] || SCALE_TYPES["major"];
  const rootPC = NOTE_TO_PC.get(keyRoot);
  const scaleNotes = new Set();
  const noteDegrees = new Map();
  scaleOffsets.forEach((offset, index) => {
    const notePc = (rootPC + offset) % 12;
    scaleNotes.add(notePc);
    noteDegrees.set(notePc, String(index + 1));
  });

  // Update positions
  const positions = bassFretboard.querySelectorAll(".bassPosition");
  positions.forEach(position => {
    const note = position.dataset.note;
    const notePC = NOTE_TO_PC.get(note);
    if (scaleNotes.has(notePC)) {
      position.classList.add("inScale");
      position.dataset.scaleLabel = note;
      position.dataset.degree = noteDegrees.get(notePC) || "";
    } else {
      position.classList.remove("inScale");
      position.dataset.scaleLabel = "";
      position.dataset.degree = "";
    }
  });
}

export function highlightBassQuestionNote(bassFretboard, note) {
  if (!bassFretboard) return;
  const positions = bassFretboard.querySelectorAll(".bassPosition");
  positions.forEach(position => {
    if (position.dataset.note === note) {
      position.classList.add("questionNote");
    }
  });
}

export function clearBassQuestionHighlight(bassFretboard) {
  if (!bassFretboard) return;
  const positions = bassFretboard.querySelectorAll(".bassPosition.questionNote");
  positions.forEach(position => {
    position.classList.remove("questionNote");
  });
}
