import { ACTION_LABELS } from './constants';
import { createDeck, drawCards, shuffle, topDiscard } from './deck';
import type { Card, Color, GameState, Player, TurnHighlight } from '../types/game';

export function cardLabel(card: Card): string {
  if (typeof card.value === 'number') return String(card.value);
  return ACTION_LABELS[card.value] || '?';
}

export function cardFaceClass(card: Card): string {
  if (card.color === 'wild') return 'wild-face';
  return card.color;
}

export function otherPlayer(player: Player): Player {
  return player === 'human' ? 'cpu' : 'human';
}

export function hasColorInHand(hands: Record<Player, Card[]>, player: Player, color: Color): boolean {
  return hands[player].some((c) => c.color === color);
}

export function isWildCard(card: Card): boolean {
  return card.value === 'wild' || card.value === 'wild4';
}

export function isPlayable(
  card: Card,
  player: Player,
  state: Pick<GameState, 'gameOver' | 'wildPending' | 'currentColor' | 'discard'>,
  hands: Record<Player, Card[]>,
): boolean {
  if (state.gameOver || state.wildPending) return false;
  const top = topDiscard(state.discard);
  if (card.value === 'wild4') {
    return !hasColorInHand(hands, player, state.currentColor);
  }
  if (card.value === 'wild') return true;
  if (card.color === state.currentColor) return true;
  if (top && card.value === top.value) return true;
  return false;
}

export function playableCards(
  player: Player,
  state: GameState,
): { card: Card; index: number }[] {
  return state.hands[player]
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => isPlayable(card, player, state, state.hands));
}

export function removeCardFromHand(
  hands: Record<Player, Card[]>,
  player: Player,
  cardIndex: number,
): { hands: Record<Player, Card[]>; card: Card } {
  const hand = hands[player];
  const card = hand[cardIndex];
  return {
    hands: {
      ...hands,
      [player]: [...hand.slice(0, cardIndex), ...hand.slice(cardIndex + 1)],
    },
    card,
  };
}

export function applyUnoPenalty(
  state: GameState,
  player: Player,
): { state: GameState; penalized: boolean } {
  if (state.needsUno[player] && state.hands[player].length === 1) {
    const result = drawCards(state.deck, state.discard, state.hands, player, 2);
    if (result.drawn.length === 0) return { state, penalized: false };
    return {
      state: {
        ...state,
        deck: result.deck,
        discard: result.discard,
        hands: result.hands,
        needsUno: { ...state.needsUno, [player]: false },
        statusMessage:
          player === 'human' ? 'Forgot UNO! Draw 2.' : 'CPU forgot UNO! Draws 2.',
      },
      penalized: true,
    };
  }
  return { state, penalized: false };
}

export function checkWin(state: GameState, player: Player): GameState | null {
  if (state.hands[player].length === 0) {
    return {
      ...state,
      gameOver: true,
      winner: player,
      statusMessage: player === 'human' ? 'YOU WIN!' : 'CPU WINS!',
    };
  }
  return null;
}

export function handleUnoAfterPlay(state: GameState, player: Player): GameState {
  if (state.hands[player].length !== 1) return state;

  const needsUno = { ...state.needsUno, [player]: true };
  if (player === 'cpu') {
    return {
      ...state,
      needsUno: { ...needsUno, cpu: false },
      statusMessage: 'CPU says UNO!',
    };
  }
  return {
    ...state,
    needsUno,
    unoGraceActive: true,
    statusMessage: 'Call UNO! You have 5 seconds.',
  };
}

export function advanceTurn(state: GameState, skipCount = 1): GameState {
  let currentPlayer = state.currentPlayer;
  for (let i = 0; i < skipCount; i++) {
    currentPlayer = otherPlayer(currentPlayer);
  }
  return {
    ...state,
    currentPlayer,
    humanDrewThisTurn: false,
    cpuThinking: false,
  };
}

export function applyCardEffect(state: GameState, card: Card, chosenColor: Color): GameState {
  let next: GameState = {
    ...state,
    currentColor: isWildCard(card) ? chosenColor : (card.color as Color),
  };

  if (card.value === 'skip' || card.value === 'reverse') {
    next.statusMessage =
      state.currentPlayer === 'human'
        ? `You played ${cardLabel(card)}! CPU skipped.`
        : `CPU played ${cardLabel(card)}! You are skipped.`;
    return advanceTurn(next, 2);
  }
  if (card.value === 'draw2') {
    next.pendingDraw += 2;
    next.statusMessage =
      state.currentPlayer === 'human'
        ? 'You played +2! CPU draws 2.'
        : 'CPU played +2! You draw 2.';
    return advanceTurn(next, 1);
  }
  if (card.value === 'wild4') {
    next.pendingDraw += 4;
    next.statusMessage =
      state.currentPlayer === 'human'
        ? 'Wild +4! CPU draws 4.'
        : 'CPU Wild +4! You draw 4.';
    return advanceTurn(next, 1);
  }
  if (card.value === 'wild') {
    next.statusMessage =
      state.currentPlayer === 'human'
        ? `You played Wild! Color is ${chosenColor.toUpperCase()}.`
        : `CPU played Wild! Color is ${chosenColor.toUpperCase()}.`;
  } else if (typeof card.value === 'number') {
    next.statusMessage =
      state.currentPlayer === 'human'
        ? `You played ${card.value}.`
        : `CPU played ${card.value}.`;
  }
  return advanceTurn(next, 1);
}

export function flipOpeningCard(state: GameState): GameState {
  let deck = [...state.deck];
  let discard = [...state.discard];
  let currentColor = state.currentColor;
  let currentPlayer = state.currentPlayer;
  let pendingDraw = state.pendingDraw;
  let statusMessage = state.statusMessage;

  while (deck.length) {
    const card = deck.pop()!;
    if (card.value === 'wild' || card.value === 'wild4') {
      deck.unshift(card);
      deck = shuffle(deck);
      continue;
    }
    discard.push(card);
    currentColor = card.color as Color;
    currentPlayer = 'human';

    if (card.value === 'skip' || card.value === 'reverse') {
      currentPlayer = 'cpu';
      statusMessage = `First card: ${cardLabel(card)}. CPU goes first.`;
    } else if (card.value === 'draw2') {
      pendingDraw = 2;
      statusMessage = 'First card: +2. You draw 2 to start.';
    } else {
      statusMessage = `Match color ${currentColor.toUpperCase()} or number. Your turn!`;
    }

    return {
      ...state,
      deck,
      discard,
      currentColor,
      currentPlayer,
      pendingDraw,
      statusMessage,
    };
  }

  return state;
}

export function createInitialState(): GameState {
  let state: GameState = {
    deck: shuffle(createDeck()),
    discard: [],
    hands: { human: [], cpu: [] },
    currentPlayer: 'human',
    currentColor: 'red',
    gameOver: false,
    pendingDraw: 0,
    wildPending: null,
    needsUno: { human: false, cpu: false },
    humanDrewThisTurn: false,
    statusMessage: '',
    cpuThinking: false,
    winner: null,
    unoGraceActive: false,
  };

  const humanDraw = drawCards(state.deck, state.discard, state.hands, 'human', 7);
  state = { ...state, deck: humanDraw.deck, discard: humanDraw.discard, hands: humanDraw.hands };
  const cpuDraw = drawCards(state.deck, state.discard, state.hands, 'cpu', 7);
  state = { ...state, deck: cpuDraw.deck, discard: cpuDraw.discard, hands: cpuDraw.hands };
  state = flipOpeningCard(state);
  return state;
}

export function getTurnHighlight(state: GameState): TurnHighlight {
  if (state.gameOver) return 'none';
  if (state.wildPending?.player === 'human') return 'human';
  if (state.unoGraceActive && state.needsUno.human) return 'human-uno';
  if (state.cpuThinking || state.currentPlayer === 'cpu') return 'cpu';
  return 'human';
}

export function refreshUnoStatus(state: GameState): GameState {
  if (state.needsUno.human && state.hands.human.length === 1 && state.unoGraceActive) {
    return { ...state, statusMessage: 'Call UNO! You have 5 seconds.' };
  }
  return state;
}

export function beginTurn(state: GameState): GameState {
  if (state.gameOver) return state;

  const opponent = otherPlayer(state.currentPlayer);
  if (opponent === 'cpu') {
    const penalty = applyUnoPenalty(state, opponent);
    if (penalty.penalized) return penalty.state;
    state = penalty.state;
  }

  if (state.pendingDraw > 0) {
    const n = state.pendingDraw;
    const drawn = drawCards(state.deck, state.discard, state.hands, state.currentPlayer, n);
    return advanceTurn(
      {
        ...state,
        deck: drawn.deck,
        discard: drawn.discard,
        hands: drawn.hands,
        pendingDraw: 0,
        statusMessage:
          state.currentPlayer === 'human'
            ? `You draw ${n} and lose your turn.`
            : `CPU draws ${n} and loses turn.`,
      },
      1,
    );
  }

  return state;
}

export function resetGameState(): GameState {
  const state = createInitialState();
  return beginTurn(state);
}
