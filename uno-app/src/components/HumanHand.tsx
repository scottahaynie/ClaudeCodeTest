import { isPlayable } from '../game/rules';
import type { Card as CardType, GameState } from '../types/game';
import { Card } from './Card';

interface HumanHandProps {
  state: GameState;
  onPlay: (index: number) => void;
}

export function HumanHand({ state, onPlay }: HumanHandProps) {
  const isHumanTurn =
    state.currentPlayer === 'human' &&
    !state.gameOver &&
    !state.cpuThinking &&
    !state.wildPending;

  return (
    <div className="hand-row human-hand">
      {state.hands.human.map((card: CardType, index: number) => {
        const canPlay = isHumanTurn && isPlayable(card, 'human', state, state.hands);
        return (
          <Card
            key={index}
            card={card}
            playable={canPlay}
            disabled={isHumanTurn && !canPlay}
            onClick={() => onPlay(index)}
          />
        );
      })}
    </div>
  );
}
