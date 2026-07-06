import { COLORS } from './constants';
import { playableCards } from './rules';
import type { Card, Color, GameState } from '../types/game';

export function cpuBestColor(hands: GameState['hands']): Color {
  const counts: Record<Color, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const card of hands.cpu) {
    if (COLORS.includes(card.color as Color)) {
      counts[card.color as Color]++;
    }
  }
  let best: Color = COLORS[0];
  let max = -1;
  for (const c of COLORS) {
    if (counts[c] > max) {
      max = counts[c];
      best = c;
    }
  }
  return best;
}

export type CpuMove =
  | { action: 'draw' }
  | { action: 'play'; index: number; card: Card };

export function cpuChooseMove(state: GameState): CpuMove {
  const options = playableCards('cpu', state);
  if (options.length === 0) return { action: 'draw' };

  const humanLow = state.hands.human.length <= 1;
  const actionPriority = ['draw2', 'wild4', 'skip'] as const;
  if (humanLow) {
    for (const val of actionPriority) {
      const matches = options.filter((o) => o.card.value === val);
      if (matches.length) {
        const pick = matches[Math.floor(Math.random() * matches.length)];
        return { action: 'play', index: pick.index, card: pick.card };
      }
    }
  }

  const actionCards = options.filter(
    (o) =>
      o.card.value === 'skip' || o.card.value === 'reverse' || o.card.value === 'draw2',
  );
  if (actionCards.length && Math.random() < 0.6) {
    const pick = actionCards[Math.floor(Math.random() * actionCards.length)];
    return { action: 'play', index: pick.index, card: pick.card };
  }

  const nonWild4 = options.filter((o) => o.card.value !== 'wild4');
  const nonWild = nonWild4.filter((o) => o.card.value !== 'wild');
  let pool = nonWild.length ? nonWild : nonWild4.length ? nonWild4 : options;

  if (humanLow && pool.some((o) => o.card.value === 'wild4')) {
    const w4 = pool.filter((o) => o.card.value === 'wild4');
    if (w4.length) {
      const pick = w4[Math.floor(Math.random() * w4.length)];
      return { action: 'play', index: pick.index, card: pick.card };
    }
  }

  const numbers = pool.filter((o) => typeof o.card.value === 'number');
  if (numbers.length) {
    numbers.sort((a, b) => (b.card.value as number) - (a.card.value as number));
    const topVal = numbers[0].card.value;
    const highest = numbers.filter((o) => o.card.value === topVal);
    const pick = highest[Math.floor(Math.random() * highest.length)];
    return { action: 'play', index: pick.index, card: pick.card };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { action: 'play', index: pick.index, card: pick.card };
}
