/*
ProgressWrap feedback update (LAST UPDATE)

Purpose:
- Uses the existing .progressWrap area as a status panel.
- Adds GOOD/BAD states by toggling CSS classes:
    .good  (blue/green direction)
    .bad   (red direction)
- Keeps the state visible for 2 seconds.

How to wire:
- Call onAnswerCorrectFx() when the user answers correctly.
- Call onAnswerWrongFx() when the user answers incorrectly.

Note:
- This is the ONLY change in this update.
- No new canvases were created.
*/

// Progress panel element (supports multiple markup variants)
const progressWrapEl = document.querySelector('.progressWrap')
  || document.getElementById('progressWrap')
  || document.querySelector('[data-progress]')
  || null;

// Optional status text node inside the progress area
const progressHintEl = document.querySelector('.progressHint')
  || document.getElementById('progressHint')
  || null;

let progressFxTimer = null;

function setProgressMood(mood, text){
  if(!progressWrapEl) return;

  // clear any prior timers
  if(progressFxTimer) clearTimeout(progressFxTimer);

  // apply mood class
  progressWrapEl.classList.remove('good','bad');
  if(mood === 'good') progressWrapEl.classList.add('good');
  if(mood === 'bad')  progressWrapEl.classList.add('bad');

  // update optional text
  if(progressHintEl && typeof text === 'string') progressHintEl.textContent = text;

  // keep the mood visible for 2 seconds then clear
  progressFxTimer = setTimeout(() => {
    progressWrapEl.classList.remove('good','bad');
    progressFxTimer = null;
  }, 2000);
}

// ✅ Call this on correct answers
function onAnswerCorrectFx(){
  setProgressMood('good', 'Correct ✅ Keep going');
}

// ✅ Call this on wrong answers
function onAnswerWrongFx(){
  setProgressMood('bad', 'Wrong ❌ Try again');
}
