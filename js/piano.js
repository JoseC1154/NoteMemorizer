// =========================
// Piano Visualization Module
// =========================

export function generatePianoKeys(pianoKeyboard, NOTE_TO_PC, NOTE_LIST, options = {}) {
  if (!pianoKeyboard) return;

  const { fullRange = false, octaveCount, whiteKeyPixelWidth = null } = options;
  
  pianoKeyboard.innerHTML = '';
  pianoKeyboard.style.width = '';
  pianoKeyboard.style.minWidth = '';

  if (fullRange) {
    const startMidi = 21; // A0
    const endMidi = 108; // C8
    const isBlackPitchClass = new Set([1, 3, 6, 8, 10]);

    let whiteKeyCount = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      const pitchClass = ((midi % 12) + 12) % 12;
      if (!isBlackPitchClass.has(pitchClass)) whiteKeyCount += 1;
    }

    const whiteKeyWidth = 100 / whiteKeyCount;
    let whiteKeyIndex = 0;

    for (let midi = startMidi; midi <= endMidi; midi++) {
      const pitchClass = ((midi % 12) + 12) % 12;
      const noteName = NOTE_LIST[pitchClass];
      const octave = Math.floor(midi / 12) - 1;
      const isBlack = isBlackPitchClass.has(pitchClass);

      if (!isBlack) {
        const leftPosition = whiteKeyIndex * whiteKeyWidth;

        const whiteKey = document.createElement('div');
        whiteKey.className = 'pianoKey white';
        whiteKey.dataset.note = noteName;
        whiteKey.dataset.octave = String(octave);
        whiteKey.style.position = 'absolute';
        whiteKey.style.left = `${leftPosition}%`;
        whiteKey.style.width = `${whiteKeyWidth}%`;
        whiteKey.style.height = '100%';
        whiteKey.style.top = '0';
        whiteKey.title = `${noteName}${octave}`;
        pianoKeyboard.appendChild(whiteKey);

        whiteKeyIndex += 1;
      } else {
        const blackLeft = (whiteKeyIndex - 1) * whiteKeyWidth + whiteKeyWidth * 0.75;

        const blackKey = document.createElement('div');
        blackKey.className = 'pianoKey black';
        blackKey.dataset.note = noteName;
        blackKey.dataset.octave = String(octave);
        blackKey.style.position = 'absolute';
        blackKey.style.left = `${blackLeft}%`;
        blackKey.style.width = `${whiteKeyWidth * 0.5}%`;
        blackKey.style.height = '60%';
        blackKey.style.top = '0';
        blackKey.title = `${noteName}${octave}`;
        pianoKeyboard.appendChild(blackKey);
      }
    }

    return;
  }
  
  // C, D, E, F, G, A, B for each octave
  const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  // Black keys after: C, D, _, F, G, A, _
  const hasBlackAfter = [true, true, false, true, true, true, false];
  const totalOctaves = octaveCount ?? 2;
  const whiteKeyCount = whiteNotes.length * totalOctaves; // 14 white keys
  const whiteKeyWidth = 100 / whiteKeyCount; // Percentage width per white key

  if (whiteKeyPixelWidth) {
    const keyboardWidthPx = whiteKeyCount * whiteKeyPixelWidth;
    pianoKeyboard.style.width = `${keyboardWidthPx}px`;
    pianoKeyboard.style.minWidth = `${keyboardWidthPx}px`;
  }
  
  let whiteKeyIndex = 0;
  
  for (let octave = 0; octave < totalOctaves; octave++) {
    for (let i = 0; i < whiteNotes.length; i++) {
      const noteName = whiteNotes[i];
      const leftPosition = whiteKeyIndex * whiteKeyWidth;
      
      // Create white key
      const whiteKey = document.createElement('div');
      whiteKey.className = 'pianoKey white';
      whiteKey.dataset.note = noteName;
      whiteKey.dataset.octave = octave;
      whiteKey.style.position = 'absolute';
      whiteKey.style.left = leftPosition + '%';
      whiteKey.style.width = whiteKeyWidth + '%';
      whiteKey.style.height = '100%';
      whiteKey.style.top = '0';
      whiteKey.title = noteName;
      pianoKeyboard.appendChild(whiteKey);
      
      // Add black key to the right of this white key if applicable
      if (hasBlackAfter[i]) {
        const blackKey = document.createElement('div');
        blackKey.className = 'pianoKey black';
        // Get the note name for the black key (semitone above)
        const whiteNotePC = NOTE_TO_PC.get(noteName);
        const blackNotePC = (whiteNotePC + 1) % 12;
        const blackNoteName = NOTE_LIST[blackNotePC];
        blackKey.dataset.note = blackNoteName;
        blackKey.dataset.octave = octave;
        blackKey.style.position = 'absolute';
        // Position black key between current and next white key
        blackKey.style.left = (leftPosition + whiteKeyWidth * 0.75) + '%';
        blackKey.style.width = (whiteKeyWidth * 0.5) + '%';
        blackKey.style.height = '60%';
        blackKey.style.top = '0';
        blackKey.title = blackNoteName;
        pianoKeyboard.appendChild(blackKey);
      }
      
      whiteKeyIndex++;
    }
  }
}

// Update piano visualization for a given key and scale
export function updatePianoVisualization(pianoKeyboard, rootKey, scaleType, SCALE_TYPES, NOTE_TO_PC, pcToNote) {
  if (!pianoKeyboard || !rootKey || !scaleType) {
    console.error('Piano update failed - missing:', { pianoKeyboard: !!pianoKeyboard, rootKey, scaleType });
    return;
  }
  
  const scale = SCALE_TYPES[scaleType];
  if (!scale) {
    console.error(`Unknown scale type: ${scaleType}`);
    return;
  }
  
  const rootPC = NOTE_TO_PC.get(rootKey);
  if (rootPC === undefined) {
    console.error(`Invalid root key: ${rootKey}`);
    return;
  }
  
  // Calculate all notes in the scale using the existing pcToNote function
  const scaleNotes = new Set();
  const noteDegrees = new Map();
  scale.forEach((offset, index) => {
    const notePitchClass = (rootPC + offset) % 12;
    const noteName = pcToNote(notePitchClass);
    scaleNotes.add(noteName);
    noteDegrees.set(noteName, String(index + 1));
  });
  
  console.log(`=== PIANO UPDATE: ${rootKey} ${scaleType} ===`);
  console.log('Scale notes:', Array.from(scaleNotes));
  
  // Update all keys - remove all classes first
  const keys = pianoKeyboard.querySelectorAll('.pianoKey');
  console.log(`Found ${keys.length} piano keys to update`);
  
  const inScaleKeys = [];
  const shadedKeys = [];
  
  keys.forEach(key => {
    const note = key.dataset.note;
    // Clear previous state - FORCE removal
    key.classList.remove('shaded', 'inScale');
    
    // Force a reflow to ensure CSS updates
    void key.offsetHeight;
    
    // Notes IN the scale: bright and clear with blue dot
    // Notes NOT in the scale: red overlay
    if (scaleNotes.has(note)) {
      key.classList.add('inScale');
      key.dataset.scaleLabel = note;
      key.dataset.degree = noteDegrees.get(note) || '';
      inScaleKeys.push(note);
    } else {
      key.classList.add('shaded');
      key.dataset.scaleLabel = '';
      key.dataset.degree = '';
      shadedKeys.push(note);
    }
  });
  
  console.log('Keys with blue dots (inScale):', inScaleKeys);
  console.log('Keys with red overlay (shaded):', shadedKeys);
  console.log('=============================');
}

// Highlight a specific note on the piano (for note-to-degree questions)
export function highlightQuestionNote(pianoKeyboard, questionNote) {
  if (!pianoKeyboard || !questionNote) return;
  
  const keys = pianoKeyboard.querySelectorAll('.pianoKey');
  
  // First remove any existing question highlights
  keys.forEach(key => {
    key.classList.remove('questionNote');
  });
  
  // Add highlight to the question note
  keys.forEach(key => {
    if (key.dataset.note === questionNote) {
      key.classList.add('questionNote');
    }
  });
  
  console.log(`Highlighted question note: ${questionNote}`);
}

// Clear question note highlight
export function clearQuestionHighlight(pianoKeyboard) {
  if (!pianoKeyboard) return;
  const keys = pianoKeyboard.querySelectorAll('.pianoKey');
  keys.forEach(key => {
    key.classList.remove('questionNote');
  });
}
