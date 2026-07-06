export type Color = 'red' | 'blue' | 'green' | 'yellow';
export type Player = 'human' | 'cpu';
export type ActionValue = 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
export type CardValue = number | ActionValue;

export interface Card {
  color: Color | 'wild';
  value: CardValue;
}

export interface WildPending {
  player: Player;
  cardIndex: number;
}

export interface GameState {
  deck: Card[];
  discard: Card[];
  hands: Record<Player, Card[]>;
  currentPlayer: Player;
  currentColor: Color;
  gameOver: boolean;
  pendingDraw: number;
  wildPending: WildPending | null;
  needsUno: Record<Player, boolean>;
  humanDrewThisTurn: boolean;
  statusMessage: string;
  cpuThinking: boolean;
  winner: Player | null;
  unoGraceActive: boolean;
}

export type TurnHighlight = 'none' | 'cpu' | 'human' | 'human-uno';
