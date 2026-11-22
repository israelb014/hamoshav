// Tiny synthesized sound effects (no audio files). Off by default.
let ctx: AudioContext | null = null;
let enabled = false;

export function setSound(on: boolean) {
  enabled = on;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

export type Sfx = 'tap' | 'plant' | 'water' | 'harvest' | 'coin' | 'level' | 'error' | 'animal';

export function play(s: Sfx) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    return;
  }
  switch (s) {
    case 'tap': tone(660, 0, 0.06, 'triangle', 0.06); break;
    case 'plant': tone(392, 0, 0.1, 'triangle'); tone(523, 0.07, 0.12, 'triangle'); break;
    case 'water': for (let i = 0; i < 4; i++) tone(900 + i * 120, i * 0.04, 0.06, 'sine', 0.05); break;
    case 'harvest': tone(523, 0, 0.1, 'triangle'); tone(784, 0.08, 0.16, 'triangle'); break;
    case 'coin': tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.07, 0.18, 'square', 0.05); break;
    case 'level': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.22, 'triangle')); break;
    case 'error': tone(220, 0, 0.15, 'sawtooth', 0.05); break;
    case 'animal': tone(300, 0, 0.12, 'sine'); tone(360, 0.1, 0.12, 'sine'); break;
  }
}
