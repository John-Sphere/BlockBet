// src/engine/casinoSounds.js
//
// Generated sound effects using the Web Audio API — no external
// audio files needed at all, which also sidesteps any licensing
// question entirely (these are synthesized tones, not recordings).

let audioCtx = null;
function getContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, startTime, duration, type = "sine", gain = 0.15) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Short, satisfying click — chip placed on the table.
export function playChip() {
  const ctx = getContext();
  const now = ctx.currentTime;
  tone(800, now, 0.05, "square", 0.08);
  tone(1200, now + 0.02, 0.04, "square", 0.05);
}

// Rising sweep — the wheel starting to spin.
export function playSpinStart() {
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.4);
  gainNode.gain.setValueAtTime(0.06, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

// Cheerful ascending arpeggio — you won.
export function playWin() {
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => tone(freq, now + i * 0.09, 0.35, "triangle", 0.12));
}

// Soft, brief descending tone — no win this time. Deliberately
// gentle, not punishing — same care as anywhere else on this site
// around avoiding anything that feels manipulative.
export function playLose() {
  const ctx = getContext();
  const now = ctx.currentTime;
  tone(300, now, 0.25, "sine", 0.06);
  tone(220, now + 0.1, 0.3, "sine", 0.05);
}

// Quiet confirmation tick — spin request accepted, waiting on-chain.
export function playConfirm() {
  const ctx = getContext();
  tone(600, getContext().currentTime, 0.08, "sine", 0.06);
}
