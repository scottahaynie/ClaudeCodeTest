import { useCallback, useEffect, useRef, useState } from 'react';
import { sounds } from '../audio/sounds';
import { CPU_TURN_DELAY_MS, UNO_GRACE_MS } from '../game/constants';
import { cpuBestColor, cpuChooseMove } from '../game/cpu';
import { drawCards } from '../game/deck';
import {
  advanceTurn,
  applyCardEffect,
  applyUnoPenalty,
  beginTurn,
  checkWin,
  getTurnHighlight,
  handleUnoAfterPlay,
  isPlayable,
  isWildCard,
  refreshUnoStatus,
  removeCardFromHand,
  resetGameState,
} from '../game/rules';
import type { Color, GameState, Player, TurnHighlight } from '../types/game';

export interface UseUnoGameReturn {
  state: GameState;
  turnHighlight: TurnHighlight;
  canPass: boolean;
  drawDisabled: boolean;
  unoDisabled: boolean;
  unoPulse: boolean;
  showColorOverlay: boolean;
  showGameOver: boolean;
  gameOverTitle: string;
  gameOverMsg: string;
  playCard: (player: Player, cardIndex: number, chosenColor?: Color) => void;
  humanDraw: () => void;
  humanCallUno: () => void;
  endHumanTurnWithoutPlay: () => void;
  completeWildPlay: (color: Color) => void;
  newGame: () => void;
}

function resolveAfterPlay(state: GameState, player: Player, card: import('../types/game').Card, chosenColor: Color): GameState {
  let next = handleUnoAfterPlay(state, player);
  const winState = checkWin(next, player);
  if (winState) return winState;
  next = applyCardEffect(next, card, chosenColor);
  next = refreshUnoStatus(next);
  return beginTurn(next);
}

function playCardSfx(before: GameState, after: GameState, player: Player): void {
  sounds.playCard();
  const opponent: Player = player === 'human' ? 'cpu' : 'human';
  const cardsDrawn = after.hands[opponent].length - before.hands[opponent].length;
  if (cardsDrawn > 0) {
    sounds.draw(cardsDrawn);
  }
}

export function useUnoGame(): UseUnoGameReturn {
  const [state, setState] = useState<GameState>(() => resetGameState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unoGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasGameOverRef = useRef(false);

  const clearCpuTimer = useCallback(() => {
    if (cpuTimerRef.current) {
      clearTimeout(cpuTimerRef.current);
      cpuTimerRef.current = null;
    }
  }, []);

  const clearUnoGraceTimer = useCallback(() => {
    if (unoGraceTimerRef.current) {
      clearTimeout(unoGraceTimerRef.current);
      unoGraceTimerRef.current = null;
    }
  }, []);

  const runCpuTurn = useCallback(() => {
    cpuTimerRef.current = null;
    const current = stateRef.current;
    if (current.gameOver || current.currentPlayer !== 'cpu' || current.wildPending) return;

    let next: GameState = { ...current, cpuThinking: false };

    if (next.pendingDraw > 0) {
      const n = next.pendingDraw;
      const drawn = drawCards(next.deck, next.discard, next.hands, 'cpu', n);
      next = advanceTurn(
        {
          ...next,
          deck: drawn.deck,
          discard: drawn.discard,
          hands: drawn.hands,
          pendingDraw: 0,
          statusMessage: `CPU draws ${n} and loses turn.`,
        },
        1,
      );
      sounds.draw(n);
      setState(next);
      return;
    }

    const move = cpuChooseMove(next);
    if (move.action === 'draw') {
      const drawn = drawCards(next.deck, next.discard, next.hands, 'cpu', 1);
      next = advanceTurn(
        {
          ...next,
          deck: drawn.deck,
          discard: drawn.discard,
          hands: drawn.hands,
          statusMessage: 'CPU draws a card.',
        },
        1,
      );
      sounds.draw(1);
      setState(next);
      return;
    }

    const card = move.card;
    if (isWildCard(card)) {
      const color = cpuBestColor(next.hands);
      const removed = removeCardFromHand(next.hands, 'cpu', move.index);
      next = {
        ...next,
        hands: removed.hands,
        discard: [...next.discard, removed.card],
      };
      const resolved = resolveAfterPlay(next, 'cpu', removed.card, color);
      playCardSfx(current, resolved, 'cpu');
      setState(resolved);
      return;
    }

    const removed = removeCardFromHand(next.hands, 'cpu', move.index);
    if (!isPlayable(removed.card, 'cpu', next, next.hands)) return;

    next = {
      ...next,
      hands: removed.hands,
      discard: [...next.discard, removed.card],
    };
    const resolved = resolveAfterPlay(next, 'cpu', removed.card, removed.card.color as Color);
    playCardSfx(current, resolved, 'cpu');
    setState(resolved);
  }, []);

  const scheduleCpuTurn = useCallback(
    (shouldRun: boolean) => {
      clearCpuTimer();
      const current = stateRef.current;
      if (!shouldRun || current.gameOver || current.currentPlayer !== 'cpu' || current.wildPending) {
        if (current.cpuThinking) {
          setState((s) => ({ ...s, cpuThinking: false }));
        }
        return;
      }
      if (unoGraceTimerRef.current) return;

      setState((s) => ({ ...s, cpuThinking: true, statusMessage: 'CPU is thinking...' }));
      cpuTimerRef.current = setTimeout(runCpuTurn, CPU_TURN_DELAY_MS);
    },
    [clearCpuTimer, runCpuTurn],
  );

  const scheduleCpuAfterUnoGrace = useCallback(() => {
    const current = stateRef.current;
    if (
      current.currentPlayer === 'cpu' &&
      !current.cpuThinking &&
      !current.wildPending &&
      !current.gameOver &&
      !unoGraceTimerRef.current
    ) {
      scheduleCpuTurn(true);
    }
  }, [scheduleCpuTurn]);

  const startUnoGrace = useCallback(() => {
    clearUnoGraceTimer();
    setState((s) => ({
      ...s,
      unoGraceActive: true,
      statusMessage: 'Call UNO! You have 5 seconds.',
    }));
    unoGraceTimerRef.current = setTimeout(() => {
      unoGraceTimerRef.current = null;
      setState((s) => {
        if (s.needsUno.human && s.hands.human.length === 1) {
          const penalty = applyUnoPenalty(s, 'human');
          return { ...penalty.state, unoGraceActive: false };
        }
        return { ...s, unoGraceActive: false };
      });
      setTimeout(() => scheduleCpuAfterUnoGrace(), 0);
    }, UNO_GRACE_MS);
  }, [clearUnoGraceTimer, scheduleCpuAfterUnoGrace]);

  useEffect(() => {
    const current = stateRef.current;
    if (current.unoGraceActive && current.needsUno.human && current.hands.human.length === 1) {
      if (!unoGraceTimerRef.current) {
        startUnoGrace();
      }
    }
  }, [state.unoGraceActive, state.needsUno.human, state.hands.human.length, startUnoGrace]);

  useEffect(() => {
    if (state.gameOver || state.wildPending || state.unoGraceActive) {
      if (state.currentPlayer === 'human') clearCpuTimer();
      return;
    }
    if (state.currentPlayer === 'cpu' && !state.cpuThinking && !cpuTimerRef.current) {
      scheduleCpuTurn(true);
    } else if (state.currentPlayer === 'human') {
      clearCpuTimer();
      if (state.cpuThinking) {
        setState((s) => ({ ...s, cpuThinking: false }));
      }
    }
  }, [
    state.currentPlayer,
    state.gameOver,
    state.wildPending,
    state.unoGraceActive,
    state.cpuThinking,
    scheduleCpuTurn,
    clearCpuTimer,
  ]);

  useEffect(() => {
    return () => {
      clearCpuTimer();
      clearUnoGraceTimer();
    };
  }, [clearCpuTimer, clearUnoGraceTimer]);

  const playCard = useCallback(
    (player: Player, cardIndex: number, chosenColor?: Color) => {
      setState((s) => {
        if (s.gameOver) return s;
        const card = s.hands[player][cardIndex];
        if (!card || !isPlayable(card, player, s, s.hands)) return s;

        if (isWildCard(card) && chosenColor == null) {
          if (player === 'human') {
            return { ...s, wildPending: { player, cardIndex } };
          }
          const color = cpuBestColor(s.hands);
          const removed = removeCardFromHand(s.hands, player, cardIndex);
          let next: GameState = {
            ...s,
            hands: removed.hands,
            discard: [...s.discard, removed.card],
          };
          const resolved = resolveAfterPlay(next, player, removed.card, color);
          playCardSfx(s, resolved, player);
          return resolved;
        }

        const removed = removeCardFromHand(s.hands, player, cardIndex);
        let next: GameState = {
          ...s,
          hands: removed.hands,
          discard: [...s.discard, removed.card],
        };
        const resolved = resolveAfterPlay(
          next,
          player,
          removed.card,
          chosenColor ?? (removed.card.color as Color),
        );
        playCardSfx(s, resolved, player);
        return resolved;
      });
    },
    [],
  );

  const completeWildPlay = useCallback((color: Color) => {
    setState((s) => {
      if (!s.wildPending) return s;
      const { player, cardIndex } = s.wildPending;
      const card = s.hands[player][cardIndex];
      if (!card) return { ...s, wildPending: null };

      const removed = removeCardFromHand(s.hands, player, cardIndex);
      let next: GameState = {
        ...s,
        wildPending: null,
        hands: removed.hands,
        discard: [...s.discard, removed.card],
      };
      const resolved = resolveAfterPlay(next, player, removed.card, color);
      playCardSfx(s, resolved, player);
      return resolved;
    });
  }, []);

  const humanDraw = useCallback(() => {
    setState((s) => {
      if (s.gameOver || s.currentPlayer !== 'human' || s.wildPending || s.cpuThinking || s.humanDrewThisTurn) {
        return s;
      }
      const drawn = drawCards(s.deck, s.discard, s.hands, 'human', 1);
      if (drawn.drawn.length === 0) {
        return { ...s, statusMessage: 'No cards left to draw!' };
      }
      sounds.draw(1);
      const card = drawn.drawn[0];
      const next: GameState = {
        ...s,
        deck: drawn.deck,
        discard: drawn.discard,
        hands: drawn.hands,
        humanDrewThisTurn: true,
      };
      if (isPlayable(card, 'human', next, next.hands)) {
        return { ...next, statusMessage: 'Drew a card — play it or end turn.' };
      }
      return advanceTurn(
        { ...next, statusMessage: 'Drew a card — no play. Turn over.' },
        1,
      );
    });
  }, []);

  const humanCallUno = useCallback(() => {
    clearUnoGraceTimer();
    setState((s) => {
      if (s.hands.human.length !== 1 || !s.needsUno.human) return s;
      return {
        ...s,
        needsUno: { ...s.needsUno, human: false },
        unoGraceActive: false,
        statusMessage: 'UNO!',
      };
    });
    setTimeout(() => scheduleCpuAfterUnoGrace(), 0);
  }, [clearUnoGraceTimer, scheduleCpuAfterUnoGrace]);

  const endHumanTurnWithoutPlay = useCallback(() => {
    setState((s) => {
      if (s.currentPlayer !== 'human' || !s.humanDrewThisTurn) return s;
      return advanceTurn({ ...s, statusMessage: 'Turn over.' }, 1);
    });
  }, []);

  const newGame = useCallback(() => {
    clearCpuTimer();
    clearUnoGraceTimer();
    setState(resetGameState());
    sounds.gameStart();
  }, [clearCpuTimer, clearUnoGraceTimer]);

  useEffect(() => {
    sounds.gameStart();
  }, []);

  useEffect(() => {
    if (state.gameOver && !wasGameOverRef.current) {
      sounds.gameEnd(state.winner === 'human');
    }
    wasGameOverRef.current = state.gameOver;
  }, [state.gameOver, state.winner]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'Enter' && s.humanDrewThisTurn && s.currentPlayer === 'human') {
        endHumanTurnWithoutPlay();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [endHumanTurnWithoutPlay]);

  const turnHighlight = getTurnHighlight(state);
  const humanTurn =
    state.currentPlayer === 'human' && !state.gameOver && !state.cpuThinking && !state.wildPending;
  const canPass =
    humanTurn && state.humanDrewThisTurn && state.hands.human.some((c) => isPlayable(c, 'human', state, state.hands));
  const drawDisabled = !humanTurn || state.humanDrewThisTurn || state.pendingDraw > 0;
  const unoDisabled = !(state.hands.human.length === 1 && state.needsUno.human);
  const unoPulse = state.hands.human.length === 1 && state.needsUno.human;
  const showColorOverlay = !!(state.wildPending && state.wildPending.player === 'human');
  const showGameOver = state.gameOver;
  const gameOverTitle = state.winner === 'human' ? 'YOU WIN!' : 'CPU WINS!';
  const gameOverMsg =
    state.winner === 'human' ? 'Nice! You emptied your hand.' : 'Better luck next time!';

  const displayState: GameState = {
    ...state,
    statusMessage:
      state.statusMessage ||
      (state.currentPlayer === 'human' ? 'Your turn!' : 'CPU turn...'),
  };

  return {
    state: displayState,
    turnHighlight,
    canPass,
    drawDisabled,
    unoDisabled,
    unoPulse,
    showColorOverlay,
    showGameOver,
    gameOverTitle,
    gameOverMsg,
    playCard,
    humanDraw,
    humanCallUno,
    endHumanTurnWithoutPlay,
    completeWildPlay,
    newGame,
  };
}
