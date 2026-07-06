import { cardFaceClass, cardLabel } from '../game/rules';
import type { Card as CardType } from '../types/game';

interface CardProps {
  card?: CardType;
  back?: boolean;
  playable?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function Card({ card, back = false, playable = false, disabled = false, onClick }: CardProps) {
  const classNames = ['card'];
  if (back) {
    classNames.push('back');
  } else if (card) {
    classNames.push(cardFaceClass(card));
  }
  if (playable) classNames.push('playable');
  if (disabled) classNames.push('disabled');

  return (
    <div
      className={classNames.join(' ')}
      onClick={playable ? onClick : undefined}
      role={playable ? 'button' : undefined}
      tabIndex={playable ? 0 : undefined}
      onKeyDown={
        playable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {!back && card && <span className="symbol">{cardLabel(card)}</span>}
    </div>
  );
}
