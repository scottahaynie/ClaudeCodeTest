import { useCallback, useEffect, useRef, useState } from 'react';
import { sounds } from '../audio/sounds';
import { localizeCpuMessage } from '../constants/themes';
import { useTheme } from '../context/ThemeProvider';
import {
  CPU_TURN_DELAY_MS,
  UNO_GRACE_MS,
  UNO_GRACE_SECONDS,
  unoGraceStatusMessage,
} from '../constants/timing';
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
import type { CardMotion } from '../types/animation';
import type { Color, GameState, Player, TurnHighlight } from '../types/game';
import {
  elementToRect,
  getDiscardPileRect,
  getDrawPileRect,
  getHandCardRect,
  getHandDrawTargetRect,
} from '../utils/domRects';

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
  isAnimating: boolean;
  activeMotion: CardMotion | null;
  completeMotion: () => void;
  playCard: (player: Player, cardIndex: number, chosenColor?: Color) => void;
  playHumanCard: (cardIndex: number, sourceEl?: HTMLElement) => void;
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
  const { cpuDisplayName } = useTheme();
  const [state, setState] = useState<GameState>(() => resetGameState());
  const [activeMotion, setActiveMotion] = useState<CardMotion | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unoGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unoGraceCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unoGraceSecondsRef = useRef(UNO_GRACE_SECONDS);
  const wasGameOverRef = useRef(false);
  const motionIdRef = useRef(0);
  const motionQueueRef = useRef<{ motion: CardMotion; resolve: () => void }[]>([]);
  const motionResolveRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef(false);

  /**
   * Queues a card motion and resolves when the animation finishes.
   */
  const playMotion = useCallback((motion: Omit<CardMotion, 'id'>): Promise<void> => {
    return new Promise((resolve) => {
      const full: CardMotion = { ...motion, id: ++motionIdRef.current };
      if (isAnimatingRef.current) {
        motionQueueRef.current.push({ motion: full, resolve });
        return;
      }
      isAnimatingRef.current = true;
      motionResolveRef.current = resolve;
      setActiveMotion(full);
    });
  }, []);

  /**
   * Advances the motion queue after the current animation completes.
   */
  const completeMotion = useCallback(() => {
    motionResolveRef.current?.();
    motionResolveRef.current = null;

    const next = motionQueueRef.current.shift();
    if (next) {
      motionResolveRef.current = next.resolve;
      setActiveMotion(next.motion);
      return;
    }

    isAnimatingRef.current = false;
    setActiveMotion(null);
  }, []);

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
    if (unoGraceCountdownRef.current) {
      clearInterval(unoGraceCountdownRef.current);
      unoGraceCountdownRef.current = null;
    }
  }, []);

  const runCpuTurn = useCallback(() => {
    cpuTimerRef.current = null;
    const current = stateRef.current;
    if (current.gameOver || current.currentPlayer !== 'cpu' || current.wildPending) return;

    const executeCpuMove = async () => {
      let next: GameState = { ...current, cpuThinking: false };

      if (next.pendingDraw > 0) {
        const n = next.pendingDraw;
        let deck = next.deck;
        let discard = next.discard;
        let hands = next.hands;
        for (let i = 0; i < n; i++) {
          const drawn = drawCards(deck, discard, hands, 'cpu', 1);
          deck = drawn.deck;
          discard = drawn.discard;
          hands = drawn.hands;
          const card = drawn.drawn[0];
          if (!card) break;
          await playMotion({
            type: 'draw',
            player: 'cpu',
            card,
            faceDown: true,
            handSize: hands.cpu.length - 1,
          });
        }
        sounds.draw(n);
        setState(
          advanceTurn(
            {
              ...next,
              deck,
              discard,
              hands,
              pendingDraw: 0,
              statusMessage: `CPU draws ${n} and loses turn.`,
            },
            1,
          ),
        );
        return;
      }

      const move = cpuChooseMove(next);
      if (move.action === 'draw') {
        const drawn = drawCards(next.deck, next.discard, next.hands, 'cpu', 1);
        const card = drawn.drawn[0];
        if (card) {
          await playMotion({
            type: 'draw',
            player: 'cpu',
            card,
            faceDown: true,
            handSize: next.hands.cpu.length,
          });
        }
        sounds.draw(1);
        setState(
          advanceTurn(
            {
              ...next,
              deck: drawn.deck,
              discard: drawn.discard,
              hands: drawn.hands,
              statusMessage: 'CPU draws a card.',
            },
            1,
          ),
        );
        return;
      }

      const card = move.card;
      await playMotion({
        type: 'play',
        player: 'cpu',
        card,
        faceDown: true,
      });

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
    };

    void executeCpuMove();
  }, [playMotion]);

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
    unoGraceSecondsRef.current = UNO_GRACE_SECONDS;
    setState((s) => ({
      ...s,
      unoGraceActive: true,
      statusMessage: unoGraceStatusMessage(unoGraceSecondsRef.current),
    }));
    unoGraceCountdownRef.current = setInterval(() => {
      unoGraceSecondsRef.current -= 1;
      if (unoGraceSecondsRef.current <= 0) return;
      setState((s) => ({
        ...s,
        statusMessage: unoGraceStatusMessage(unoGraceSecondsRef.current),
      }));
    }, 1000);
    unoGraceTimerRef.current = setTimeout(() => {
      clearUnoGraceTimer();
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

  /**
   * Plays a human card with a fly-to-discard animation.
   */
  const playHumanCard = useCallback(
    (cardIndex: number, sourceEl?: HTMLElement) => {
      const s = stateRef.current;
      if (s.gameOver || s.currentPlayer !== 'human' || s.wildPending || s.cpuThinking) return;
      const card = s.hands.human[cardIndex];
      if (!card || !isPlayable(card, 'human', s, s.hands)) return;

      if (isWildCard(card)) {
        setState({ ...s, wildPending: { player: 'human', cardIndex } });
        return;
      }

      const fromRect = sourceEl
        ? elementToRect(sourceEl)
        : getHandCardRect('human', cardIndex);
      const toRect = getDiscardPileRect();
      if (!fromRect || !toRect) {
        playCard('human', cardIndex);
        return;
      }

      void playMotion({
        type: 'play',
        player: 'human',
        card,
        handIndex: cardIndex,
        fromRect,
        toRect,
      }).then(() => playCard('human', cardIndex));
    },
    [playCard, playMotion],
  );

  const completeWildPlay = useCallback(
    (color: Color) => {
      const s = stateRef.current;
      if (!s.wildPending || s.wildPending.player !== 'human') return;
      const { cardIndex } = s.wildPending;
      const card = s.hands.human[cardIndex];
      if (!card) {
        setState({ ...s, wildPending: null });
        return;
      }

      const fromRect = getHandCardRect('human', cardIndex);
      const toRect = getDiscardPileRect();
      if (!fromRect || !toRect) {
        setState((prev) => {
          if (!prev.wildPending) return prev;
          const { player, cardIndex: idx } = prev.wildPending;
          const wildCard = prev.hands[player][idx];
          if (!wildCard) return { ...prev, wildPending: null };

          const removed = removeCardFromHand(prev.hands, player, idx);
          let next: GameState = {
            ...prev,
            wildPending: null,
            hands: removed.hands,
            discard: [...prev.discard, removed.card],
          };
          const resolved = resolveAfterPlay(next, player, removed.card, color);
          playCardSfx(prev, resolved, player);
          return resolved;
        });
        return;
      }

      void playMotion({
        type: 'play',
        player: 'human',
        card,
        handIndex: cardIndex,
        fromRect,
        toRect,
      }).then(() => {
        setState((prev) => {
          if (!prev.wildPending) return prev;
          const { player, cardIndex: idx } = prev.wildPending;
          const wildCard = prev.hands[player][idx];
          if (!wildCard) return { ...prev, wildPending: null };

          const removed = removeCardFromHand(prev.hands, player, idx);
          let next: GameState = {
            ...prev,
            wildPending: null,
            hands: removed.hands,
            discard: [...prev.discard, removed.card],
          };
          const resolved = resolveAfterPlay(next, player, removed.card, color);
          playCardSfx(prev, resolved, player);
          return resolved;
        });
      });
    },
    [playMotion],
  );

  const humanDraw = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || s.currentPlayer !== 'human' || s.wildPending || s.cpuThinking || s.humanDrewThisTurn) {
      return;
    }
    const drawn = drawCards(s.deck, s.discard, s.hands, 'human', 1);
    if (drawn.drawn.length === 0) {
      setState({ ...s, statusMessage: 'No cards left to draw!' });
      return;
    }
    const card = drawn.drawn[0];
    sounds.draw(1);

    const fromRect = getDrawPileRect();
    const toRect = getHandDrawTargetRect('human', s.hands.human.length);
    if (!fromRect || !toRect) {
      setState((prev) => {
        if (prev.gameOver || prev.currentPlayer !== 'human') return prev;
        const freshDraw = drawCards(prev.deck, prev.discard, prev.hands, 'human', 1);
        if (freshDraw.drawn.length === 0) return prev;
        const drawnCard = freshDraw.drawn[0];
        const next: GameState = {
          ...prev,
          deck: freshDraw.deck,
          discard: freshDraw.discard,
          hands: freshDraw.hands,
          humanDrewThisTurn: true,
        };
        if (isPlayable(drawnCard, 'human', next, next.hands)) {
          return { ...next, statusMessage: 'Drew a card — play it or end turn.' };
        }
        return advanceTurn(
          { ...next, statusMessage: 'Drew a card — no play. Turn over.' },
          1,
        );
      });
      return;
    }

    void playMotion({
      type: 'draw',
      player: 'human',
      card,
      faceDown: true,
      handSize: s.hands.human.length,
      fromRect,
      toRect,
    }).then(() => {
      setState((prev) => {
        if (prev.gameOver || prev.currentPlayer !== 'human') return prev;
        const freshDraw = drawCards(prev.deck, prev.discard, prev.hands, 'human', 1);
        if (freshDraw.drawn.length === 0) return prev;
        const drawnCard = freshDraw.drawn[0];
        const next: GameState = {
          ...prev,
          deck: freshDraw.deck,
          discard: freshDraw.discard,
          hands: freshDraw.hands,
          humanDrewThisTurn: true,
        };
        if (isPlayable(drawnCard, 'human', next, next.hands)) {
          return { ...next, statusMessage: 'Drew a card — play it or end turn.' };
        }
        return advanceTurn(
          { ...next, statusMessage: 'Drew a card — no play. Turn over.' },
          1,
        );
      });
    });
  }, [playMotion]);

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
    motionQueueRef.current = [];
    motionResolveRef.current = null;
    isAnimatingRef.current = false;
    setActiveMotion(null);
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
  const isAnimating = activeMotion != null;
  const canPass =
    humanTurn && !isAnimating && state.humanDrewThisTurn && state.hands.human.some((c) => isPlayable(c, 'human', state, state.hands));
  const drawDisabled = !humanTurn || isAnimating || state.humanDrewThisTurn || state.pendingDraw > 0;
  const unoDisabled = !(state.hands.human.length === 1 && state.needsUno.human);
  const unoPulse = state.hands.human.length === 1 && state.needsUno.human;
  const showColorOverlay = !!(state.wildPending && state.wildPending.player === 'human');
  const showGameOver = state.gameOver;
  const gameOverTitle =
    state.winner === 'human'
      ? 'YOU WIN!'
      : localizeCpuMessage('CPU WINS!', cpuDisplayName);
  const gameOverMsg =
    state.winner === 'human' ? 'Nice! You emptied your hand.' : 'Better luck next time!';

  const displayState: GameState = {
    ...state,
    statusMessage: localizeCpuMessage(
      state.statusMessage ||
        (state.currentPlayer === 'human' ? 'Your turn!' : 'CPU turn...'),
      cpuDisplayName,
    ),
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
    isAnimating,
    activeMotion,
    completeMotion,
    playCard,
    playHumanCard,
    humanDraw,
    humanCallUno,
    endHumanTurnWithoutPlay,
    completeWildPlay,
    newGame,
  };
}
