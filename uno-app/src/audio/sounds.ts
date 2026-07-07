import type { ThemeId } from '../context/ThemeProvider';
import oinkAltData from '../assets/sounds/john-pork/oink-alt.mp3?inline';
import oinkShortData from '../assets/sounds/john-pork/oink-short.mp3?inline';
import fartQuickData from '../assets/sounds/john-pork/fart-quick.mp3?inline';

type OscType = OscillatorType;

/** Sound pack id derived from the active visual theme. */
type SoundPackId = 'default' | 'john-pork';

const JOHN_PORK_SAMPLES = {
  short: oinkShortData,
  fart: fartQuickData,
  alt: oinkAltData,
} as const;

type SampleKey = keyof typeof JOHN_PORK_SAMPLES;

let ctx: AudioContext | null = null;
let activePack: SoundPackId = 'default';
let preloadState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
let preloadPromise: Promise<void> | null = null;
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

/** Runs playback once the audio context is running, resuming first if needed. */
function withRunningAudio(play: (audio: AudioContext) => void): void {
  const audio = getContext();
  if (audio.state === 'running') {
    play(audio);
    return;
  }

  if (audio.state === 'suspended') {
    void audio.resume().then(() => {
      if (audio.state === 'running') {
        play(audio);
      }
    });
  }
}

/** Decodes an inlined data-URL sample into the audio cache. */
async function decodeSample(audio: AudioContext, dataUrl: string): Promise<AudioBuffer> {
  const response = await fetch(dataUrl);
  const data = await response.arrayBuffer();
  return audio.decodeAudioData(data);
}

/** Loads inlined John Pork samples once; never retries after failure. */
async function preloadJohnPorkSamples(): Promise<void> {
  if (preloadState === 'ready' || preloadState === 'failed') return;
  if (preloadPromise) return preloadPromise;

  const audio = ctx;
  if (!audio) return;

  preloadState = 'loading';
  preloadPromise = (async () => {
    try {
      const entries = Object.entries(JOHN_PORK_SAMPLES) as [SampleKey, string][];
      await Promise.all(
        entries.map(async ([, dataUrl]) => {
          if (sampleCache.has(dataUrl)) return;
          const buffer = await decodeSample(audio, dataUrl);
          sampleCache.set(dataUrl, buffer);
        }),
      );
      preloadState = 'ready';
    } catch {
      preloadState = 'failed';
      sampleCache.clear();
    }
  })();

  return preloadPromise;
}

/** Resume audio after a user gesture (required by browser autoplay policies). */
export function unlockAudio(): void {
  const audio = getContext();
  void audio.resume().then(() => {
    if (activePack === 'john-pork') {
      void preloadJohnPorkSamples();
    }
  });
}

/** Switches the active sound pack to match the given visual theme. */
export function setSoundTheme(theme: ThemeId): void {
  const next = soundPackForTheme(theme);
  if (next === activePack) return;
  activePack = next;
  if (next === 'john-pork' && ctx?.state === 'running') {
    void preloadJohnPorkSamples();
  }
}

/** Plays a cached sample at the given volume, optionally after a delay. */
function playSample(dataUrl: string, volume = 0.55, delay = 0): void {
  withRunningAudio((audio) => {
    const buffer = sampleCache.get(dataUrl);
    if (!buffer) {
      if (preloadState !== 'failed') {
        void preloadJohnPorkSamples();
      }
      return;
    }

    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, audio.currentTime + delay);
    source.connect(gain);
    gain.connect(audio.destination);
    source.start(audio.currentTime + delay);
  });
}

function playTone(
  frequency: number,
  duration: number,
  options: { type?: OscType; volume?: number; delay?: number } = {},
): void {
  withRunningAudio((audio) => {
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
  });
}

function playSlide(startFreq: number, endFreq: number, duration: number, volume = 0.1, delay = 0): void {
  withRunningAudio((audio) => {
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
  });
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
  if (activePack === 'john-pork') {
    if (preloadState === 'ready') return johnPorkSounds;
    if (preloadState !== 'failed') void preloadJohnPorkSamples();
    return defaultSounds;
  }
  return defaultSounds;
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
