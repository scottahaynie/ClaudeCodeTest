import type { DomRect } from '../types/animation';
import type { Player } from '../types/game';

const CARD_GAP = 6;

/**
 * Converts a DOM element's bounding box to a DomRect.
 */
export function elementToRect(el: Element): DomRect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Reads a bounding rectangle from a DOM element matching the given selector.
 */
export function queryRect(selector: string): DomRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return elementToRect(el);
}

/**
 * Returns the draw pile card position.
 */
export function getDrawPileRect(): DomRect | null {
  return queryRect('[data-pile="draw"]');
}

/**
 * Returns the discard pile card position.
 */
export function getDiscardPileRect(): DomRect | null {
  return queryRect('[data-pile="discard"]');
}

/**
 * Returns the position of a specific card in a player's hand.
 */
export function getHandCardRect(player: Player, index: number): DomRect | null {
  return queryRect(`[data-hand="${player}"] [data-card-index="${index}"]`);
}

/**
 * Estimates where a newly drawn card will land in a player's hand.
 */
export function getHandDrawTargetRect(player: Player, handSize: number): DomRect | null {
  const hand = document.querySelector(`[data-hand="${player}"]`);
  if (!hand) return null;

  if (handSize > 0) {
    const last = getHandCardRect(player, handSize - 1);
    if (last) {
      return {
        left: last.left + last.width + CARD_GAP,
        top: last.top,
        width: last.width,
        height: last.height,
      };
    }
  }

  const r = hand.getBoundingClientRect();
  const cardW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-w'), 10) || 64;
  const cardH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-h'), 10) || 96;
  return {
    left: r.left + (r.width - cardW) / 2,
    top: r.top + (r.height - cardH) / 2,
    width: cardW,
    height: cardH,
  };
}

/**
 * Returns a representative card position from the CPU hand for play animations.
 */
export function getCpuHandSourceRect(): DomRect | null {
  const cards = document.querySelectorAll('[data-hand="cpu"] [data-card]');
  if (cards.length === 0) return null;
  const mid = cards[Math.floor(cards.length / 2)] ?? cards[cards.length - 1];
  const r = mid.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Resolves source and target rectangles for a card motion.
 */
export function getMotionRects(
  motion: import('../types/animation').CardMotion,
): { from: DomRect; to: DomRect } | null {
  if (motion.type === 'draw') {
    const from = motion.fromRect ?? getDrawPileRect();
    const to = motion.toRect ?? getHandDrawTargetRect(motion.player, motion.handSize ?? 0);
    if (!from || !to) return null;
    return { from, to };
  }

  const to = motion.toRect ?? getDiscardPileRect();
  if (!to) return null;

  let from: DomRect | null = motion.fromRect ?? null;
  if (!from) {
    if (motion.player === 'human' && motion.handIndex != null) {
      from = getHandCardRect('human', motion.handIndex);
    } else {
      from = getCpuHandSourceRect();
    }
  }
  if (!from) return null;
  return { from, to };
}
