import { ArrowPathIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { cardFaceClass, cardLabel } from '../game/rules';
import type { Card as CardType } from '../types/game';
import type { KeyboardEvent, MouseEvent } from 'react';

/** Renders the face symbol for a card — icons for action cards, text for others. */
function CardSymbol({ card }: { card: CardType }) {
  if (card.value === 'skip') return <NoSymbolIcon className="card-icon" aria-hidden="true" />;
  if (card.value === 'reverse') return <ArrowPathIcon className="card-icon" aria-hidden="true" />;
  return <>{cardLabel(card)}</>;
}

interface CardProps {
  card?: CardType;
  back?: boolean;
  playable?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => void;
  cardIndex?: number;
  player?: 'human' | 'cpu';
  pile?: 'draw' | 'discard';
  className?: string;
  ariaLabel?: string;
}

/** Renders a single UNO card face, back, or pile marker. */
export function Card({
  card,
  back = false,
  playable = false,
  disabled = false,
  onClick,
  cardIndex,
  player,
  pile,
  className,
  ariaLabel,
}: CardProps) {
  const classNames = ['card'];
  if (back) {
    classNames.push('back');
  } else if (card) {
    classNames.push(cardFaceClass(card));
  }
  if (playable) classNames.push('playable');
  if (disabled) classNames.push('disabled');
  if (className) classNames.push(className);

  return (
    <div
      className={classNames.join(' ')}
      data-card
      data-card-index={cardIndex}
      data-player={player}
      data-pile={pile}
      onClick={playable && !disabled ? onClick : undefined}
      role={playable ? 'button' : undefined}
      tabIndex={playable && !disabled ? 0 : undefined}
      aria-label={playable ? ariaLabel : undefined}
      aria-disabled={playable && disabled ? true : undefined}
      onKeyDown={
        playable && !disabled
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e);
              }
            }
          : undefined
      }
    >
      {!back && card && (
        <span className="symbol">
          <CardSymbol card={card} />
        </span>
      )}
    </div>
  );
}
