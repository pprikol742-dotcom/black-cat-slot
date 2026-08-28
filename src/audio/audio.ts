/**
 * Звук игры.
 *
 * Ни одного аудиофайла: всё синтезируется через Web Audio API прямо
 * в браузере. Это даёт нулевой вес в APK, мгновенный отклик без
 * подгрузки и возможность менять характер звука одной цифрой.
 *
 * Сигнал идёт через общую реверберацию — от этого набор отдельных
 * писков превращается в цельную звуковую картину.
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let reverbSend: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let enabled = true;

/** Пентатоника до-мажор — в ней любые сочетания звучат мягко. */
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

function makeImpulse(c: Ctx, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/** Аудио запускается только после первого касания — этого требуют браузеры. */
export function initAudio(): void {
  if (ctx) return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;

  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 2.2, 2.6);
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.22;
  reverbSend.connect(reverb);
  reverb.connect(master);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);
  musicGain.connect(reverbSend);
}

export function resumeAudio(): void {
  if (ctx?.state === 'suspended') void ctx.resume();
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (master && ctx) {
    master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.05);
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

// ─────────────────────────────────────────────────────────────
// Кирпичики синтеза
// ─────────────────────────────────────────────────────────────

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** Скольжение к этой частоте за время звучания. */
  glideTo?: number;
  send?: number;
}

function tone(o: ToneOptions): void {
  if (!ctx || !master || !reverbSend) return;
  const t = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + o.duration);

  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);

  osc.connect(g);
  g.connect(master);

  const send = ctx.createGain();
  send.gain.value = o.send ?? 0.5;
  g.connect(send);
  send.connect(reverbSend);

  osc.start(t);
  osc.stop(t + o.duration + 0.05);
}

function noise(duration: number, freq: number, q = 1, gain = 0.15, delay = 0): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
}

// ─────────────────────────────────────────────────────────────
// Эффекты игры
// ─────────────────────────────────────────────────────────────

export const sfx = {
  /** Нажатие любой кнопки — мягкий деревянный щелчок. */
  click() {
    tone({ freq: 660, duration: 0.06, type: 'triangle', gain: 0.14, send: 0.2 });
    noise(0.04, 2200, 2, 0.05);
  },

  /** Барабаны тронулись — восходящий свист. */
  spinStart() {
    tone({ freq: 220, glideTo: 520, duration: 0.28, type: 'sawtooth', gain: 0.07, send: 0.3 });
    noise(0.3, 900, 0.8, 0.06);
  },

  /** Барабан встал. index задаёт высоту: тон повышается слева направо. */
  reelStop(index: number) {
    tone({ freq: 150 + index * 22, duration: 0.13, type: 'triangle', gain: 0.22, send: 0.25 });
    noise(0.07, 420 + index * 60, 1.4, 0.11);
  },

  /** Монеты падают — россыпь коротких звонких нот. */
  coins(count = 6) {
    for (let i = 0; i < count; i++) {
      tone({
        freq: SCALE[4 + (i % 5)] * 2,
        duration: 0.16,
        type: 'sine',
        gain: 0.1,
        delay: i * 0.045,
        send: 0.7,
      });
    }
  },

  /** Мелкий выигрыш — две дружелюбные ноты. */
  winSmall() {
    tone({ freq: SCALE[3], duration: 0.18, type: 'sine', gain: 0.16 });
    tone({ freq: SCALE[5], duration: 0.26, type: 'sine', gain: 0.14, delay: 0.09 });
    sfx.coins(3);
  },

  /** Средний — восходящее арпеджио. */
  winMedium() {
    [0, 2, 4, 5].forEach((n, i) =>
      tone({ freq: SCALE[n] * 2, duration: 0.3, type: 'triangle', gain: 0.15, delay: i * 0.08 })
    );
    sfx.coins(6);
  },

  /** Крупный — арпеджио с басом и длинным хвостом. */
  winBig() {
    [0, 2, 4, 5, 7, 9].forEach((n, i) =>
      tone({ freq: SCALE[n] * 2, duration: 0.42, type: 'triangle', gain: 0.17, delay: i * 0.075 })
    );
    tone({ freq: SCALE[0], duration: 1.1, type: 'sine', gain: 0.13 });
    sfx.coins(10);
  },

  /** Мега — фанфара в две волны. */
  winMega() {
    [0, 2, 4, 5, 7, 9, 7, 9].forEach((n, i) =>
      tone({ freq: SCALE[n] * 2, duration: 0.5, type: 'sawtooth', gain: 0.1, delay: i * 0.07 })
    );
    [0, 4, 7].forEach((n, i) =>
      tone({ freq: SCALE[n], duration: 1.6, type: 'sine', gain: 0.16, delay: 0.5 + i * 0.05 })
    );
    sfx.coins(16);
  },

  /** Скаттеры собрались — тревожно-радостное нарастание. */
  scatter(index: number) {
    tone({ freq: 300 + index * 140, duration: 0.32, type: 'square', gain: 0.09, send: 0.8 });
  },

  /** Запуск фриспинов. */
  freeSpins() {
    [0, 4, 7, 9].forEach((n, i) =>
      tone({ freq: SCALE[n] * 2, duration: 0.7, type: 'triangle', gain: 0.16, delay: i * 0.11 })
    );
    tone({ freq: SCALE[0] / 2, duration: 1.8, type: 'sine', gain: 0.14, delay: 0.2 });
  },

  /** Ежедневная награда. */
  reward() {
    [4, 5, 7].forEach((n, i) =>
      tone({ freq: SCALE[n] * 2, duration: 0.35, type: 'sine', gain: 0.17, delay: i * 0.1 })
    );
    sfx.coins(8);
  },

  /** Барабаны тянут время: нарастающий гул, пока решается судьба скаттера. */
  anticipation() {
    tone({ freq: 110, glideTo: 330, duration: 1.0, type: 'sawtooth', gain: 0.07, send: 0.9 });
    for (let i = 0; i < 7; i++) {
      tone({ freq: 440 + i * 55, duration: 0.1, type: 'sine', gain: 0.05, delay: i * 0.13, send: 0.8 });
    }
  },

  /** Подарок новичку — торжественная фанфара. */
  gift() {
    [0, 2, 4, 7, 9].forEach((n, i) =>
      tone({ freq: SCALE[n] * 2, duration: 0.9, type: 'triangle', gain: 0.17, delay: i * 0.13 })
    );
    [0, 4].forEach((n, i) =>
      tone({ freq: SCALE[n] / 2, duration: 2.4, type: 'sine', gain: 0.15, delay: 0.3 + i * 0.08 })
    );
    sfx.coins(20);
  },

  /** Не хватает монет — мягкий отказ, без раздражения. */
  denied() {
    tone({ freq: 220, glideTo: 160, duration: 0.22, type: 'triangle', gain: 0.14 });
  },
};

// ─────────────────────────────────────────────────────────────
// Фоновая музыка
// ─────────────────────────────────────────────────────────────

/**
 * Мелодия не зациклена, а сочиняется на ходу: каждые два такта
 * выбирается новая фраза из пентатоники поверх спокойного баса.
 * Слушать можно часами — повтор не приедается.
 */
const CHORDS = [
  [0, 2, 4],
  [3, 5, 7],
  [1, 3, 5],
  [4, 6, 8],
];

let chordIndex = 0;

function musicStep(): void {
  if (!ctx || !musicGain || !reverbSend) return;

  const chord = CHORDS[chordIndex % CHORDS.length];
  chordIndex++;

  const now = ctx.currentTime;
  const bar = 2.4;

  // бас
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.value = SCALE[chord[0]] / 2;
  bassGain.gain.setValueAtTime(0.0001, now);
  bassGain.gain.exponentialRampToValueAtTime(0.16, now + 0.25);
  bassGain.gain.exponentialRampToValueAtTime(0.0001, now + bar);
  bass.connect(bassGain);
  bassGain.connect(musicGain);
  bass.start(now);
  bass.stop(now + bar + 0.1);

  // подушка из аккорда
  chord.forEach((n, i) => {
    const osc = ctx!.createOscillator();
    const g = ctx!.createGain();
    osc.type = 'triangle';
    osc.frequency.value = SCALE[n];
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.4 + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + bar);
    osc.connect(g);
    g.connect(musicGain!);
    osc.start(now);
    osc.stop(now + bar + 0.1);
  });

  // мелодия: четыре ноты со случайными паузами
  for (let i = 0; i < 4; i++) {
    if (Math.random() < 0.3) continue;
    const note = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.4 ? 2 : 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const at = now + 0.3 + i * 0.55;
    osc.type = 'sine';
    osc.frequency.value = SCALE[Math.min(note, SCALE.length - 1)] * 2;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.07, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(at);
    osc.stop(at + 0.6);
  }
}

export function startMusic(): void {
  if (!ctx || !musicGain || musicTimer !== null) return;
  musicGain.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
  musicStep();
  musicTimer = window.setInterval(musicStep, 2400);
}

export function stopMusic(): void {
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
}

/** Во фриспинах музыка приглушается, чтобы эффекты звучали ярче. */
export function duckMusic(down: boolean): void {
  if (!musicGain || !ctx) return;
  musicGain.gain.setTargetAtTime(down ? 0.18 : 0.5, ctx.currentTime, 0.3);
}
