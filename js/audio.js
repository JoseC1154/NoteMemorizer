// =========================
// Audio Module (Web Audio API)
// =========================

let audioCtx = null;
let ambientGain = null;
let padGain = null;
let arpeggioGain = null;
let ambientOscillators = [];
let ambientInterval = null;

export function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

export function beep({ freq = 440, duration = 0.12, type = "sine", gain = 0.32 }, settings) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(g);
  g.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function soundCorrect(settings, getVolumeMultiplier) {
  const vol = getVolumeMultiplier(settings, 'correct');
  beep({ freq: 660, duration: 0.10, type: "sine", gain: 0.28 * vol }, settings);
  setTimeout(() => beep({ freq: 990, duration: 0.08, type: "triangle", gain: 0.24 * vol }, settings), 70);
}

export function soundWrong(settings, getVolumeMultiplier) {
  const vol = getVolumeMultiplier(settings, 'wrong');
  beep({ freq: 170, duration: 0.16, type: "sawtooth", gain: 0.24 * vol }, settings);
}

export function soundTick(settings, getVolumeMultiplier, state) {
  if (!settings.tickOn) return;
  
  const vol = getVolumeMultiplier(settings, 'tick');
  
  // Different tick sound during bonus time
  if (state.bonusActive) {
    // Higher, brighter tick with slight melody
    beep({ freq: 1760, duration: 0.03, type: "triangle", gain: 0.16 * vol }, settings);
    // Add subtle hi-hat
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const noise = audioCtx.createBufferSource();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.03, audioCtx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(10000, t0);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.08 * vol, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.004, t0 + 0.03);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noise.start(t0);
  } else {
    // Normal tick
    beep({ freq: 1200, duration: 0.03, type: "square", gain: 0.12 * vol }, settings);
  }
}

// Create reverb using convolver with impulse response
function createReverb() {
  ensureAudio();
  const convolver = audioCtx.createConvolver();
  
  // Create impulse response for reverb (simulating large space like Grand Canyon)
  const length = audioCtx.sampleRate * 3; // 3 second reverb tail
  const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  
  for (let i = 0; i < length; i++) {
    // Exponential decay for natural reverb
    const decay = Math.pow(1 - i / length, 3);
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }
  
  convolver.buffer = impulse;
  return convolver;
}

export function soundButtonClick(settings) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;

  // Create reverb for button sounds
  const reverb = createReverb();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const masterGain = audioCtx.createGain();
  
  dryGain.gain.setValueAtTime(0.6, t0); // 60% dry
  wetGain.gain.setValueAtTime(0.4, t0); // 40% wet
  masterGain.gain.setValueAtTime(1.0, t0);
  
  reverb.connect(wetGain);
  wetGain.connect(masterGain);
  dryGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  // Softer, melodic click (like degree toggle)
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(660, t0);
  osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.06);

  g.gain.setValueAtTime(0.36, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15); // Longer tail for reverb

  osc.connect(g);
  // Send to both dry and reverb
  g.connect(dryGain);
  g.connect(reverb);

  osc.start(t0);
  osc.stop(t0 + 0.2);
}

export function soundKeyToggle(settings) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;

  // Sharp, percussive click for key toggles
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = "square";
  osc.frequency.setValueAtTime(1200, t0);

  filter.type = "highpass";
  filter.frequency.setValueAtTime(800, t0);

  g.gain.setValueAtTime(0.32, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);

  osc.connect(filter);
  filter.connect(g);
  g.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + 0.05);
}

export function soundDegreeToggle(settings, getVolumeMultiplier) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;

  const vol = getVolumeMultiplier(settings, 'button');

  // Softer, melodic click for degree toggles
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(660, t0);
  osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.06);

  g.gain.setValueAtTime(0.36 * vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

  osc.connect(g);
  g.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + 0.07);
}

export function soundGameStart(settings) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;

  // Create reverb and wet/dry mix
  const reverb = createReverb();
  const dryGain = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const masterGain = audioCtx.createGain();
  
  dryGain.gain.setValueAtTime(0.4, t0); // 40% dry
  wetGain.gain.setValueAtTime(0.6, t0); // 60% wet (more reverb)
  masterGain.gain.setValueAtTime(1.0, t0);
  
  reverb.connect(wetGain);
  wetGain.connect(masterGain);
  dryGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  // Uplifting arpeggio for game start
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  
  notes.forEach((freq, i) => {
    const delay = i * 0.08;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0 + delay);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, t0 + delay);
    filter.Q.setValueAtTime(2, t0 + delay);

    g.gain.setValueAtTime(0, t0 + delay);
    g.gain.linearRampToValueAtTime(0.48, t0 + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.004, t0 + delay + 0.5); // Longer tail for reverb

    osc.connect(filter);
    filter.connect(g);
    // Send to both dry and reverb
    g.connect(dryGain);
    g.connect(reverb);

    osc.start(t0 + delay);
    osc.stop(t0 + delay + 0.6);
  });
}

export function soundGameOver(settings, getVolumeMultiplier) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const vol = getVolumeMultiplier(settings, 'gameOver');

  // Atmospheric descending pad for game over (not harsh or frustrating)
  const chord = [523.25, 415.30, 349.23]; // C5, G#4, F4 - minor but not sad
  
  chord.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t0 + 1.5); // Gentle pitch drop

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1500, t0);
    filter.frequency.exponentialRampToValueAtTime(300, t0 + 1.5);
    filter.Q.setValueAtTime(1, t0);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.24 * vol, t0 + 0.3); // Gentle fade in
    g.gain.setValueAtTime(0.24 * vol, t0 + 1.0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.5); // Fade out

    osc.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);

    osc.start(t0);
    osc.stop(t0 + 1.6);
  });
}

export function soundBonusActivate(settings, getVolumeMultiplier) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const vol = getVolumeMultiplier(settings, 'bonus');

  // Ascending arpeggio with sparkle effect
  const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 - major chord arpeggio
  
  frequencies.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0 + i * 0.06);

    filter.type = "highpass";
    filter.frequency.setValueAtTime(800, t0 + i * 0.06);

    g.gain.setValueAtTime(0.32 * vol, t0 + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.06 + 0.15);

    osc.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);

    osc.start(t0 + i * 0.06);
    osc.stop(t0 + i * 0.06 + 0.2);
  });

  // Add subtle hi-hat shimmer
  const noise = audioCtx.createBufferSource();
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }
  noise.buffer = noiseBuffer;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.setValueAtTime(8000, t0);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.16 * vol, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.004, t0 + 0.3);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  noise.start(t0);
}

export function soundBonusExpire(settings, getVolumeMultiplier) {
  if (!settings.audioOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const vol = getVolumeMultiplier(settings, 'bonus');

  // Descending notes to signal end
  const frequencies = [783.99, 659.25, 523.25]; // G5, E5, C5 - descending
  
  frequencies.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + i * 0.08);

    g.gain.setValueAtTime(0.24 * vol, t0 + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.08 + 0.12);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start(t0 + i * 0.08);
    osc.stop(t0 + i * 0.08 + 0.15);
  });
}

// =========================
// Ambient Background Music
// =========================

export function startAmbientMusic(settings, getVolumeMultiplier) {
  if (!settings.ambientOn) return;
  stopAmbientMusic();
  
  ensureAudio();
  
  const padVol = getVolumeMultiplier(settings, 'pad');
  const arpeggioVol = getVolumeMultiplier(settings, 'arpeggio');
  
  // Create gain nodes for ambient music (persistent for volume control)
  ambientGain = audioCtx.createGain();
  ambientGain.gain.setValueAtTime(0.24, audioCtx.currentTime);
  ambientGain.connect(audioCtx.destination);
  
  // Create separate gain nodes for pad and arpeggio
  padGain = audioCtx.createGain();
  padGain.gain.setValueAtTime(padVol, audioCtx.currentTime);
  padGain.connect(ambientGain);
  
  arpeggioGain = audioCtx.createGain();
  arpeggioGain.gain.setValueAtTime(arpeggioVol, audioCtx.currentTime);
  arpeggioGain.connect(ambientGain);
  
  // Uplifting chord progression: Cmaj9, Fmaj9, Gmaj7, Cmaj9
  const chords = [
    [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9: C E G B D
    [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9: F A C E G
    [196.00, 246.94, 293.66, 369.99],         // Gmaj7: G B D F#
    [261.63, 329.63, 392.00, 493.88, 587.33]  // Cmaj9: C E G B D
  ];
  
  let currentChord = 0;
  
  function playChord(frequencies) {
    // Stop previous oscillators
    ambientOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch(e) {}
    });
    ambientOscillators = [];
    
    const now = audioCtx.currentTime;
    const fadeDuration = 4.0;
    const chordDuration = 16.0;
    
    // Warm analog-style pad with slight detuning
    frequencies.forEach((freq, i) => {
      // Create two slightly detuned oscillators per note for warmth
      for (let j = 0; j < 2; j++) {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        
        osc.type = 'triangle'; // Warmer, more analog sound
        const detune = j === 0 ? -2 : 2; // Slight detuning for analog warmth
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);
        
        // Smooth fade in and out, quieter per oscillator since we have 2x
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.16, now + fadeDuration);
        oscGain.gain.setValueAtTime(0.16, now + chordDuration - fadeDuration);
        oscGain.gain.linearRampToValueAtTime(0, now + chordDuration);
        
        osc.connect(oscGain);
        oscGain.connect(padGain);
        
        osc.start(now);
        osc.stop(now + chordDuration);
        
        ambientOscillators.push(osc);
      }
    });
    
    // Add soft percussive element (hi-hat style)
    const noise = audioCtx.createBufferSource();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(8000, now);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now); // Very soft
    noiseGain.gain.exponentialRampToValueAtTime(0.004, now + 0.1);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ambientGain);
    
    noise.start(now);
    noise.stop(now + 0.1);
    
    // Create reverb for arpeggio
    const reverb = createReverb();
    const arpDryGain = audioCtx.createGain();
    const arpWetGain = audioCtx.createGain();
    const arpMasterGain = audioCtx.createGain();
    
    arpDryGain.gain.setValueAtTime(0.3, now); // 30% dry
    arpWetGain.gain.setValueAtTime(0.7, now); // 70% wet (lots of reverb)
    arpMasterGain.gain.setValueAtTime(1.0, now);
    
    reverb.connect(arpWetGain);
    arpWetGain.connect(arpMasterGain);
    arpDryGain.connect(arpMasterGain);
    arpMasterGain.connect(arpeggioGain);
    
    // Add Stranger Things style arpeggio
    const arpNoteLength = 0.25; // 250ms per note
    const arpPattern = [0, 2, 1, 3, 2, 4, 3, 2]; // Up and down pattern through chord
    
    arpPattern.forEach((noteIndex, i) => {
      if (noteIndex >= frequencies.length) return;
      
      const arpTime = now + (i * arpNoteLength);
      const arpOsc = audioCtx.createOscillator();
      const arpGain = audioCtx.createGain();
      const arpFilter = audioCtx.createBiquadFilter();
      
      // Classic 80s synth sound
      arpOsc.type = 'sawtooth';
      arpOsc.frequency.setValueAtTime(frequencies[noteIndex] * 2, arpTime); // One octave up
      
      // Low-pass filter for that analog warmth
      arpFilter.type = 'lowpass';
      arpFilter.frequency.setValueAtTime(1200, arpTime);
      arpFilter.Q.setValueAtTime(3, arpTime);
      
      // Quick attack, short decay for plucky sound
      arpGain.gain.setValueAtTime(0, arpTime);
      arpGain.gain.linearRampToValueAtTime(0.60, arpTime + 0.01);
      arpGain.gain.exponentialRampToValueAtTime(0.004, arpTime + arpNoteLength);
      
      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      // Send to both dry and reverb
      arpGain.connect(arpDryGain);
      arpGain.connect(reverb);
      
      arpOsc.start(arpTime);
      arpOsc.stop(arpTime + arpNoteLength);
      
      ambientOscillators.push(arpOsc);
    });
    
    // Repeat arpeggio pattern throughout the chord duration
    const arpLoopTime = arpPattern.length * arpNoteLength;
    const numLoops = Math.floor(chordDuration / arpLoopTime) - 1;
    
    for (let loop = 1; loop < numLoops; loop++) {
      const loopStartTime = now + (loop * arpLoopTime);
      
      arpPattern.forEach((noteIndex, i) => {
        if (noteIndex >= frequencies.length) return;
        
        const arpTime = loopStartTime + (i * arpNoteLength);
        const arpOsc = audioCtx.createOscillator();
        const arpGain = audioCtx.createGain();
        const arpFilter = audioCtx.createBiquadFilter();
        
        arpOsc.type = 'sawtooth';
        arpOsc.frequency.setValueAtTime(frequencies[noteIndex] * 2, arpTime);
        
        arpFilter.type = 'lowpass';
        arpFilter.frequency.setValueAtTime(1200, arpTime);
        arpFilter.Q.setValueAtTime(3, arpTime);
        
        arpGain.gain.setValueAtTime(0, arpTime);
        arpGain.gain.linearRampToValueAtTime(0.60, arpTime + 0.01);
        arpGain.gain.exponentialRampToValueAtTime(0.004, arpTime + arpNoteLength);
        
        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        // Send to both dry and reverb
        arpGain.connect(arpDryGain);
        arpGain.connect(reverb);
        
        arpOsc.start(arpTime);
        arpOsc.stop(arpTime + arpNoteLength);
        
        ambientOscillators.push(arpOsc);
      });
    }
  }
  
  // Start with first chord
  playChord(chords[currentChord]);
  
  // Progress through chords
  ambientInterval = setInterval(() => {
    if (!settings.ambientOn) {
      stopAmbientMusic();
      return;
    }
    currentChord = (currentChord + 1) % chords.length;
    playChord(chords[currentChord]);
  }, 16000);
}

export function stopAmbientMusic() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
  
  ambientOscillators.forEach(osc => {
    try {
      osc.stop();
    } catch(e) {}
  });
  ambientOscillators = [];
  
  if (padGain) {
    padGain.disconnect();
    padGain = null;
  }
  
  if (arpeggioGain) {
    arpeggioGain.disconnect();
    arpeggioGain = null;
  }
  
  if (ambientGain) {
    ambientGain.disconnect();
    ambientGain = null;
  }
}

export function updateAmbientVolume(settings, getVolumeMultiplier) {
  if (padGain && audioCtx) {
    const padVol = getVolumeMultiplier(settings, 'pad');
    padGain.gain.setValueAtTime(padVol, audioCtx.currentTime);
  }
  if (arpeggioGain && audioCtx) {
    const arpeggioVol = getVolumeMultiplier(settings, 'arpeggio');
    arpeggioGain.gain.setValueAtTime(arpeggioVol, audioCtx.currentTime);
  }
}
