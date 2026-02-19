// =========================
// Guitar Visualization Module
// =========================

const STRING_TUNING = ["E", "B", "G", "D", "A", "E"]; // High E to low E
const TOTAL_FRETS = 12;
const MAX_FRET_RATIO = 1 - (1 / Math.pow(2, TOTAL_FRETS / 12));

function fretLeftPercent(fretNumber) {
  if (fretNumber <= 0) return 0;
  const ratio = 1 - (1 / Math.pow(2, fretNumber / 12));
  return (ratio / MAX_FRET_RATIO) * 100;
}

export function generateGuitarFretboard(guitarFretboard, NOTE_TO_PC, pcToNote) {
  if (!guitarFretboard) return;

  guitarFretboard.innerHTML = "";

  const neck = document.createElement("div");
  neck.className = "guitarNeck";
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
  const singleInlays = [3, 5, 7, 9];
  singleInlays.forEach(fret => {
    const fretStart = fretLeftPercent(fret - 1);
    const fretEnd = fretLeftPercent(fret);
    const center = (fretStart + fretEnd) / 2;

    const inlay = document.createElement("div");
    inlay.className = "guitarInlay";
    inlay.style.left = `${center}%`;
    neck.appendChild(inlay);
  });

  // Double inlay at 12th
  {
    const fretStart = fretLeftPercent(11);
    const fretEnd = fretLeftPercent(12);
    const center = (fretStart + fretEnd) / 2;

    const inlayTop = document.createElement("div");
    inlayTop.className = "guitarInlay double top";
    inlayTop.style.left = `${center}%`;
    neck.appendChild(inlayTop);

    const inlayBottom = document.createElement("div");
    inlayBottom.className = "guitarInlay double bottom";
    inlayBottom.style.left = `${center}%`;
    neck.appendChild(inlayBottom);
  }

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

      const fretStart = fret === 0 ? 0 : fretLeftPercent(fret - 1);
      const fretEnd = fretLeftPercent(fret);
      const xPercent = fret === 0 ? 0.8 : (fretStart + fretEnd) / 2;

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
  scale.forEach(offset => {
    scaleNotes.add(pcToNote(rootPC + offset));
  });

  const positions = guitarFretboard.querySelectorAll(".guitarPosition");
  positions.forEach(position => {
    position.classList.remove("shaded", "inScale", "questionNote");
    if (scaleNotes.has(position.dataset.note)) {
      position.classList.add("inScale");
    } else {
      position.classList.add("shaded");
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
