type OscType = OscillatorType;

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

/** Resume audio after a user gesture (required by browser autoplay policies). */
export function unlockAudio(): void {
  const audio = getContext();
  if (audio.state === 'suspended') {
    void audio.resume();
  }
}

function playTone(
  frequency: number,
  duration: number,
  options: { type?: OscType; volume?: number; delay?: number } = {},
): void {
  const audio = getContext();
  if (audio.state === 'suspended') return;

  const { type = 'square', volume = 0.12, delay = 0 } = options;
  const start = audio.currentTime + delay;
  const end = start + duration;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(end);
}

function playSlide(startFreq: number, endFreq: number, duration: number, volume = 0.1, delay = 0): void {
  const audio = getContext();
  if (audio.state === 'suspended') return;

  const start = audio.currentTime + delay;
  const end = start + duration;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(startFreq, start);
  osc.frequency.exponentialRampToValueAtTime(endFreq, end);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(end);
}

export const sounds = {
  gameStart(): void {
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => playTone(freq, 0.12, { delay: i * 0.1, volume: 0.14 }));
  },

  gameEnd(won: boolean): void {
    if (won) {
      [523, 659, 784, 1047].forEach((freq, i) =>
        playTone(freq, 0.18, { delay: i * 0.12, volume: 0.14 }),
      );
    } else {
      [392, 330, 262, 196].forEach((freq, i) =>
        playTone(freq, 0.22, { delay: i * 0.14, type: 'triangle', volume: 0.12 }),
      );
    }
  },

  draw(count = 1): void {
    const repeats = Math.min(count, 4);
    for (let i = 0; i < repeats; i++) {
      playSlide(900, 280, 0.07, 0.09, i * 0.08);
    }
  },

  playCard(): void {
    playTone(180, 0.06, { volume: 0.16 });
    playTone(90, 0.04, { delay: 0.03, volume: 0.1 });
  },
};
