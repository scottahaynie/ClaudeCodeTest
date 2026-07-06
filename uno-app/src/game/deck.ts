import { COLORS } from './constants';
import type { Card, Player } from '../types/game';

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const color of COLORS) {
    cards.push({ color, value: 0 });
    for (let n = 1; n <= 9; n++) {
      cards.push({ color, value: n });
      cards.push({ color, value: n });
    }
    for (const action of ['skip', 'reverse', 'draw2'] as const) {
      cards.push({ color, value: action });
      cards.push({ color, value: action });
    }
  }
  for (let i = 0; i < 4; i++) {
    cards.push({ color: 'wild', value: 'wild' });
    cards.push({ color: 'wild', value: 'wild4' });
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function topDiscard(discard: Card[]): Card | undefined {
  return discard[discard.length - 1];
}

export function ensureDrawPile(deck: Card[], discard: Card[]): { deck: Card[]; discard: Card[] } {
  if (deck.length > 0) return { deck, discard };
  if (discard.length <= 1) return { deck, discard };
  const top = discard[discard.length - 1];
  const rest = discard.slice(0, -1);
  return { deck: shuffle(rest), discard: [top] };
}

export function drawCards(
  deck: Card[],
  discard: Card[],
  hands: Record<Player, Card[]>,
  player: Player,
  count: number,
): { deck: Card[]; discard: Card[]; hands: Record<Player, Card[]>; drawn: Card[] } {
  let currentDeck = deck;
  let currentDiscard = discard;
  const drawn: Card[] = [];
  const newHand = [...hands[player]];

  for (let i = 0; i < count; i++) {
    const ensured = ensureDrawPile(currentDeck, currentDiscard);
    currentDeck = ensured.deck;
    currentDiscard = ensured.discard;
    if (currentDeck.length === 0) break;
    const card = currentDeck[currentDeck.length - 1];
    currentDeck = currentDeck.slice(0, -1);
    newHand.push(card);
    drawn.push(card);
  }

  return {
    deck: currentDeck,
    discard: currentDiscard,
    hands: { ...hands, [player]: newHand },
    drawn,
  };
}
