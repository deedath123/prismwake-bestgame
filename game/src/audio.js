// audio.js — procedural WebAudio only: no files, nothing fetched. A burn
// crackle, a buy chime, a thud when the Murk bites the beacon, and a short
// sting for a held or lost night. Every call is guarded: with no audio device
// (or before the first click unlocks one) the game simply plays silent.

let ctx = null;
let lastBurn = 0;

function ac() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq, t0, dur, type = 'sine', gain = 0.05, slide = 0) {
  const c = ac(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + t0 + dur);
    g.gain.setValueAtTime(gain, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  } catch { /* silent */ }
}

export const sfx = {
  unlock() { ac(); },
  burn() {
    const now = performance.now();
    if (now - lastBurn < 110) return;
    lastBurn = now;
    tone(1400 + Math.random() * 600, 0, 0.06, 'sawtooth', 0.012, -900);
  },
  chime() { tone(880, 0, 0.12, 'sine', 0.05); tone(1318, 0.09, 0.18, 'sine', 0.05); },
  thud() { tone(120, 0, 0.22, 'sine', 0.09, -70); },
  place() { tone(520, 0, 0.08, 'triangle', 0.05, 160); },
  sting(win) {
    if (win) { tone(523, 0, 0.16, 'triangle', 0.05); tone(659, 0.13, 0.16, 'triangle', 0.05); tone(784, 0.26, 0.3, 'triangle', 0.06); }
    else { tone(392, 0, 0.2, 'triangle', 0.05); tone(311, 0.18, 0.24, 'triangle', 0.05); tone(233, 0.38, 0.42, 'triangle', 0.06); }
  },
};
