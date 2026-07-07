import type { Card, Player } from './game';

/** Describes a single card flying between piles or hands. */
export interface CardMotion {
  id: number;
  type: 'draw' | 'play';
  player: Player;
  card: Card;
  /** Show the card face-down during flight (draws and CPU plays). */
  faceDown?: boolean;
  /** Source index in the player's hand for play animations. */
  handIndex?: number;
  /** Hand size before the motion (used to place draw targets). */
  handSize?: number;
  /** Pre-captured source position (avoids DOM lookup after re-render). */
  fromRect?: DomRect;
  /** Pre-captured target position. */
  toRect?: DomRect;
}

/** Screen-space rectangle for positioning flying cards. */
export interface DomRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
