import type { ThemeId } from '../context/ThemeProvider';

type OscType = OscillatorType;

/** Sound pack id derived from the active visual theme. */
type SoundPackId = 'default' | 'john-pork';

const JOHN_PORK_SAMPLES = {
  short: '/sounds/john-pork/oink-short.mp3',
  fart: '/sounds/john-pork/fart-quick.mp3',
  alt: '/sounds/john-pork/oink-alt.mp3',
} as const;

let ctx: AudioContext | null = null;
let activePack: SoundPackId = 'default';
const sampleCache = new Map<string, AudioBuffer>();

/** Maps a visual theme to its sound pack. */
function soundPackForTheme(theme: ThemeId): SoundPackId {
  return theme === 'john-pork' ? 'john-pork' : 'default';
}

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

/** Switches the active sound pack to match the given visual theme. */
export function setSoundTheme(theme: ThemeId): void {
  const next = soundPackForTheme(theme);
  if (next === activePack) return;
  activePack = next;
  if (next === 'john-pork') {
    void preloadJohnPorkSamples();
  }
}

/** Fetches and decodes John Pork sample files into the audio cache. */
async function preloadJohnPorkSamples(): Promise<void> {
  const audio = getContext();
  await Promise.all(
    Object.values(JOHN_PORK_SAMPLES).map(async (url) => {
      if (sampleCache.has(url)) return;
      try {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const buffer = await audio.decodeAudioData(data);
        sampleCache.set(url, buffer);
      } catch {
        /* sample unavailable — fall back to synth on play */
      }
    }),
  );
}

/** Plays a cached sample at the given volume, optionally after a delay. */
function playSample(url: string, volume = 0.55, delay = 0): void {
  const audio = getContext();
  if (audio.state === 'suspended') return;

  const buffer = sampleCache.get(url);
  if (!buffer) {
    void preloadJohnPorkSamples().then(() => playSample(url, volume, delay));
    return;
  }

  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, audio.currentTime + delay);
  source.connect(gain);
  gain.connect(audio.destination);
  source.start(audio.currentTime + delay);
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

const defaultSounds = {
  /** Plays the retro chiptune game-start fanfare. */
  gameStart(): void {
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => playTone(freq, 0.12, { delay: i * 0.1, volume: 0.14 }));
  },

  /** Plays win or lose chiptune stingers. */
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

  /** Plays a descending slide when cards are drawn from the deck. */
  draw(count = 1): void {
    const repeats = Math.min(count, 4);
    for (let i = 0; i < repeats; i++) {
      playSlide(900, 280, 0.07, 0.09, i * 0.08);
    }
  },

  /** Plays a bright rising chirp when a card is successfully played. */
  playCard(): void {
    playTone(330, 0.05, { volume: 0.12 });
    playTone(660, 0.08, { delay: 0.04, volume: 0.16, type: 'square' });
  },
};

const johnPorkSounds = {
  /** Plays a quick sequence of oinks to start a new game. */
  gameStart(): void {
    playSample(JOHN_PORK_SAMPLES.short, 0.5, 0);
    playSample(JOHN_PORK_SAMPLES.fart, 0.45, 0.18);
    playSample(JOHN_PORK_SAMPLES.short, 0.5, 0.36);
    playSample(JOHN_PORK_SAMPLES.alt, 0.4, 0.54);
  },

  /** Plays celebratory oinks on win, a single sad grunt on loss. */
  gameEnd(won: boolean): void {
    if (won) {
      playSample(JOHN_PORK_SAMPLES.short, 0.55, 0);
      playSample(JOHN_PORK_SAMPLES.fart, 0.5, 0.2);
      playSample(JOHN_PORK_SAMPLES.alt, 0.45, 0.4);
      playSample(JOHN_PORK_SAMPLES.short, 0.55, 0.6);
    } else {
      playSample(JOHN_PORK_SAMPLES.fart, 0.35, 0);
      playSample(JOHN_PORK_SAMPLES.fart, 0.25, 0.35);
    }
  },

  /** Plays a quick fart for each card drawn (capped at four). */
  draw(count = 1): void {
    const repeats = Math.min(count, 4);
    for (let i = 0; i < repeats; i++) {
      playSample(JOHN_PORK_SAMPLES.fart, 0.42, i * 0.14);
    }
  },

  /** Plays a crisp short oink when a card is successfully played. */
  playCard(): void {
    playSample(JOHN_PORK_SAMPLES.short, 0.55);
  },
};

function getActiveSounds() {
  return activePack === 'john-pork' ? johnPorkSounds : defaultSounds;
}

export const sounds = {
  gameStart(): void {
    getActiveSounds().gameStart();
  },

  gameEnd(won: boolean): void {
    getActiveSounds().gameEnd(won);
  },

  draw(count = 1): void {
    getActiveSounds().draw(count);
  },

  playCard(): void {
    getActiveSounds().playCard();
  },
};
