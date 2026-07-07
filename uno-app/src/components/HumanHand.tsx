import { isPlayable } from '../game/rules';
import type { Card as CardType, GameState } from '../types/game';
import type { CardMotion } from '../types/animation';
import { Card } from './Card';

interface HumanHandProps {
  state: GameState;
  disabled?: boolean;
  activeMotion?: CardMotion | null;
  onPlay: (index: number, sourceEl: HTMLElement) => void;
}

export function HumanHand({ state, disabled = false, activeMotion, onPlay }: HumanHandProps) {
  const isHumanTurn =
    !disabled &&
    state.currentPlayer === 'human' &&
    !state.gameOver &&
    !state.cpuThinking &&
    !state.wildPending;

  return (
    <div className="hand-row human-hand" data-hand="human">
      {state.hands.human.map((card: CardType, index: number) => {
        const isFlying =
          activeMotion?.type === 'play' &&
          activeMotion.player === 'human' &&
          activeMotion.handIndex === index &&
          activeMotion.fromRect != null;

        const canPlay = isHumanTurn && isPlayable(card, 'human', state, state.hands);
        return (
          <Card
            key={index}
            card={card}
            cardIndex={index}
            player="human"
            playable={canPlay}
            disabled={isHumanTurn && !canPlay}
            onClick={(e) => onPlay(index, e.currentTarget)}
            className={isFlying ? 'card--flying-source' : undefined}
          />
        );
      })}
    </div>
  );
}
